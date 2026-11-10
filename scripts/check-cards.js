// Checks every card in db/cards-data.js: compiles its code with g++, runs it for
// many values of x, and makes sure the card's "effect" gives exactly the same x.
// Run:  node scripts/check-cards.js        (needs g++ on the PATH)
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const cards = require("../db/cards-data.js");
const XS = [-17, -7, -1, 0, 1, 3, 10, 25, 64, 101];

// integer maths like C++ / Postgres: / and % truncate toward zero
function effect(e, x) {
  if (!/^[x0-9+\-*/%() ]+$/.test(e)) throw new Error("bad effect " + e);
  const toks = e.replace(/x/g, ` ${x} `).match(/\d+|[-+*/%()]/g); let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  const atom = () => { const t = next(); if (t === "(") { const v = sum(); next(); return v; } if (t === "-") return -atom(); if (t === "+") return atom(); return Number(t); };
  const prod = () => { let v = atom(); while (["*", "/", "%"].includes(peek())) { const o = next(), r = atom(); v = o === "*" ? v * r : o === "/" ? Math.trunc(v / r) : v % r; } return v; };
  const sum = () => { let v = prod(); while (["+", "-"].includes(peek())) { const o = next(), r = prod(); v = o === "+" ? v + r : v - r; } return v; };
  return sum();
}
// top-level functions (and anything before them) must live outside main()
function split(code) {
  const lines = code.split("\n"); let lastEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(?!for|while|if|return)[A-Za-z_][\w:<>,*& ]*[\s*&]\w+\s*\([^;]*\)\s*\{/.test(lines[i]) || /^struct\s+\w+\s*\{/.test(lines[i])) {
      let depth = 0, j = i;
      for (; j < lines.length; j++) { for (const ch of lines[j]) { if (ch === "{") depth++; if (ch === "}") depth--; } if (depth === 0) break; }
      if (/^struct/.test(lines[i]) && lastEnd < 0 && !lines.slice(j + 1).some(l => /^(?!for|while|if|return)[A-Za-z_][\w:<>,*& ]*[\s*&]\w+\s*\([^;]*\)\s*\{/.test(l))) continue;
      lastEnd = j; i = j;
    }
  }
  return [lines.slice(0, lastEnd + 1).join("\n"), lines.slice(lastEnd + 1).join("\n")];
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dff-cards-")); let bad = 0;
const count = { easy: 0, medium: 0, hard: 0 };
cards.forEach((c, n) => {
  count[c.level]++;
  const [glob, body] = split(c.code), src = path.join(dir, `c${n}.cpp`), exe = path.join(dir, `c${n}.exe`);
  fs.writeFileSync(src, `#include <bits/stdc++.h>\nusing namespace std;\n${glob}\nint main(int argc, char** argv) {\nint x = atoi(argv[1]);\n${body}\ncout << x;\n}\n`);
  try { execFileSync("g++", ["-std=gnu++17", "-O0", "-o", exe, src], { stdio: "pipe" }); }
  catch (e) { bad++; console.log(`✗ #${n + 1} ${c.title}: does not compile\n${String(e.stderr).split("\n").slice(0, 6).join("\n")}`); return; }
  const wrong = [];
  for (const x of XS) { const got = Number(execFileSync(exe, [String(x)], { timeout: 3000 }).toString()), want = effect(c.effect, x); if (got !== want) wrong.push(`x=${x}: code gives ${got}, effect says ${want}`); }
  if (wrong.length) { bad++; console.log(`✗ #${n + 1} [${c.level}] ${c.title}  (effect "${c.effect}")\n   ${wrong.slice(0, 3).join("\n   ")}`); }
  else console.log(`✓ #${n + 1} [${c.level}] ${c.title}  →  ${c.effect}`);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${cards.length} cards · easy ${count.easy} · medium ${count.medium} · hard ${count.hard} · ${bad ? bad + " PROBLEM(S)" : "all correct"}`);
process.exit(bad ? 1 : 0);
