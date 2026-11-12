// ============================================================
//  DEPTH FIRST FEAR · the web server
//  No packages needed, only Node.js 18+.
//  Run:  node server.js        then open  http://localhost:8780
//
//  Pages:  /          login            /lobby    lobby (Round 01 / Round 02)
//          /round1    the mansion      /admin    admin panel
//  Secrets (Supabase URL + secret key) are read from .env, which never goes to GitHub.
// ============================================================
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = __dirname;

// ---------- .env ----------
try { for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; } } catch {}
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, ""), SB_KEY = process.env.SUPABASE_SECRET_KEY || "";
const port = +process.argv[2] || +process.env.PORT || 8780;

// ---------- Supabase (REST, with the secret key) ----------
// every row of a GET, page by page (Supabase returns at most 1000 rows per request)
async function sbAll(p) { const out = []; for (let off = 0; ; off += 1000) { const page = await sb(`${p}${p.includes("?") ? "&" : "?"}limit=1000&offset=${off}`); out.push(...page); if (page.length < 1000) return out; } }
async function sb(p, { method = "GET", body, prefer } = {}) {
  const headers = { apikey: SB_KEY, "Content-Type": "application/json" };
  if (!SB_KEY.startsWith("sb_")) headers.Authorization = "Bearer " + SB_KEY;   // old-style service_role JWT
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) { const e = new Error((data && (data.message || data.error)) || r.statusText); e.status = r.status === 409 ? 409 : 500; e.db = true; throw e; }
  return data;
}
const rpc = (fn, args = {}) => sb("rpc/" + fn, { method: "POST", body: args });
const enc = encodeURIComponent;

// ---------- passwords (scrypt, built into Node) ----------
const hashPw = pw => { const salt = crypto.randomBytes(16).toString("hex"); return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 32).toString("hex")}`; };
const checkPw = (pw, stored) => { const [, salt, h] = String(stored).split("$"); if (!salt || !h) return false;
  const a = crypto.scryptSync(pw, salt, 32), b = Buffer.from(h, "hex"); return b.length === a.length && crypto.timingSafeEqual(a, b); };

// ---------- small helpers ----------
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const send = (res, code, obj, headers = {}) => { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers }); res.end(JSON.stringify(obj)); };
const redirect = (res, to) => { res.writeHead(302, { Location: to, "Cache-Control": "no-store" }); res.end(); };
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const cookie = (name, val, maxAge) => `${name}=${enc(val)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
const readBody = req => new Promise((ok, bad) => { let b = ""; req.on("data", d => { b += d; if (b.length > 2e5) req.destroy(); });
  req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch { bad(fail(400, "bad request")); } }); });
const fail = (status, msg) => Object.assign(new Error(msg), { status });
function serveFile(res, rel) {
  const p = path.join(root, rel);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": types[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": /\.(html|css|js)$/.test(rel) ? "no-store" : "public, max-age=3600" });
  fs.createReadStream(p).pipe(res);
}

// ---------- team sessions (one device per team) ----------
// cookie dff_team = "<team id>.<token>"; a new login writes a new token, so the old device is logged out
const teamCache = new Map();   // cookie -> { team, at }
async function teamFrom(req) {
  const c = cookies(req).dff_team; if (!c) return null;
  const hit = teamCache.get(c); if (hit && Date.now() - hit.at < 2500) return hit.team;
  const [id, token] = c.split("."); if (!/^\d+$/.test(id) || !token) return null;
  const rows = await sb(`teams?id=eq.${id}&select=id,name,active,session_token`);
  const t = rows[0], team = t && t.active && t.session_token === token ? { id: t.id, name: t.name } : null;
  teamCache.set(c, { team, at: Date.now() }); return team;
}
// ---------- admin sessions (kept in memory; restarting the server = log in again) ----------
const adminSessions = new Map();   // token -> { name, exp }
function adminFrom(req) { const s = adminSessions.get(cookies(req).dff_admin || ""); return s && s.exp > Date.now() ? s : null; }
// ---------- login rate limit ----------
const tries = new Map();
function slowDown(key) { const t = tries.get(key) || { n: 0, at: Date.now() }; if (Date.now() - t.at > 60000) { t.n = 0; t.at = Date.now(); } t.n++; tries.set(key, t); if (t.n > 10) throw fail(429, "Too many tries. Wait a minute."); }

