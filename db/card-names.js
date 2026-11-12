// Gives every card clear variable names, the same in C++, Java and Python.
// The card patterns were written with short names (s, q, p, t, u, v ...). This step
// renames them by what they ARE in that card (a stack, a queue, a node, a counter ...),
// read from the C++ declarations, and it also swaps Python's deque for a plain list.
// Runs when the deck is loaded (db/cards-data.js), so the checker and the seed
// both see the final cards.

// names that stay as they are: loop counters, standard DSA words, struct fields
const KEEP = new Set(["i", "j", "k", "x", "head", "tail", "root", "prev", "next", "val", "key", "left", "right",
  "adj", "dist", "seen", "order", "total", "slow", "fast", "cur", "second", "cell", "half", "at", "color", "laps",
  "keys", "need", "job", "rest", "run", "inbox", "outbox", "path", "done", "visited"]);

// per card: special meanings that a type alone cannot tell
const BY_TITLE = {
  "Two stacks, one queue": { a: "first", b: "second", c: "third", d: "fourth", e: "fifth" },
  "Queue made of stacks": { a: "first", b: "second", c: "third", d: "fourth", e: "fifth" },
  "Top two": { t: "top" },
  "Round robin": { t: "time", r: "remain", j: "task" },
  "Time slices": { t: "time", r: "remain", j: "task" },
  "Served first": { a: "first" }, "How tall is the pile": { n: "size" }, "Still waiting": { n: "size" },
  "Reverse, then read": { k: "number" }, "Odd bits": { k: "number" }, "Base three": { k: "number" },
  "Two calls": { g: "steps" }, "Wipe out": { f: "product" }, "Add down from three": { f: "addDown" }, "Add down from four": { f: "addDown" },
  "Doubling": { f: "doubled" }, "Steps of three": { f: "steps" }, "Pell steps": { g: "pell" }, "Three times back": { g: "steps" }, "Three before": { t: "trib" },
  "Split the ring": { s: "total" }, "Halve the ring": { s: "total" },
  // a node squeezed in between two others
  "Squeeze in": { a: "front", b: "mid", c: "back" }, "Middle man": { a: "front", b: "mid", c: "back" },
  // sliding window maximum: the numbers, and the indexes that can still be the best
  "Window of three": { a: "nums", dq: "best" }, "Sliding maximum": { a: "nums", dq: "best" }, "Window of two": { a: "nums", dq: "best" },
};

