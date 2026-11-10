// the storm behind login and lobby: rain + lightning that reveals the lit photo
(() => {
  const box = document.querySelector(".storm"); if (!box) return;
  const b1 = box.querySelector(".b1"), cv = box.querySelector("canvas"), g = cv.getContext("2d"), drops = [];
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; }; size(); addEventListener("resize", size);
  for (let i = 0; i < 220; i++) drops.push({ x: Math.random(), y: Math.random(), v: .9 + Math.random() * .9, l: 12 + Math.random() * 22, a: .06 + Math.random() * .2 });
  const rain = () => { g.clearRect(0, 0, cv.width, cv.height); g.lineWidth = 1;
    for (const d of drops) { d.y += d.v * .016; d.x -= .0025; if (d.y > 1.05) { d.y = -.05; d.x = Math.random() * 1.1; }
      const x = d.x * cv.width, y = d.y * cv.height; g.strokeStyle = `rgba(190,200,220,${d.a})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.l * .18, y + d.l); g.stroke(); }
    requestAnimationFrame(rain); };
  requestAnimationFrame(rain);
  const strike = () => { for (const [ms, v] of [[1, .8], [70, 0], [130, .9], [260, .3], [320, .7], [700, 0]]) setTimeout(() => b1.style.opacity = v, ms); setTimeout(strike, 6000 + Math.random() * 8000); };
  setTimeout(strike, 1200);
})();
// tiny helpers shared by the pages
window.api = async (url, body, method) => {
  const r = await fetch(url, { method: method || (body === undefined ? "GET" : "POST"), headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(data.error || "Network problem"), { status: r.status }); return data;
};
window.toast = (msg) => { let t = document.querySelector(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.append(t); }
  t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200); };