// ---------- rounds (database clock, so every PC sees the same time) ----------
const ROUND2_READY = false;   // Round 2 shows "UNDER CONSTRUCTION" in the lobby until this is true
async function roundsNow() {
  const [rounds, now] = await Promise.all([sb("rounds?select=*&order=id"), rpc("server_now")]);
  const t = Date.parse(now);
  return { now, rounds: rounds.map(r => {
    const s = r.starts_at && Date.parse(r.starts_at), e = r.ends_at && Date.parse(r.ends_at);
    let status = r.locked ? "locked" : !s || !e ? "unset" : t < s ? "waiting" : t < e ? "open" : "ended";
    if (r.id === 2 && !ROUND2_READY) status = "construction";
    return { id: r.id, name: r.name, starts_at: r.starts_at, ends_at: r.ends_at, locked: r.locked, status, open: status === "open" }; }) };
}

// ---------- leaderboards ----------
// Round 1: highest x wins. Same x: the team that reached that x first is ranked higher.
// "Reached" = the last moment x changed: a card that changed x, or being caught by her (x - 3);
// if x never changed, the moment the team started. Times come from the database clock (to the microsecond).
async function boardsNow() {
  const [teams, runs] = await Promise.all([sb("teams?select=id,name,active"), sb("runs?voided=is.false&select=id,team_id,round_id,x,points,busts,started_at,finished_at,last_bust_at")]);
  const active = new Map(teams.filter(t => t.active).map(t => [t.id, t.name]));
  const r1 = runs.filter(r => r.round_id === 1 && active.has(r.team_id)), r2 = runs.filter(r => r.round_id === 2 && active.has(r.team_id));
  const plays = r1.length ? await sbAll(`plays?run_id=in.(${r1.map(r => r.id).join(",")})&action=eq.take&select=run_id,decided_at,x_before,x_after`) : [];
  const t = iso => iso ? Date.parse(iso) * 1000 + Number((String(iso).match(/\.\d{3}(\d{0,3})/) || [, ""])[1].padEnd(3, "0")) : 0;   // microseconds
  const reached = new Map(r1.map(r => { let at = r.started_at;
    for (const p of plays) if (p.run_id === r.id && p.x_after !== p.x_before && t(p.decided_at) > t(at)) at = p.decided_at;
    if (r.last_bust_at && t(r.last_bust_at) > t(at)) at = r.last_bust_at;
    return [r.id, at]; }));
  const ranked = (rows, score, when) => { rows.sort((a, b) => score(b) - score(a) || t(when(a)) - t(when(b)));
    return rows.map((row, i) => ({ row, rank: i && score(rows[i - 1]) === score(row) && t(when(rows[i - 1])) === t(when(row)) ? null : i + 1 }))
      .map((o, i, all) => { if (o.rank === null) o.rank = all[i - 1].rank; return o; }); };
  const round1 = ranked(r1.slice(), r => r.x, r => reached.get(r.id)).map(({ row, rank }) => ({ rank, team: active.get(row.team_id), x: row.x, reached_at: reached.get(row.id), finished: !!row.finished_at }));
  const round2 = ranked(r2.slice(), r => r.points, r => r.finished_at || r.started_at).map(({ row, rank }) => ({ rank, team: active.get(row.team_id), points: row.points, finished: !!row.finished_at }));
  // final: Round 1 x + Round 2 points; a tie goes to the team that reached its Round 1 x first (Round 2 rule to be added with Round 2)
  const byTeam = new Map(); for (const [id, name] of active) byTeam.set(id, { team: name, round1: 0, round2: 0, at: null });
  for (const r of r1) Object.assign(byTeam.get(r.team_id), { round1: r.x, at: reached.get(r.id) });
  for (const r of r2) byTeam.get(r.team_id).round2 = r.points;
  const fin = [...byTeam.values()].map(v => ({ ...v, total: v.round1 + v.round2 }));
  const final = ranked(fin, v => v.total, v => v.at || "9999-12-31T00:00:00Z").map(({ row, rank }) => ({ rank, team: row.team, round1: row.round1, round2: row.round2, total: row.total }));
  return { round1, round2, final };
}

// errors from the database functions -> short codes the pages understand
const dbErr = e => { const m = String(e.message || "");
  if (m.includes("round_closed")) return fail(409, "round_closed");
  if (m.includes("card_used")) return fail(409, "card_used");
  if (/not_your_card|not_opened|no_run/.test(m)) return fail(400, "bad_card");
  return e; };