// by what the name is declared as in the C++ version
function byType(name, type, card, ctx) {
  const graph = /\badj\b/.test(card.cpp), maze = /\bstring g\[/.test(card.cpp);
  if (type === "Node*") return { a: "first", b: "second", c: "third", d: "gone", p: "cur", n: "node", t: ctx.has("tail") ? "last" : "tail", nxt: "after" }[name];
  if (type === "Tree*") return { t: "node", a: "first", b: "second", lca: "ancestor" }[name];
  if (type === "stack") return { s: "pile", a: "pileA", b: "pileB", mn: "mins", st: "pile" }[name];
  if (type === "queue") return { q: graph || maze ? "toVisit" : "line", a: "lineA", b: "lineB", out: "merged" }[name];
  if (type === "deque") return { dq: "window" }[name];
  if (type === "intarr") return { a: "values", out: "visited", buf: "buffer", vals: "values", d: "dist", dr: "stepRow", dc: "stepCol" }[name];
  if (type === "nodearr") return { n: "nodes" }[name];
  if (type === "char") return { c: "ch" }[name];
  if (type === "string") return { s: "word", r: "backwards", e: "expr", g: "grid" }[name];
  if (type === "param") return card.cpp.includes("int power(") ? { b: "base", e: "exp" }[name] : { u: "room" }[name];   // only power(b, e) is renamed; other parameters keep their names
  if (type === "func") return { ds: "digitSum", dsum: "digitSum" }[name];
  // plain ints and int arrays
  const m = {
    u: "room", v: graph ? "to" : "value", r: maze ? "row" : "rightH", c: maze ? "col" : "count", d: maze ? "dist" : undefined,
    l: "leftH", s: "number", a: card.cpp.includes("reach(") ? "sizeA" : "left", b: card.cpp.includes("reach(") ? "sizeB" : "right", t: "temp", e: "exp",
    dr: "stepRow", dc: "stepCol", nr: "newRow", nc: "newCol", out: "visited", ans: "answer", pos: "position",
    buf: "buffer", lo: "low", hi: "high", vals: "values", dq: "window",
  }[name];
  // "pos", not "count": a global named count clashes with std::count in C++
  if (name === "n" && /\bint n = 0;/.test(card.cpp)) return "pos";
  return m;
}

// split code into tokens, keeping strings and comments untouched
function tokens(code, lang) {
  const re = lang === "py" ? /(#[^\n]*|"[^"\n]*"|'[^'\n]*')|([A-Za-z_]\w*)|([\s\S])/g : /(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*')|([A-Za-z_]\w*)|([\s\S])/g;
  return [...code.matchAll(re)].map(m => ({ t: m[0], id: !!m[2] }));
}
function declared(card) {
  const out = new Map(), code = card.cpp.replace(/"[^"]*"|'[^']*'/g, '""');
  for (const [, t, n, call] of code.matchAll(/\b(stack<\w+>|queue<\w+>|deque<\w+>|Node\*|Tree\*|int|bool|char|string|void)\s+(\w+)\b(\s*\()?/g)) {
    const type = call ? "func" : t.replace(/<\w+>/, "");
    if (!out.has(n)) out.set(n, type);
  }
  for (const [, t, n] of code.matchAll(/\b(int|Node\*)\s+(\w+)\s*\[/g)) out.set(n, t === "int" ? "intarr" : "nodearr");
  // function parameters: int f(int a, int b)
  for (const [, params] of code.matchAll(/\w+\s*\(((?:\s*(?:int|Tree\*|Node\*)\s+\w+\s*,?)+)\)\s*\{/g))
    for (const [, n] of params.matchAll(/(?:int|Tree\*|Node\*)\s+(\w+)/g)) if (out.get(n) === "int" || !out.has(n)) out.set(n, "param");
  return out;
}

function renameCard(card) {
  const decl = declared(card), all = new Set();
  for (const l of ["cpp", "java", "py"]) tokens(card[l], l).forEach((tk, i, a) => { if (tk.id && !(a[i - 1] && (a[i - 1].t === "." || a[i - 1].t === ">"))) all.add(tk.t); });   // not fields or methods
  const map = new Map(), taken = new Set(all);
  for (const [name, type] of decl) {
    if (KEEP.has(name) && !(BY_TITLE[card.title] || {})[name]) continue;
    let to = (BY_TITLE[card.title] || {})[name] || byType(name, type, card, all);
    if (!to || to === name) continue;
    let k = 2; const base = to; while (taken.has(to)) to = base + k++;
    map.set(name, to); taken.add(to);
  }
  const fix = (code, lang) => tokens(code, lang).map((tk, i, a) => {
    if (!tk.id || !map.has(tk.t)) return tk.t;
    const before = a[i - 1] && a[i - 1].t, before2 = a[i - 2] && a[i - 2].t;
    if (before === "." || (before === ">" && before2 === "-")) return tk.t;   // a field like p.next, never renamed
    return map.get(tk.t);
  }).join("");
  const out = { ...card };
  for (const l of ["cpp", "java", "py"]) out[l] = fix(card[l], l);
  // Python: a plain list instead of deque (append at the back, pop(0) from the front)
  out.py = out.py.replace(/\bdeque\(\)/g, "[]").replace(/\.popleft\(\)/g, ".pop(0)");
  out.renamed = Object.fromEntries(map);
  return out;
}

module.exports = cards => cards.map(renameCard);
