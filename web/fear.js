// Depth First Fear · shared effects for login + lobby
// background "camera feed", rain, lightning that reveals her, flashlight, DS trace gutters, the DFS sigil
(() => {
  const H = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  document.body.prepend(H(`
    <div class="feed" id="feed"><img class="dark" src="/assets/ui/login-dark.jpg" alt=""><img class="torch" src="/assets/ui/login-dark.jpg" alt=""><img class="lit" id="lit" src="/assets/ui/login-flash.jpg" alt=""></div>
    <div class="veil"></div><div class="fog"><i></i><i></i></div><canvas class="rain"></canvas><div class="scan"></div><div class="grain"></div><div class="flash" id="flash"></div>
    <i class="vf tl"></i><i class="vf tr"></i><i class="vf bl"></i><i class="vf br"></i>
    <div class="gutter l"><div id="gl"></div></div><div class="gutter r"><div id="gr"></div></div>`));

  // ---- data-structure trace streaming down both sides
  const ops = []; let seed = 7; const rnd = n => (seed = (seed * 9301 + 49297) % 233280) % n;
  const st = [];
  for (let i = 0; i < 90; i++) {
    const k = rnd(9);
    if (k < 3) { const v = rnd(90) + 1; st.push(v); ops.push(`push(<b>${v}</b>)`); }
    else if (k < 5 && st.length) ops.push(`pop() → <b>${st.pop()}</b>`);
    else if (k === 5) ops.push(`visit(<b>${rnd(12)}</b>)`);
    else if (k === 6) ops.push(`dfs(u=<b>${rnd(12)}</b>)`);
    else if (k === 7) ops.push(`q.front() = <b>${rnd(40)}</b>`);
    else ops.push(`x = x ${rnd(2) ? "+" : "−"} <b>${rnd(15) + 1}</b>`);
  }
  const fill = (id, list) => { const el = document.getElementById(id); el.innerHTML = list.concat(list).map(s => `<div>${s}</div>`).join(""); };
  fill("gl", ops); fill("gr", ops.slice().reverse());

  // ---- the sigil: a tree that keeps running depth-first search
  const N = [[100, 60], [68, 98], [132, 98], [50, 140], [86, 140], [114, 140], [150, 140]], E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  const ticks = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2, r1 = 95, r2 = i % 4 ? 91 : 87; return `<line x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + r2 * Math.cos(a)}" y2="${100 + r2 * Math.sin(a)}" stroke="rgba(255,42,53,.55)" stroke-width="1.2"/>`; }).join("");
  const svg = `<svg class="emblem" viewBox="0 0 200 200" aria-hidden="true">
    <defs><path id="cr" d="M100,100 m-79,0 a79,79 0 1,1 158,0 a79,79 0 1,1 -158,0"/></defs>
    <circle cx="100" cy="100" r="97" fill="rgba(10,3,5,.85)" stroke="rgba(255,42,53,.7)" stroke-width="1.5"/>
    <g class="ring">${ticks}<text font-family="JetBrains Mono" font-size="9.5" font-weight="700" letter-spacing="3.2" fill="rgba(233,223,207,.55)"><textPath href="#cr">DEPTH · FIRST · FEAR · DEPTH · FIRST · FEAR ·</textPath></text></g>
    <circle class="ring2" cx="100" cy="100" r="70" fill="none" stroke="rgba(255,42,53,.35)" stroke-width="1" stroke-dasharray="3 6"/>
    ${E.map(([a, b], i) => `<line class="e" data-e="${b}" x1="${N[a][0]}" y1="${N[a][1]}" x2="${N[b][0]}" y2="${N[b][1]}"/>`).join("")}
    ${N.map(([x, y], i) => `<circle class="n" data-n="${i}" cx="${x}" cy="${y}" r="${i ? 7.5 : 9}"/>`).join("")}
  </svg>`;
  for (const host of document.querySelectorAll("[data-emblem]")) {
    host.innerHTML = svg; const s = host.firstElementChild, order = [0, 1, 3, 4, 2, 5, 6]; let i = 0;
    const step = () => {
      if (i === order.length) { setTimeout(() => { s.querySelectorAll(".on,.cur").forEach(e => e.classList.remove("on", "cur")); i = 0; step(); }, 1400); return; }
      s.querySelectorAll(".cur").forEach(e => e.classList.remove("cur"));
      const n = order[i++]; s.querySelector(`[data-n="${n}"]`).classList.add("on", "cur"); s.querySelector(`[data-e="${n}"]`)?.classList.add("on");
      setTimeout(step, 520); };
    setTimeout(step, 1400);
  }

  // ---- lightning: reveals her in the doorway, glitches the feed
  const lit = document.getElementById("lit"), flash = document.getElementById("flash");
  window.strike = (big) => {
    const seq = big ? [[0, .95], [60, 0], [120, 1], [240, .4], [300, .9], [950, 0]] : [[0, .55], [80, 0], [150, .4], [500, 0]];
    for (const [ms, v] of seq) setTimeout(() => { lit.style.opacity = v; flash.style.opacity = v * .15; }, ms);
    if (big) for (const c of ["shake", "glitch"]) { document.body.classList.remove(c); void document.body.offsetWidth; document.body.classList.add(c); }
  };
  const storm = () => { strike(Math.random() < .55); setTimeout(storm, 6000 + Math.random() * 7000); };
  setTimeout(() => { strike(true); setTimeout(storm, 6500); }, 1700);

  // ---- flashlight follows the mouse (wanders by itself until you move)
  const feed = document.getElementById("feed"); let tx = innerWidth / 2, ty = innerHeight * .6, cx = tx, cy = ty, moved = false;
  addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; moved = true; });
  (function loop(t) {
    if (!moved) { tx = innerWidth * (.62 + .2 * Math.sin(t / 3100)); ty = innerHeight * (.6 + .08 * Math.sin(t / 2100)); }
    cx += (tx - cx) * .1; cy += (ty - cy) * .1;
    feed.style.setProperty("--mx", cx + "px"); feed.style.setProperty("--my", cy + "px"); feed.style.setProperty("--r", (Math.random() < .012 ? 110 : 170 + Math.sin(t / 90) * 3) + "px");
    feed.style.transform = `translate(${(cx / innerWidth - .5) * -12}px, ${(cy / innerHeight - .5) * -7}px)`;
    requestAnimationFrame(loop); })(0);

  // ---- rain
  const cv = document.querySelector("canvas.rain"), g = cv.getContext("2d"), drops = [];
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; }; size(); addEventListener("resize", size);
  for (let i = 0; i < 230; i++) drops.push({ x: Math.random(), y: Math.random(), v: .9 + Math.random() * .9, l: 12 + Math.random() * 22, a: .05 + Math.random() * .18 });
  (function rain() { g.clearRect(0, 0, cv.width, cv.height); g.lineWidth = 1;
    for (const d of drops) { d.y += d.v * .016; d.x -= .0025; if (d.y > 1.05) { d.y = -.05; d.x = Math.random() * 1.1; }
      const x = d.x * cv.width, y = d.y * cv.height; g.strokeStyle = `rgba(190,200,220,${d.a})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.l * .18, y + d.l); g.stroke(); }
    requestAnimationFrame(rain); })();

  // ---- camera timestamp
  const pad = n => String(n).padStart(2, "0");
  const tick = () => { const d = new Date(Date.now() + (window.clockSkew || 0)); for (const el of document.querySelectorAll("[data-time]")) el.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  tick(); setInterval(tick, 1000);

  // ---- boot lines in the top bar
  const boot = document.querySelector("[data-boot]");
  if (boot) { const lines = JSON.parse(boot.dataset.boot); let i = 0;
    const next = () => { if (i < lines.length - 1) { boot.textContent = lines[i++]; setTimeout(next, 260); } else { boot.textContent = lines[lines.length - 1]; boot.classList.add("ok"); } };
    next(); }
})();

window.api = async (url, body, method) => {
  const r = await fetch(url, { method: method || (body === undefined ? "GET" : "POST"), headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(data.error || "Network problem"), { status: r.status }); return data;
};
