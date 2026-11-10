// Depth First Fear · shared night scene + card helpers for login and lobby
// The scene is a movie-poster storm: a painted sky (moon, clouds, lightning) behind the
// mansion cut out of the game itself (house-dark / house-lit, sky removed).
(() => {
  const t = document.createElement("template");
  t.innerHTML = `<div class="night" id="night"><canvas class="sky" id="sky"></canvas><canvas class="bolt" id="bolt"></canvas>
      <img class="dark" src="/assets/ui/house-dark.webp" alt=""><img class="torch" src="/assets/ui/house-dark.webp" alt=""><img class="lit" id="lit" src="/assets/ui/house-lit.webp" alt=""></div>
    <div class="shade"></div><div class="fog"><i></i><i></i></div><canvas class="rain"></canvas><div class="grain"></div><div class="flash" id="flash"></div><div class="black"></div>`;
  document.body.prepend(t.content);

  // ---- the sky: painted at half resolution, redrawn ~30 times a second
  const sky = document.getElementById("sky"), sx = sky.getContext("2d"), bolt = document.getElementById("bolt"), bx = bolt.getContext("2d");
  const noise = (w, h, oct, seed) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"), id = x.createImageData(w, h);
    let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const grids = Array.from({ length: oct }, (_, o) => { const n = 4 << o; return { n, v: Array.from({ length: (n + 1) * (n + 1) }, R) }; });
    const S = q => q * q * (3 - 2 * q);
    const smp = (gr, u, v) => { const n = gr.n, X = u * n, Y = v * n, i = Math.floor(X) % n, j = Math.floor(Y), fx = X - Math.floor(X), fy = Y - j, ii = (i + 1) % n, g = gr.v;
      const a = g[j * (n + 1) + i], b = g[j * (n + 1) + ii], c2 = g[(j + 1) * (n + 1) + i], d = g[(j + 1) * (n + 1) + ii]; return (a + (b - a) * S(fx)) * (1 - S(fy)) + (c2 + (d - c2) * S(fx)) * S(fy); };
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { let v = 0, amp = .5; for (const gr of grids) { v += smp(gr, xx / w, y / h * .999) * amp; amp *= .5; }
      const fade = Math.sin(Math.PI * y / h);   // soft top and bottom edge
      const k = Math.max(0, Math.min(1, (v - .42) * 3.2)) * fade, q = (y * w + xx) * 4; id.data[q] = id.data[q + 1] = id.data[q + 2] = 255; id.data[q + 3] = k * 255; }
    x.putImageData(id, 0, 0); return c; };
  const C1 = noise(512, 200, 5, 7), C2 = noise(512, 200, 5, 91);
  let W = 0, H = 0, flashK = 0, last = 0;
  const size = () => { W = sky.width = Math.ceil(innerWidth / 2); H = sky.height = Math.ceil(innerHeight / 2); bolt.width = innerWidth; bolt.height = innerHeight; };
  size(); addEventListener("resize", size);
  (function paint(time) { requestAnimationFrame(paint); if (time - last < 33) return; last = time;
    const f = flashK;
    let g = sx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${5 + f * 60},${7 + f * 70},${13 + f * 95})`); g.addColorStop(.65, `rgb(${16 + f * 80},${20 + f * 90},${32 + f * 110})`); g.addColorStop(1, `rgb(${46 + f * 60},${14 + f * 60},${20 + f * 60})`);
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    // blood-red glow on the horizon behind the house
    g = sx.createRadialGradient(W * .7, H * 1.05, 0, W * .7, H * 1.05, H * .9); g.addColorStop(0, "rgba(160,16,24,.6)"); g.addColorStop(1, "rgba(160,16,24,0)"); sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    // the moon and its halo
    const mx = W * .3, my = H * .3, mr = H * .19;
    g = sx.createRadialGradient(mx, my, mr * .8, mx, my, mr * 3.4); g.addColorStop(0, "rgba(220,228,240,.34)"); g.addColorStop(.35, "rgba(160,175,200,.1)"); g.addColorStop(1, "rgba(160,175,200,0)"); sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    g = sx.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr); g.addColorStop(0, "#fbf6ea"); g.addColorStop(.7, "#e3dccd"); g.addColorStop(1, "#b9b1a2"); sx.fillStyle = g; sx.beginPath(); sx.arc(mx, my, mr, 0, 7); sx.fill();
    sx.save(); sx.beginPath(); sx.arc(mx, my, mr, 0, 7); sx.clip(); sx.globalAlpha = .1; sx.filter = "blur(3px)"; sx.fillStyle = "#8d8576";
    for (const [a, b, r] of [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12], [.35, -.35, .09], [-.45, .25, .1], [.05, -.05, .07]]) { sx.beginPath(); sx.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); sx.fill(); }
    sx.restore();
    // two cloud layers drifting across; the near one passes in front of the moon
    const o1 = (time * .006) % W, o2 = (time * .014) % W;
    sx.save(); sx.globalAlpha = .55; sx.filter = "brightness(.2) blur(2px)"; for (const ox of [-o1, W - o1]) sx.drawImage(C1, ox, H * .0, W, H * .55); sx.restore();
    sx.save(); sx.globalAlpha = .85; sx.filter = `brightness(${.08 + f * .6}) blur(1px)`; for (const ox of [-o2, W - o2]) sx.drawImage(C2, ox, H * .14, W, H * .48); sx.restore();
    // moonlight catching the edges of the near clouds
    sx.save(); sx.globalCompositeOperation = "lighter"; sx.globalAlpha = .1; sx.filter = "blur(3px)"; for (const ox of [-o2, W - o2]) sx.drawImage(C2, ox + 3, H * .14 - 3, W, H * .48); sx.restore();
  })(0);

  // ---- lightning: a branching bolt behind the house, the sky flashes, the house is lit
  const lit = document.getElementById("lit"), flash = document.getElementById("flash");
  const drawBolt = () => { const w = bolt.width, h = bolt.height; bx.clearRect(0, 0, w, h);
    const branch = (x, y, len, ang, width, depth) => { let px = x, py = y; bx.lineWidth = width; bx.beginPath(); bx.moveTo(px, py);
      const steps = 12 + Math.random() * 8 | 0;
      for (let i = 0; i < steps; i++) { ang += (Math.random() - .5) * .9; px += Math.sin(ang) * len / steps; py += Math.cos(ang) * len / steps; bx.lineTo(px, py);
        if (depth < 3 && Math.random() < .14) { bx.stroke(); branch(px, py, len * (.3 + Math.random() * .3), ang + (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .6), width * .55, depth + 1); bx.lineWidth = width; bx.beginPath(); bx.moveTo(px, py); } }
      bx.stroke(); };
    bx.strokeStyle = "rgba(235,240,255,.95)"; bx.shadowColor = "rgba(170,190,255,1)"; bx.shadowBlur = 26; bx.lineCap = "round";
    branch(w * (.45 + Math.random() * .45), -10, h * (.55 + Math.random() * .2), (Math.random() - .5) * .5, 3.2, 0); };
  window.strike = big => {
    const seq = big ? [[0, .95], [60, 0], [120, 1], [240, .45], [300, .9], [950, 0]] : [[0, .6], [80, 0], [150, .45], [520, 0]];
    if (big || Math.random() < .5) drawBolt(); else bx.clearRect(0, 0, bolt.width, bolt.height);
    for (const [ms, v] of seq) setTimeout(() => { lit.style.opacity = v; flash.style.opacity = v * .12; flashK = v; bolt.style.opacity = v > .3 ? 1 : 0; }, ms);
    if (big) { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake", "lit"); setTimeout(() => document.body.classList.remove("lit"), 900); }
  };
  const storm = () => { strike(Math.random() < .55); setTimeout(storm, 6000 + Math.random() * 7000); };
  setTimeout(() => { strike(true); setTimeout(storm, 6500); }, 2200);

  // ---- flashlight on the house + card tilt follow the mouse; the house moves more than the sky
  const night = document.getElementById("night"), house = night.querySelectorAll("img");
  let tx = innerWidth * .6, ty = innerHeight * .7, cx = tx, cy = ty, moved = false;
  addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; moved = true; });
  (function loop(time) {
    if (!moved) { tx = innerWidth * (.62 + .2 * Math.sin(time / 3100)); ty = innerHeight * (.7 + .08 * Math.sin(time / 2100)); }
    cx += (tx - cx) * .1; cy += (ty - cy) * .1;
    night.style.setProperty("--mx", cx + "px"); night.style.setProperty("--my", cy + "px"); night.style.setProperty("--r", (Math.random() < .012 ? 120 : 190 + Math.sin(time / 90) * 3) + "px");
    const px = cx / innerWidth - .5, py = cy / innerHeight - .5;
    sky.style.transform = `translate(${px * -6}px, ${py * -4}px)`; for (const i of house) i.style.translate = `${px * -18}px ${py * -8}px`;
    for (const el of document.querySelectorAll(".tilt")) { const r = el.getBoundingClientRect(), dx = (cx - (r.left + r.width / 2)) / innerWidth, dy = (cy - (r.top + r.height / 2)) / innerHeight;
      el.style.setProperty("--ry", (dx * 10).toFixed(2) + "deg"); el.style.setProperty("--rx", (-dy * 8).toFixed(2) + "deg"); }
    requestAnimationFrame(loop); })(0);

  // rain
  const cv = document.querySelector("canvas.rain"), g = cv.getContext("2d"), drops = [];
  const rsize = () => { cv.width = innerWidth; cv.height = innerHeight; }; rsize(); addEventListener("resize", rsize);
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
// it re-measures whenever the block or the space around it changes size (e.g. when the lobby card fills in)
window.fitTo = (el) => {
  const f = () => { const avail = el.parentElement.clientHeight, h = el.offsetHeight, k = Math.min(1, (avail - 4) / h);
    el.style.transformOrigin = "center center"; el.style.transform = k < 1 ? `scale(${k})` : "none"; el.style.marginBlock = k < 1 ? `${-(1 - k) * h / 2}px` : ""; };
  const ro = new ResizeObserver(() => requestAnimationFrame(f)); ro.observe(el); ro.observe(el.parentElement);
  addEventListener("resize", f); document.fonts.ready.then(f); f(); };

window.api = async (url, body, method) => {
  const r = await fetch(url, { method: method || (body === undefined ? "GET" : "POST"), headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(data.error || "No answer from the server. Check the connection and try again."), { status: r.status }); return data;
};
