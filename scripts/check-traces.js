// A stricter check than check-cards.js: for every card, the value of x right after EVERY change of x
// (not only the final answer) must be identical in C++, Java and Python, for several starting values of x.
// It also checks that the three versions have the same shape: the same number of lines, the same number
// of places that change x, and nothing that only one language has (negative indexes, // ...).
//
// Run:  node scripts/check-traces.js        (about 3 minutes; needs g++, javac/java and python)
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const cards = require("../db/cards-data.js");
const XS = [0, 7, -5];

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

// definitions (struct, class, functions) go outside main, the rest is the snippet
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
// print x after every line that changes it
const tap = (code, lang) => code.split("\n").flatMap(l => /^\s*x = x\b/.test(l)
  ? [l, l.match(/^\s*/)[0] + (lang === "cpp" ? 'cout << x << " ";' : lang === "java" ? 'System.out.print(x + " ");' : 'print(x, end=" ")')] : [l]).join("\n");

// every card starts with x = 0. The checkers take that line off before they run the card with many starting values of x.
const INIT_LINE = { cpp: /^\s*int x = 0;\n/, java: /^\s*int x = 0;\n/, py: /^x = 0$/m };
const hasInit = (lang, code) => INIT_LINE[lang].test(lang === "py" ? code : code);
const noInit = (lang, code) => code.replace(INIT_LINE[lang], lang === "py" ? "" : "");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dff-trace-"));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "pipe", timeout: 60000 }).toString();
const parse = out => out.trim().split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [t, f] = l.split("|"); return { trace: t.trim() ? t.trim().split(/\s+/).map(Number) : [], final: Number(f) }; });

function traces(lang, c, n) {
  const base = path.join(dir, `${lang}${n}`); fs.mkdirSync(base);
  if (lang === "cpp") {
    const [glob, body0] = split(c.cpp), body = noInit("cpp", body0), src = path.join(base, "c.cpp"), exe = path.join(base, "c.exe");
    fs.writeFileSync(src, `#include <bits/stdc++.h>\nusing namespace std;\n${glob}\nint main(int argc, char** argv) {\nint x = atoi(argv[1]);\n${tap(body, "cpp")}\ncout << "|" << x << endl;\n}\n`);
    run(GPP, ["-std=gnu++17", "-O0", "-Wall", "-Werror=uninitialized", "-Wno-unused-variable", "-Wno-unused-but-set-variable", "-Wno-sign-compare", "-o", exe, src]);
    return XS.flatMap(x => parse(run(exe, [String(x)])));
  }
  if (lang === "java") {
    const [glob, body0] = split(c.java), body = noInit("java", body0);
    fs.writeFileSync(path.join(base, "Main.java"), `import java.util.*;\npublic class Main {\n${glob}\nvoid run(int x0) {\nint x = x0;\n${tap(body, "java")}\nSystem.out.println("|" + x);\n}\npublic static void main(String[] a) { for (String s : a) new Main().run(Integer.parseInt(s)); }\n}\n`);
    run(JAVAC, ["-encoding", "UTF-8", "-d", base, path.join(base, "Main.java")]);
    return parse(run(JAVA, ["-cp", base, "Main", ...XS.map(String)]));
  }
  const src = path.join(base, "card.py"), driver = path.join(base, "run.py");
  fs.writeFileSync(src, tap(noInit("py", c.py), "py"));
  fs.writeFileSync(driver, `import sys\nsrc = open(sys.argv[1], encoding="utf-8").read()\nfor a in sys.argv[2:]:\n    g = {"x": int(a), "__name__": "card"}\n    exec(compile(src, "card", "exec"), g)\n    print("|" + str(g["x"]))\n`);
  return parse(run(PY, ["-I", driver, src, ...XS.map(String)]));
}

let bad = 0;
cards.forEach((c, n) => {
  const problems = [];
  for (const l of ["cpp", "java", "py"]) { const part = l === "cpp" ? split(c.cpp)[1] : l === "java" ? split(c.java)[1] : c.py; if (!hasInit(l, part)) problems.push(`the ${l === "cpp" ? "C++" : l === "java" ? "Java" : "Python"} snippet does not start with x = 0`); }
  // same shape in the three languages
  const body = { cpp: split(c.cpp)[1], java: split(c.java)[1], py: c.py.includes("def ") || c.py.includes("class ") ? null : c.py };
  const lines = t => t.split("\n").filter(l => l.trim() !== "}" && l.trim() !== "").length;
  const pyBody = (() => { const L = c.py.split("\n"); let last = -1; L.forEach((l, i) => { if (/^(def|class) /.test(l)) last = i; }); let j = last + 1; while (last >= 0 && j < L.length && /^\s/.test(L[j])) j++; return L.slice(last >= 0 ? j : 0).join("\n"); })();
  const nl = [lines(body.cpp), lines(body.java), lines(pyBody)];
  if (new Set(nl).size !== 1) problems.push(`different number of lines: C++ ${nl[0]}, Java ${nl[1]}, Python ${nl[2]}`);
  const nx = [body.cpp, body.java, pyBody].map(t => t.split("\n").filter(l => /^\s*x = x\b/.test(l)).length);
  if (new Set(nx).size !== 1) problems.push(`different number of x changes: ${nx.join(" / ")}`);
  if (/[\w\]]\[-\d/.test(c.py)) problems.push("negative index in Python");
  if (/\*\*|\bdivmod\b|\bfor\b.*\bin\b.*\[/.test(c.py.replace(/for \w+ in range\(\d+\)/g, ""))) problems.push("Python-only construct");
  // x after every change, for several x
  try {
    const t = { cpp: traces("cpp", c, n), java: traces("java", c, n), py: traces("py", c, n) };
    for (let i = 0; i < XS.length; i++) {
      const a = JSON.stringify(t.cpp[i]), b = JSON.stringify(t.java[i]), p = JSON.stringify(t.py[i]);
      if (a !== b || a !== p) problems.push(`x = ${XS[i]}: C++ ${a} / Java ${b} / Python ${p}`);
    }
  } catch (e) { problems.push("could not run: " + String(e.stderr || e.message).slice(0, 300).replace(/\n/g, " ")); }
  if (problems.length) { bad++; console.log(`✗ #${n + 1} [${c.level}] ${c.title}\n   ${problems.join("\n   ")}`); } else console.log(`✓ #${n + 1} [${c.level}] ${c.title}`);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${cards.length} cards: ${bad ? bad + " have problems" : "x is the same after every change in C++, Java and Python for all of them"}`);
process.exit(bad ? 1 : 0);
