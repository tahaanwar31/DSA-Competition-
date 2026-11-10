// Checks every card in db/cards-data.js, in all three languages:
//   * C++    compiled with g++, run for many values of x
//   * Java   compiled with javac, run for the same values
//   * Python run with python, for the same values
// Each one must give exactly what the card's "effect" says, for every x.
// It also checks the style rules: one statement per line, no vector,
// no lambdas or ?:, no tabs, lines short enough for the card.
//
// Run:  node scripts/check-cards.js
// Needs g++, javac/java and python. Set JAVA_HOME if java is not on the PATH
// (the JetBrains runtime that comes with PyCharm / IntelliJ works).
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const cards = require("../db/cards-data.js");
const XS = [-17, -7, -1, 0, 1, 3, 10, 25, 64, 101];
const MAX_COL = 66;   // longest line that still fits the card at full size

const find = (names, extra = []) => {
  for (const dir of [...extra, ...(process.env.PATH || "").split(path.delimiter)])
    for (const n of names) { const p = path.join(dir, n); if (fs.existsSync(p)) return p; }
  return null;
};
const JAVA_DIRS = [process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, "bin"),
  ...["C:/Program Files/JetBrains"].filter(fs.existsSync).flatMap(d => fs.readdirSync(d).map(n => path.join(d, n, "jbr", "bin")))].filter(Boolean);
const GPP = find(["g++.exe", "g++"], ["C:/msys64/ucrt64/bin"]);
const JAVAC = find(["javac.exe", "javac"], JAVA_DIRS), JAVA = JAVAC && path.join(path.dirname(JAVAC), path.basename(JAVAC).replace("javac", "java"));
const PY = find(["python.exe", "python3", "python"], ["C:/msys64/ucrt64/bin"]);
for (const [n, p] of [["g++", GPP], ["javac", JAVAC], ["python", PY]]) if (!p) { console.log(`Cannot find ${n}.`); process.exit(2); }

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

// C++ / Java: struct, class and function definitions (and anything above them)
// go outside main; the lines after the last definition are the main lines.
const DEF = /^(?:(?:struct|class)\s+\w+\s*\{|(?!(?:for|while|if|else|do|switch|return)\b)[A-Za-z_][\w<>\[\]]*\*?\s+\*?\w+\s*\([^;]*\)\s*\{)\s*$/;
function split(code) {
  const lines = code.split("\n"); let lastEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!DEF.test(lines[i])) continue;
    let depth = 0, j = i;
    for (; j < lines.length; j++) { for (const ch of lines[j]) { if (ch === "{") depth++; if (ch === "}") depth--; } if (depth === 0) break; }
    lastEnd = j; i = j;
  }
  return [lines.slice(0, lastEnd + 1).join("\n"), lines.slice(lastEnd + 1).join("\n")];
}