// ============================================================
//  ROUTES
// ============================================================
async function handle(req, res) {
  const url = new URL(req.url, "http://x"), p = decodeURIComponent(url.pathname), M = req.method;

  // ----- pages -----
  if (M === "GET" && (p === "/" || p === "/login")) return (await teamFrom(req)) ? redirect(res, "/lobby") : serveFile(res, "web/login.html");
  if (M === "GET" && p === "/lobby") return (await teamFrom(req)) ? serveFile(res, "web/lobby.html") : redirect(res, "/");
  if (M === "GET" && p === "/round1") {
    if (!(await teamFrom(req))) return redirect(res, "/");
    return (await roundsNow()).rounds[0].open ? serveFile(res, "index.html") : redirect(res, "/lobby"); }
  if (M === "GET" && p === "/admin") return serveFile(res, "web/admin.html");
  if (M === "GET" && p === "/board") return adminFrom(req) ? serveFile(res, "web/board.html") : redirect(res, "/admin");   // leaderboard screen (admins only)
  // public files: only the assets folder and the shared web files (never cards, db, .env, server)
  if (M === "GET" && (p.startsWith("/assets/") || /^\/web\/[\w-]+\.(css|js|svg|png|jpg)$/.test(p))) return serveFile(res, p.slice(1));
  if (!p.startsWith("/api/")) { res.writeHead(404); return res.end("not found"); }

  // ----- team api -----
  if (M === "POST" && p === "/api/login") {
    const { name = "", password = "" } = await readBody(req); slowDown("t:" + req.socket.remoteAddress);
    const want = String(name).trim().toLowerCase(), rows = await sb(`teams?select=id,name,active,password_hash`);
    const t = rows.find(r => r.name.toLowerCase() === want);
    if (!t || !checkPw(String(password), t.password_hash)) throw fail(401, "Wrong team name or password.");
    if (!t.active) throw fail(403, "Your team is switched off. Please ask the organisers.");
    const token = crypto.randomUUID();
    await sb(`teams?id=eq.${t.id}`, { method: "PATCH", body: { session_token: token } });
    teamCache.clear();
    return send(res, 200, { ok: true, team: t.name }, { "Set-Cookie": cookie("dff_team", `${t.id}.${token}`, 60 * 60 * 12) });
  }
  if (M === "POST" && p === "/api/logout") {
    const t = await teamFrom(req); if (t) await sb(`teams?id=eq.${t.id}`, { method: "PATCH", body: { session_token: null } });
    teamCache.clear(); return send(res, 200, { ok: true }, { "Set-Cookie": cookie("dff_team", "", 0) });
  }
  if (p === "/api/state" || p.startsWith("/api/r1/")) {
    const team = await teamFrom(req); if (!team) throw fail(401, "logged_out");
    if (p === "/api/state") {
      const st = await roundsNow(), runs = await sb(`runs?team_id=eq.${team.id}&voided=is.false&select=round_id,x,finished_at`);
      const r1 = runs.find(r => r.round_id === 1);
      return send(res, 200, { team: team.name, ...st, r1: r1 ? { x: r1.x, finished: !!r1.finished_at } : null });
    }
    if (M !== "POST") throw fail(405, "use POST");
    const body = await readBody(req), id = v => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw fail(400, "bad_card"); return n; };
    try {
      if (p === "/api/r1/start") return send(res, 200, await rpc("r1_start", { p_team: team.id }));
      if (p === "/api/r1/open") return send(res, 200, await rpc("r1_open", { p_team: team.id, p_card: id(body.card) }));
      if (p === "/api/r1/decide") return send(res, 200, await rpc("r1_decide", { p_team: team.id, p_card: id(body.card), p_action: ["take", "drop"].includes(body.action) ? body.action : "timeout" }));
      if (p === "/api/r1/bust") return send(res, 200, await rpc("r1_bust", { p_team: team.id }));
      if (p === "/api/r1/finish") { await rpc("r1_finish", { p_team: team.id }); return send(res, 200, { ok: true }); }
    } catch (e) { throw dbErr(e); }
    throw fail(404, "not found");
  }

  // ----- admin api -----
  if (M === "POST" && p === "/api/admin/login") {
    const { name = "", password = "" } = await readBody(req); slowDown("a:" + req.socket.remoteAddress);
    const [a] = await sb(`admins?username=eq.${enc(String(name).trim())}&select=username,password_hash`);
    if (!a || !checkPw(String(password), a.password_hash)) throw fail(401, "Wrong admin name or password.");
    const token = crypto.randomBytes(24).toString("hex"); adminSessions.set(token, { name: a.username, exp: Date.now() + 12 * 3600e3 });
    return send(res, 200, { ok: true, name: a.username }, { "Set-Cookie": cookie("dff_admin", token, 12 * 3600) });
  }
  if (p.startsWith("/api/admin/")) {
    const admin = adminFrom(req); if (!admin) throw fail(401, "admin_logged_out");
    const body = M === "GET" ? {} : await readBody(req), seg = p.split("/").slice(3);   // e.g. ["teams","5","reset"]
    const num = v => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw fail(400, "bad id"); return n; };
    if (M === "POST" && seg[0] === "logout") { adminSessions.delete(cookies(req).dff_admin); return send(res, 200, { ok: true }, { "Set-Cookie": cookie("dff_admin", "", 0) }); }
    if (M === "GET" && seg[0] === "boards") {   // just the three leaderboards, for the big screen
      const [st, boards] = await Promise.all([roundsNow(), boardsNow()]);
      return send(res, 200, { ...st, boards });
    }
    if (M === "GET" && seg[0] === "overview") {
      const [st, teams, cards, runs, boards] = await Promise.all([roundsNow(),
        sb("teams?select=id,name,members,active,session_token,created_at&order=name"), sb("cards?select=*&order=id"),
        sb("runs?voided=is.false&select=id,team_id,round_id,x,points,busts,started_at,finished_at"),
        boardsNow()]);
      const plays = runs.length ? await sbAll(`plays?run_id=in.(${runs.map(r => r.id).join(",")})&select=run_id,action`) : [];
      for (const r of runs) { const mine = plays.filter(q => q.run_id === r.id); r.taken = mine.filter(q => q.action === "take").length; r.dropped = mine.filter(q => q.action && q.action !== "take").length; }
      return send(res, 200, { admin: admin.name, ...st, teams: teams.map(({ session_token, ...t }) => ({ ...t, online: !!session_token })), cards, runs, boards });
    }
    // teams
    if (seg[0] === "teams") {
      if (M === "POST" && seg.length === 1) {
        const name = String(body.name || "").trim(), pw = String(body.password || "");
        if (!name || pw.length < 4) throw fail(400, "A team name and a password (4+ characters) are needed.");
        try { await sb("teams", { method: "POST", body: { name, password_hash: hashPw(pw), members: body.members || null } }); }
        catch (e) { throw e.status === 409 ? fail(409, "That team name is taken.") : e; }
        return send(res, 200, { ok: true });
      }
      const tid = num(seg[1]);
      if (M === "PATCH" && seg.length === 2) {
        const patch = {}; if (body.name !== undefined) { patch.name = String(body.name).trim(); if (!patch.name) throw fail(400, "Name is empty."); }
        if (body.members !== undefined) patch.members = body.members || null;
        if (body.active !== undefined) { patch.active = !!body.active; if (!body.active) patch.session_token = null; }
        if (body.password) { if (String(body.password).length < 4) throw fail(400, "Password needs 4+ characters."); patch.password_hash = hashPw(String(body.password)); patch.session_token = null; }
        try { await sb(`teams?id=eq.${tid}`, { method: "PATCH", body: patch }); } catch (e) { throw e.status === 409 ? fail(409, "That team name is taken.") : e; }
        teamCache.clear(); return send(res, 200, { ok: true });
      }
      if (M === "DELETE" && seg.length === 2) { await sb(`teams?id=eq.${tid}`, { method: "DELETE" }); teamCache.clear(); return send(res, 200, { ok: true }); }
      if (M === "POST" && seg[2] === "kick") { await sb(`teams?id=eq.${tid}`, { method: "PATCH", body: { session_token: null } }); teamCache.clear(); return send(res, 200, { ok: true }); }
      if (M === "POST" && seg[2] === "reset") { const rid = body.round === 2 ? 2 : 1; await sb(`runs?team_id=eq.${tid}&round_id=eq.${rid}&voided=is.false`, { method: "PATCH", body: { voided: true } }); return send(res, 200, { ok: true }); }
    }
    // cards
    if (seg[0] === "cards") {
      const tryEffect = e => rpc("eval_effect", { e, x: 7 }).catch(() => { throw fail(400, "That effect does not work. Use x, numbers and + - * / % ( ) only, e.g.  x + 7  or  x * 2"); });
      const clean = b => { const c = {}; for (const k of ["level", "topic", "title", "code", "effect", "active"]) if (b[k] !== undefined) c[k] = typeof b[k] === "string" ? b[k].replace(/\r\n/g, "\n") : b[k];
        if (c.level !== undefined && !["easy", "medium", "hard"].includes(c.level)) throw fail(400, "Level must be easy, medium or hard.");
        if (c.effect !== undefined) { c.effect = String(c.effect).trim(); if (!/^[x0-9+\-*/%() ]+$/.test(c.effect)) throw fail(400, "Effect may only use x, numbers and + - * / % ( ), e.g.  x + 7  or  x * 2"); }
        return c; };
      if (M === "POST" && seg[1] === "test") return send(res, 200, { x: await rpc("eval_effect", { e: String(body.effect || "").trim(), x: Number(body.x) | 0 }).catch(() => { throw fail(400, "That effect does not work."); }) });
      if (M === "POST" && seg.length === 1) {
        const c = clean(body); for (const k of ["level", "topic", "title", "code", "effect"]) if (!c[k]) throw fail(400, `"${k}" is missing.`);
        await tryEffect(c.effect); await sb("cards", { method: "POST", body: c }); return send(res, 200, { ok: true });
      }
      const cid = num(seg[1]);
      if (M === "PATCH" && seg.length === 2) { const c = clean(body); if (c.effect) await tryEffect(c.effect); await sb(`cards?id=eq.${cid}`, { method: "PATCH", body: c }); return send(res, 200, { ok: true }); }
      if (M === "DELETE" && seg.length === 2) {   // a card a team already saw is only switched off, so the history stays correct
        const used = await sb(`plays?card_id=eq.${cid}&select=id&limit=1`);
        if (used.length) { await sb(`cards?id=eq.${cid}`, { method: "PATCH", body: { active: false } }); return send(res, 200, { ok: true, off: true }); }
        await sb(`cards?id=eq.${cid}`, { method: "DELETE" }); return send(res, 200, { ok: true });
      }
    }
    // rounds
    if (seg[0] === "rounds") {
      const rid = num(seg[1]); if (rid > 2) throw fail(400, "bad round");
      if (M === "PATCH" && seg.length === 2) {
        const patch = {}; for (const k of ["starts_at", "ends_at"]) if (body[k] !== undefined) { patch[k] = body[k] ? new Date(body[k]).toISOString() : null; }
        const [cur] = await sb(`rounds?id=eq.${rid}&select=starts_at,ends_at`), s = patch.starts_at !== undefined ? patch.starts_at : cur.starts_at, e = patch.ends_at !== undefined ? patch.ends_at : cur.ends_at;
        if (s && e && Date.parse(e) <= Date.parse(s)) throw fail(400, "End time must be after the start time.");
        if (body.locked !== undefined) patch.locked = !!body.locked;
        await sb(`rounds?id=eq.${rid}`, { method: "PATCH", body: patch }); return send(res, 200, { ok: true });
      }
      if (M === "POST" && seg[2] === "fresh") { await sb(`runs?round_id=eq.${rid}&voided=is.false`, { method: "PATCH", body: { voided: true } }); return send(res, 200, { ok: true }); }
    }
    throw fail(404, "not found");
  }
  throw fail(404, "not found");
}

module.exports = { hashPw, sb, sbAll, rpc, boardsNow };
if (require.main === module) {
  if (!SB_URL || !SB_KEY || SB_KEY.startsWith("PASTE")) { console.error("\n  The Supabase secret key is missing. Put it in the .env file (see README).\n"); process.exit(1); }
  http.createServer((req, res) => handle(req, res).catch(e => {
    if (!e.status || e.status >= 500) console.error(new Date().toISOString(), req.method, req.url, e.message);
    send(res, e.status && e.status < 500 ? e.status : 500, { error: e.status && e.status < 500 ? e.message : "Server problem. Try again." });
  })).listen(port, () => console.log(`Depth First Fear is running.\n  Teams:  http://localhost:${port}\n  Admin:  http://localhost:${port}/admin\n(Ctrl + C to stop)`));
}
