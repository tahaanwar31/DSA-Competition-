-- ============================================================
--  DEPTH FIRST FEAR · GAME LOGIC IN THE DATABASE
--  Run in Supabase → SQL Editor after schema.sql. Safe to run again.
--  Every score change happens here, inside one transaction, so a
--  double click or two PCs can never change x twice.
-- ============================================================

-- the API key our server uses (service_role) needs access, because new
-- tables are NOT exposed automatically in this project
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
-- and the public keys get nothing
revoke all on all tables in schema public from anon, authenticated;

alter table runs add column if not exists last_bust_at timestamptz;

-- seconds a team has to decide on a card
create or replace function card_seconds(l card_level) returns int
language sql immutable as $$
  select case l when 'easy' then 60 when 'medium' then 120 else 240 end
$$;

-- what a card's effect does to x. The effect text can only hold x, digits,
-- + - * / % ( ) and spaces (checked by the cards table), so this is safe.
-- Integer maths like C++: 7 / 2 = 3, -7 / 2 = -3.
create or replace function eval_effect(e text, x int) returns int
language plpgsql as $$
declare r int;
begin
  if e !~ '^[x0-9+\-*/%() ]+$' then raise exception 'bad effect'; end if;
  execute 'select (' || replace(e, 'x', '(' || x || ')') || ')::int' into r;
  return r;
end $$;

-- is a round open right now? (server clock, never the PC clock)
create or replace function round_open(rid smallint) returns boolean
language sql stable as $$
  select coalesce((select not locked and starts_at is not null and ends_at is not null
                          and now() >= starts_at and now() < ends_at
                   from rounds where id = rid), false)
$$;

-- a card whose time ran out (plus 5 s grace) counts as dropped
create or replace function r1_expire(p_run bigint) returns void
language sql as $$
  update plays p set action = 'timeout', decided_at = now(), x_before = r.x, x_after = r.x
  from cards c, runs r
  where p.run_id = p_run and r.id = p_run and c.id = p.card_id and p.action is null
    and now() > p.opened_at + make_interval(secs => card_seconds(c.level) + 5)
$$;

-- enter Round 1: make (or load) the team's run and hand out the deck
-- (card ids + levels only, never the code)
create or replace function r1_start(p_team bigint) returns json
language plpgsql as $$
declare r runs; rd rounds;
begin
  if not round_open(1::smallint) then raise exception 'round_closed'; end if;
  select * into rd from rounds where id = 1;
  select * into r from runs where team_id = p_team and round_id = 1 and not voided;
  if not found then
    insert into runs (team_id, round_id, deck)
    values (p_team, 1, (select coalesce(array_agg(id order by random()), '{}') from cards where active))
    returning * into r;
  end if;
  perform r1_expire(r.id);
  return json_build_object(
    'x', r.x, 'busts', r.busts, 'finished', r.finished_at is not null,
    'ends_at', rd.ends_at, 'now', now(),
    'taken',   (select count(*) from plays where run_id = r.id and action = 'take'),
    'dropped', (select count(*) from plays where run_id = r.id and action in ('drop', 'timeout')),
    'deck', (select coalesce(json_agg(json_build_object('id', c.id, 'lvl', c.level)), '[]')
             from cards c where c.id = any(r.deck)
               and not exists (select 1 from plays p where p.run_id = r.id and p.card_id = c.id and p.action is not null)));
end $$;

-- open a card: start its timer and send its code
create or replace function r1_open(p_team bigint, p_card bigint) returns json
language plpgsql as $$
declare r runs; c cards; p plays;
begin
  if not round_open(1::smallint) then raise exception 'round_closed'; end if;
  select * into r from runs where team_id = p_team and round_id = 1 and not voided;
  if not found or not (p_card = any(r.deck)) then raise exception 'not_your_card'; end if;
  perform r1_expire(r.id);
  insert into plays (run_id, card_id) values (r.id, p_card) on conflict (run_id, card_id) do nothing;
  select * into p from plays where run_id = r.id and card_id = p_card;
  if p.action is not null then raise exception 'card_used'; end if;
  select * into c from cards where id = p_card;
  return json_build_object('id', c.id, 'lvl', c.level, 'cat', c.topic, 't', c.title, 'code', c.code,
    'secs', greatest(0, card_seconds(c.level) - extract(epoch from now() - p.opened_at)));
end $$;

-- take / drop / timeout. The server decides the new x.
create or replace function r1_decide(p_team bigint, p_card bigint, p_action text) returns json
language plpgsql as $$
declare r runs; c cards; p plays; act play_action; nx int;
begin
  if not round_open(1::smallint) then raise exception 'round_closed'; end if;
  select * into r from runs where team_id = p_team and round_id = 1 and not voided for update;
  if not found then raise exception 'no_run'; end if;
  select * into p from plays where run_id = r.id and card_id = p_card for update;
  if not found then raise exception 'not_opened'; end if;
  if p.action is not null then
    return json_build_object('x', r.x, 'x_before', p.x_before, 'action', p.action, 'repeat', true);
  end if;
  select * into c from cards where id = p_card;
  act := case p_action when 'take' then 'take' when 'drop' then 'drop' else 'timeout' end;
  if act = 'take' and now() > p.opened_at + make_interval(secs => card_seconds(c.level) + 5) then act := 'timeout'; end if;
  nx := case when act = 'take' then eval_effect(c.effect, r.x) else r.x end;
  update plays set action = act, decided_at = now(), x_before = r.x, x_after = nx where id = p.id;
  update runs set x = nx where id = r.id;
  return json_build_object('x', nx, 'x_before', r.x, 'action', act);
end $$;

-- the ghost caught them: −3 (at most one bust every 2 seconds).
-- A card that was open at that moment is dropped.
create or replace function r1_bust(p_team bigint) returns json
language plpgsql as $$
declare r runs;
begin
  if not round_open(1::smallint) then raise exception 'round_closed'; end if;
  select * into r from runs where team_id = p_team and round_id = 1 and not voided for update;
  if not found then raise exception 'no_run'; end if;
  if r.last_bust_at is null or now() > r.last_bust_at + interval '2 seconds' then
    update plays set action = 'drop', decided_at = now(), x_before = r.x, x_after = r.x
      where run_id = r.id and action is null;
    update runs set x = x - 3, busts = busts + 1, last_bust_at = now() where id = r.id returning * into r;
  end if;
  return json_build_object('x', r.x, 'busts', r.busts);
end $$;

-- every card is gone: the team is finished
create or replace function r1_finish(p_team bigint) returns void
language sql as $$
  update runs set finished_at = coalesce(finished_at, now())
  where team_id = p_team and round_id = 1 and not voided
    and not exists (select 1 from unnest(deck) d
                    where not exists (select 1 from plays p where p.run_id = runs.id and p.card_id = d and p.action is not null))
$$;

-- only our server may call these
do $$ declare f text; begin
  foreach f in array array['card_seconds(card_level)', 'eval_effect(text,int)', 'round_open(smallint)', 'r1_expire(bigint)',
    'r1_start(bigint)', 'r1_open(bigint,bigint)', 'r1_decide(bigint,bigint,text)', 'r1_bust(bigint)', 'r1_finish(bigint)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- the database clock: every PC uses this time, never its own
create or replace function server_now() returns timestamptz language sql stable as $$ select now() $$;
revoke all on function server_now() from public, anon, authenticated;
grant execute on function server_now() to service_role;
