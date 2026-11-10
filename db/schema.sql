-- ============================================================
--  DEPTH FIRST FEAR · DATABASE (Supabase / Postgres)
--  Run once in Supabase → SQL Editor. Safe to read; it holds no secrets.
--
--  All tables have Row Level Security ON and NO policies, so the public
--  API cannot read or write anything. Only our own server (with the
--  secret service key, kept in .env) can touch the data.
-- ============================================================

-- ---------- teams: one row per team ----------
create table if not exists teams (
  id            bigint generated always as identity primary key,
  name          text not null unique,
  password_hash text not null,                 -- never the plain password
  members       text,                          -- names of the members (optional)
  active        boolean not null default true, -- false = can't log in, hidden from boards
  session_token uuid,                          -- one device: a new login replaces it
  created_at    timestamptz not null default now()
);

-- ---------- admins: you and your co-heads (for /admin) ----------
create table if not exists admins (
  id            bigint generated always as identity primary key,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- cards ----------
do $$ begin
  create type card_level as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

create table if not exists cards (
  id         bigint generated always as identity primary key,
  level      card_level not null,
  topic      text not null,      -- e.g. "♠ STACK"
  title      text not null,
  code       text not null,      -- the snippet shown on the card
  effect     text not null,      -- what TAKING it does to x, e.g. "x + 7", "x * 2", "0"
  active     boolean not null default true,   -- false = removed from play, history kept
  created_at timestamptz not null default now(),
  constraint effect_is_simple check (effect ~ '^[x0-9+\-*/%() ]+$')
);

-- ---------- rounds: times + lock ----------
create table if not exists rounds (
  id        smallint primary key check (id in (1, 2)),
  name      text not null,
  starts_at timestamptz,          -- lobby opens the round at this time (server clock)
  ends_at   timestamptz,          -- and closes it here
  locked    boolean not null default true  -- admin switch: true = everyone back to the lobby
);
insert into rounds (id, name) values (1, 'The Mansion'), (2, 'The Forest')
  on conflict (id) do nothing;

-- ---------- runs: one per team per round ----------
create table if not exists runs (
  id          bigint generated always as identity primary key,
  team_id     bigint not null references teams(id) on delete cascade,
  round_id    smallint not null references rounds(id),
  x           integer not null default 0,   -- Round 1 score
  points      integer not null default 0,   -- Round 2 score
  busts       integer not null default 0,   -- ghost busts (Round 1)
  timeouts    integer not null default 0,   -- card timer ran out (Round 1)
  wrong       integer not null default 0,   -- wrong answers (Round 2)
  deck        bigint[] not null default '{}',  -- card ids dealt to this team
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  voided      boolean not null default false  -- "start fresh" voids the old run (kept for history)
);
-- only ONE live run per team per round
create unique index if not exists one_live_run on runs (team_id, round_id) where not voided;

-- ---------- plays: every card a team opened ----------
do $$ begin
  create type play_action as enum ('take', 'drop', 'timeout');
exception when duplicate_object then null; end $$;

create table if not exists plays (
  id         bigint generated always as identity primary key,
  run_id     bigint not null references runs(id) on delete cascade,
  card_id    bigint not null references cards(id),
  opened_at  timestamptz not null default now(),
  action     play_action,          -- empty while the card is still open
  decided_at timestamptz,
  x_before   integer,
  x_after    integer,
  unique (run_id, card_id)         -- a card can be used only once per run
);

-- make sure RLS is on everywhere (even if the project setting changes)
alter table teams  enable row level security;
alter table admins enable row level security;
alter table cards  enable row level security;
alter table rounds enable row level security;
alter table runs   enable row level security;
alter table plays  enable row level security;

-- ============================================================
--  THE THREE LEADERBOARDS (live views)
-- ============================================================
create or replace view leaderboard_round1 with (security_invoker = true) as
select rank() over (order by r.x desc, r.busts asc) as rank,
       t.name as team, r.x, r.busts, r.timeouts, r.finished_at is not null as finished
from runs r join teams t on t.id = r.team_id
where r.round_id = 1 and not r.voided and t.active;

create or replace view leaderboard_round2 with (security_invoker = true) as
select rank() over (order by r.points desc, r.wrong asc) as rank,
       t.name as team, r.points, r.wrong, r.finished_at is not null as finished
from runs r join teams t on t.id = r.team_id
where r.round_id = 2 and not r.voided and t.active;

create or replace view leaderboard_final with (security_invoker = true) as
select rank() over (order by coalesce(r1.x, 0) + coalesce(r2.points, 0) desc,
                             coalesce(r1.busts, 0) + coalesce(r2.wrong, 0) asc) as rank,
       t.name as team,
       coalesce(r1.x, 0)      as round1,
       coalesce(r2.points, 0) as round2,
       coalesce(r1.x, 0) + coalesce(r2.points, 0) as total,
       coalesce(r1.busts, 0) + coalesce(r2.wrong, 0) as mistakes
from teams t
left join runs r1 on r1.team_id = t.id and r1.round_id = 1 and not r1.voided
left join runs r2 on r2.team_id = t.id and r2.round_id = 2 and not r2.voided
where t.active;
