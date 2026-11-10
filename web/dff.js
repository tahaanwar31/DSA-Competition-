// Depth First Fear · shared night scene + card helpers for login and lobby
// <body data-scene="login"> uses the courtyard; data-scene="statue" uses the statue shot.
(() => {
  const S = { login: ["login-dark.jpg", "login-flash.jpg", "62% 60%"], statue: ["intro-dark.jpg", "intro-flash.jpg", "70% 50%"] }[document.body.dataset.scene || "login"];
  const t = document.createElement("template");
  t.innerHTML = `<div class="night" id="night"><img class="dark" src="/assets/ui/${S[0]}" alt=""><img class="torch" src="/assets/ui/${S[0]}" alt=""><img class="lit" id="lit" src="/assets/ui/${S[1]}" alt=""></div>
    <div class="shade"></div><div class="fog"><i></i><i></i></div><canvas class="rain"></canvas><div class="grain"></div><div class="flash" id="flash"></div><div class="black"></div>`;
  document.body.prepend(t.content);
  document.querySelectorAll(".night img").forEach(i => i.style.objectPosition = S[2]);

  // lightning: the lit photo shows her for a moment
  const lit = document.getElementById("lit"), flash = document.getElementById("flash");
  window.strike = big => {
    const seq = big ? [[0, .95], [60, 0], [120, 1], [240, .4], [300, .9], [950, 0]] : [[0, .55], [80, 0], [150, .4], [500, 0]];
    for (const [ms, v] of seq) setTimeout(() => { lit.style.opacity = v; flash.style.opacity = v * .15; }, ms);
    if (big) { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake"); }
  };
  const storm = () => { strike(Math.random() < .55); setTimeout(storm, 6500 + Math.random() * 7000); };
  setTimeout(() => { strike(true); setTimeout(storm, 7000); }, 2200);

  // flashlight + card tilt follow the mouse
  const night = document.getElementById("night"); let tx = innerWidth * .6, ty = innerHeight * .6, cx = tx, cy = ty, moved = false;
  addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; moved = true; });
  (function loop(time) {
    if (!moved) { tx = innerWidth * (.6 + .2 * Math.sin(time / 3100)); ty = innerHeight * (.6 + .08 * Math.sin(time / 2100)); }
    cx += (tx - cx) * .1; cy += (ty - cy) * .1;
    night.style.setProperty("--mx", cx + "px"); night.style.setProperty("--my", cy + "px"); night.style.setProperty("--r", (Math.random() < .012 ? 120 : 180 + Math.sin(time / 90) * 3) + "px");
    night.style.transform = `translate(${(cx / innerWidth - .5) * -12}px, ${(cy / innerHeight - .5) * -7}px)`;
    for (const el of document.querySelectorAll(".tilt")) { const r = el.getBoundingClientRect(), dx = (cx - (r.left + r.width / 2)) / innerWidth, dy = (cy - (r.top + r.height / 2)) / innerHeight;
      el.style.setProperty("--ry", (dx * 10).toFixed(2) + "deg"); el.style.setProperty("--rx", (-dy * 8).toFixed(2) + "deg"); }
    requestAnimationFrame(loop); })(0);

  // rain
  const cv = document.querySelector("canvas.rain"), g = cv.getContext("2d"), drops = [];
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; }; size(); addEventListener("resize", size);
  for (let i = 0; i < 220; i++) drops.push({ x: Math.random(), y: Math.random(), v: .9 + Math.random() * .9, l: 12 + Math.random() * 22, a: .05 + Math.random() * .18 });
  (function rain() { g.clearRect(0, 0, cv.width, cv.height); g.lineWidth = 1;
    for (const d of drops) { d.y += d.v * .016; d.x -= .0025; if (d.y > 1.05) { d.y = -.05; d.x = Math.random() * 1.1; }
      const x = d.x * cv.width, y = d.y * cv.height; g.strokeStyle = `rgba(190,200,220,${d.a})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.l * .18, y + d.l); g.stroke(); }
    requestAnimationFrame(rain); })();
})();

// a card face catches fire from one corner, chars and falls away (the same burn as in the game)
window.burnCard = (src, done) => {
  const r = src.getBoundingClientRect(); if (!r.width) return done && done();
  const wrap = document.createElement("div"); wrap.className = "burn"; Object.assign(wrap.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  const card = src.cloneNode(true); card.querySelectorAll("[id]").forEach(e => e.removeAttribute("id")); card.removeAttribute("id");
  const W = 220, H = Math.max(60, Math.round(W * r.height / r.width)), mk = c => { const e = document.createElement("canvas"); e.width = W; e.height = H; if (c) e.className = c; return e; };
  const mc = mk(), glow = mk("glow"), char = mk("char"), mx = mc.getContext("2d"), gx = glow.getContext("2d"), cx = char.getContext("2d");
  wrap.append(card, char, glow); document.body.append(wrap); src.style.visibility = "hidden";
  const ox = Math.random() < .5 ? 0 : W, oy = H, G = 7, gr = Array.from({ length: (G + 1) * (G + 1) }, Math.random), N = new Float32Array(W * H), md = Math.hypot(W, H);
  const vn = (u, v) => { const x = u * G, y = v * G, i = Math.min(G - 1, x | 0), j = Math.min(G - 1, y | 0), fx = x - i, fy = y - j, a = gr[j * (G + 1) + i], b = gr[j * (G + 1) + i + 1], c = gr[(j + 1) * (G + 1) + i], d = gr[(j + 1) * (G + 1) + i + 1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) N[y * W + x] = .72 * Math.hypot(x - ox, y - oy) / md + .3 * vn(x / W, y / H) + .1 * vn(x * 3.7 / W % 1, y * 3.7 / H % 1);
  const mi = mx.createImageData(W, H), gi = gx.createImageData(W, H), ci = cx.createImageData(W, H), T0 = performance.now(), DUR = 1500;
  const step = now => { const k = (now - T0) / DUR, t = -.08 + k * 1.35;
    for (let p = 0, q = 0; p < W * H; p++, q += 4) { const v = N[p] - t;
      mi.data[q + 3] = v < 0 ? 0 : 255; mi.data[q] = mi.data[q + 1] = mi.data[q + 2] = 255;
      const e = v >= 0 && v < .05 ? 1 - v / .05 : 0; gi.data[q] = 255; gi.data[q + 1] = 70 + 150 * e * e; gi.data[q + 2] = 20 * e * e; gi.data[q + 3] = e * 255;
      const ch = v >= 0 && v < .13 ? 1 - v / .13 : 0; ci.data[q] = 22; ci.data[q + 1] = 10; ci.data[q + 2] = 4; ci.data[q + 3] = ch * 235; }
    mx.putImageData(mi, 0, 0); gx.putImageData(gi, 0, 0); cx.putImageData(ci, 0, 0);
    const url = `url(${mc.toDataURL()})`; card.style.webkitMaskImage = card.style.maskImage = url; char.style.webkitMaskImage = char.style.maskImage = url; char.style.webkitMaskSize = char.style.maskSize = "100% 100%";
    const fall = Math.max(0, k - .45); wrap.style.transform = `translateY(${fall * fall * 520}px) rotate(${(ox ? 1 : -1) * fall * 14}deg)`; wrap.style.opacity = String(Math.min(1, (1.05 - k) * 4));
    if (k < 1) requestAnimationFrame(step); else { wrap.remove(); done && done(); } };
  requestAnimationFrame(step);
};

// fit a block to the screen height (scales it down on short screens)
window.fitTo = (el) => { const f = () => { el.style.transform = "none"; el.style.marginBlock = ""; const avail = el.parentElement.clientHeight, h = el.offsetHeight, k = Math.min(1, avail / h);
  if (k < 1) { el.style.transform = `scale(${k})`; el.style.marginBlock = `${-(1 - k) * h / 2}px`; } };
  addEventListener("resize", f); document.fonts.ready.then(f); f(); };

window.api = async (url, body, method) => {
  const r = await fetch(url, { method: method || (body === undefined ? "GET" : "POST"), headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(data.error || "No answer from the server. Check the connection and try again."), { status: r.status }); return data;
};