// style rules
function lint(lang, code) {
  const bad = [], lines = code.split("\n");
  lines.forEach((l, i) => {
    const at = `line ${i + 1}`, bare = l.replace(/"[^"]*"|'[^']*'/g, '""').replace(/(\/\/|#).*$/, "");
    if (/\t/.test(l)) bad.push(`${at}: tab`);
    if (l.length > MAX_COL) bad.push(`${at}: ${l.length} chars (max ${MAX_COL})`);
    if (/\s$/.test(l)) bad.push(`${at}: trailing space`);
    if ((l.match(/^ */)[0].length) % 4) bad.push(`${at}: indent is not a multiple of 4`);
    if (/\bvector\b|\bauto\b|\[&\]|->\s*\{|\blambda\b|=>/.test(bare)) bad.push(`${at}: vector / auto / lambda`);
    if (/\?/.test(bare)) bad.push(`${at}: ?:`);
    if (lang !== "py") {
      const semis = (bare.replace(/^\s*for\s*\(.*\)/, "").match(/;/g) || []).length;
      if (semis > 1) bad.push(`${at}: more than one statement`);
      if (/^\s*(if|for|while)\b.*\)\s*[^{\s].*;/.test(bare)) bad.push(`${at}: statement on the same line as if/for/while`);
      if (/\{\s*\S.*;/.test(bare.replace(/new \w+\{[^}]*\}/g, "N")) &&!/=\s*\{/.test(bare) && !/^\s*(struct|class)\b/.test(bare)) bad.push(`${at}: statement after {`);
    } else {
      if (/;/.test(bare)) bad.push(`${at}: ; in Python`);
      if (/^\s*(if|for|while|elif|else|def)\b.*:\s*\S/.test(bare)) bad.push(`${at}: statement on the same line as the colon`);
    }
  });
  return bad;
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dff-cards-"));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "pipe", timeout: 30000, ...opts }).toString();
let bad = 0; const count = { easy: 0, medium: 0, hard: 0 }, sizes = { easy: [], medium: [], hard: [] };

function tryRun(lang, c, n) {
  const base = path.join(dir, `${lang}${n}`); fs.mkdirSync(base);
  if (lang === "cpp") {
    const [glob, body] = split(c.cpp), src = path.join(base, "c.cpp"), exe = path.join(base, "c.exe");
    fs.writeFileSync(src, `#include <bits/stdc++.h>\nusing namespace std;\n${glob}\nint main(int argc, char** argv) {\nint x = atoi(argv[1]);\n${body}\ncout << x;\n}\n`);
    run(GPP, ["-std=gnu++17", "-O0", "-Wall", "-Wno-unused-variable", "-Wno-unused-but-set-variable", "-Wno-sign-compare", "-o", exe, src]);
    return XS.map(x => Number(run(exe, [String(x)])));
  }
  if (lang === "java") {
    const [glob, body] = split(c.java);
    fs.writeFileSync(path.join(base, "Main.java"), `import java.util.*;\npublic class Main {\n${glob}\nvoid run(int x0) {\nint x = x0;\n${body}\nSystem.out.println(x);\n}\npublic static void main(String[] a) { for (String s : a) new Main().run(Integer.parseInt(s)); }\n}\n`);
    run(JAVAC, ["-encoding", "UTF-8", "-d", base, path.join(base, "Main.java")]);
    return run(JAVA, ["-cp", base, "Main", ...XS.map(String)]).trim().split(/\s+/).map(Number);
  }
  const src = path.join(base, "card.py");
  fs.writeFileSync(src, c.py);
  const driver = path.join(base, "run.py");
  fs.writeFileSync(driver, `import sys\nfrom collections import deque\nsrc = open(sys.argv[1], encoding="utf-8").read()\nfor a in sys.argv[2:]:\n    g = {"x": int(a), "deque": deque, "__name__": "card"}\n    exec(compile(src, "card", "exec"), g)\n    print(g["x"])\n`);
  return run(PY, ["-I", driver, src, ...XS.map(String)]).trim().split(/\s+/).map(Number);
}

cards.forEach((c, n) => {
  count[c.level]++;
  const problems = [];
  for (const lang of ["cpp", "java", "py"]) {
    if (!c[lang]) { problems.push(`${lang}: missing`); continue; }
    for (const p of lint(lang, c[lang])) problems.push(`${lang} ${p}`);
    let got;
    try { got = tryRun(lang, c, n); }
    catch (e) { problems.push(`${lang}: does not run\n      ${String(e.stderr || e.message).split("\n").slice(0, 5).join("\n      ")}`); continue; }
    XS.forEach((x, i) => { const want = effect(c.effect, x); if (got[i] !== want) problems.push(`${lang}: x=${x} gives ${got[i]}, effect says ${want}`); });
  }
  const lines = Math.max(...["cpp", "java", "py"].map(l => (c[l] || "").split("\n").length));
  sizes[c.level].push(lines);
  if (problems.length) { bad++; console.log(`✗ #${n + 1} [${c.level}] ${c.title}  (effect "${c.effect}")\n   ${problems.slice(0, 8).join("\n   ")}`); }
  else console.log(`✓ #${n + 1} [${c.level}] ${c.title}  →  ${c.effect}   (${lines} lines)`);
});
fs.rmSync(dir, { recursive: true, force: true });
const avg = a => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) : 0;
console.log(`\nLongest snippet per level (lines): easy ${Math.max(...sizes.easy)} · medium ${Math.max(...sizes.medium)} · hard ${Math.max(...sizes.hard)}`);
console.log(`Average: easy ${avg(sizes.easy)} · medium ${avg(sizes.medium)} · hard ${avg(sizes.hard)}`);
console.log(`${cards.length} cards · easy ${count.easy} · medium ${count.medium} · hard ${count.hard} · ${bad ? bad + " PROBLEM(S)" : "all correct in C++, Java and Python"}`);
process.exit(bad ? 1 : 0);
