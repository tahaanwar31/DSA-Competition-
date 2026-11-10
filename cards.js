// ============================================================
//  CODE 21 · THE CARDS
//  These are PLACEHOLDER cards. Replace them with the real ones.
//
//  Each card:
//    lvl  : "easy" | "medium" | "hard"
//             easy   = small change to x   (about ±1 to ±5)
//             medium = bigger change        (about ±5 to ±15)
//             hard   = big or tricky        (×2, ×0, −20 ...)
//    cat  : small label on top of the card (topic)
//    t    : card title
//    code : the code snippet shown on the card (use \n for new lines,
//           or a `backtick string` that spans lines)
//    f    : what TAKING the card does to the team's x
//           (must match what the code really does!)
//
//  HOW A ROUND USES THEM
//  - Every card in this list is hidden ONCE per round, in a random place.
//    Every team gets the same cards; only the places change per laptop.
//  - Hard cards are hidden in the scariest places (upstairs and outside).
//  - Once a card is taken or dropped it burns and is gone for that round.
//  - Highest x when the timer ends wins. Cards can raise OR lower x,
//    so teams must read the code to know which ones to take.
//
//  THE GOLDEN CARD (GOLD_CARD, at the bottom): exactly one per round, in a
//  random place. If the team plays it they cannot skip: they type the
//  answer. Right = +GOLD, wrong = -GOLD.
//    gold : true
//    ans  : the correct answer (a whole number the code prints)
//    f    : not used for the golden card
// ============================================================
const NODE = "struct Node { int v; Node* next; };";

export const CARDS = [
  { cat: "♠ STACK", lvl: "medium", t: "Two stacks", f: x => x + 7, code:
`stack<int> a, b;
for (int i = 1; i <= 4; i++)
  a.push(i);
b.push(a.top()); a.pop();
b.push(a.top()); a.pop();
a.push(b.top()); b.pop();
x = x + a.top() + b.top();` },

  { cat: "♣ QUEUE", lvl: "easy", t: "Last one standing", f: x => x + 3, code:
`queue<int> q;
for (int i = 1; i <= 5; i++) q.push(i);
while (q.size() > 1) {
  q.push(q.front());  // skip one
  q.pop();
  q.pop();            // remove the next
}
x = x + q.front();` },

  { cat: "♥ LINKED LIST", lvl: "medium", t: "Half reversal", f: x => x + 7, code:
`${NODE}
Node* head = nullptr;
for (int i = 5; i >= 1; i--) head = new Node{i, head};
Node* prev = nullptr; Node* cur = head;
while (cur && cur->v != 4) {
  Node* nx = cur->next; cur->next = prev;
  prev = cur; cur = nx;
}
x = x + prev->v + cur->v;` },

  { cat: "♦ BINARY TREE", lvl: "medium", t: "Tree in an array", f: x => x + 8, code:
`// children of i are 2i and 2i+1 (0 = empty)
int t[] = {0, 5, 3, 8, 1, 4, 0, 9};
int k = 0, ans = 0;
void pre(int i) {
  if (i > 7 || t[i] == 0) return;
  if (++k == 5) ans = t[i];
  pre(2 * i); pre(2 * i + 1);
}
pre(1);
x = x + ans;` },

  { cat: "★ BFS / DFS", lvl: "easy", t: "BFS order", f: x => x + 5, code:
`vector<int> adj[6] = {{}, {3, 2}, {4}, {5, 4}, {}, {}};
queue<int> q; bool seen[6] = {};
q.push(1); seen[1] = true;
int order = 0, ans = 0;
while (!q.empty()) {
  int u = q.front(); q.pop();
  if (++order == 4) ans = u;
  for (int v : adj[u])
    if (!seen[v]) { seen[v] = true; q.push(v); }
}
x = x + ans;` },

  { cat: "♠ STACK", lvl: "easy", t: "Bracket depth", f: x => x + 3, code:
`string s = "(()(()))";
stack<char> st; int best = 0;
for (char c : s) {
  if (c == '(') st.push(c);
  else st.pop();
  best = max(best, (int)st.size());
}
x = x + best;` },

  { cat: "♣ QUEUE", lvl: "medium", t: "Reverse the first three", f: x => x + 8, code:
`queue<int> q; stack<int> s;
for (int i = 1; i <= 5; i++) q.push(i);
for (int i = 0; i < 3; i++) { s.push(q.front()); q.pop(); }
while (!s.empty()) { q.push(s.top()); s.pop(); }
for (int i = 0; i < 2; i++) { q.push(q.front()); q.pop(); }
x = x + q.front() + q.back();` },

  { cat: "♥ LINKED LIST", lvl: "medium", t: "Endless loop", f: x => x + 13, code:
`${NODE}
Node* c = new Node{3, nullptr};
Node* b = new Node{2, c};
Node* a = new Node{1, b};
c->next = b;            // loop!
Node* p = a; int sum = 0;
for (int i = 0; i < 6; i++) { sum += p->v; p = p->next; }
x = x + sum;` },

  { cat: "♦ BINARY TREE", lvl: "medium", t: "Height × leaves", f: x => x + 12, code:
`// root 1: left 2 (left 4), right 3 (left 5 (right 7), right 6)
int h(N* t) {
  if (!t) return 0;
  return 1 + max(h(t->l), h(t->r));
}
int leaves(N* t) {
  if (!t) return 0;
  if (!t->l && !t->r) return 1;
  return leaves(t->l) + leaves(t->r);
}
x = x + h(root) * leaves(root);` },

  { cat: "★ BFS / DFS", lvl: "easy", t: "DFS finish order", f: x => x + 5, code:
`vector<int> g[6] = {{}, {2, 4}, {3}, {1}, {5}, {2}};
bool vis[6]; int cnt = 0, ans = 0;
void dfs(int u) {
  vis[u] = true;
  for (int v : g[u]) if (!vis[v]) dfs(v);
  if (++cnt == 3) ans = u;   // 3rd node to finish
}
dfs(1);
x = x + ans;` },

  // ---- cards that LOWER x (so teams must think before taking) ----
  { lvl: "easy", cat: "♠ STACK", t: "Pop the top", f: x => x - 1, code:
`stack<int> s;
s.push(4); s.push(1); s.push(6);
s.pop();
x = x - s.top();` },

  { lvl: "easy", cat: "★ LOOPS", t: "Countdown", f: x => x - 4, code:
`int c = 0;
for (int i = 10; i > 0; i -= 3)
  c++;
x = x - c;` },

  { lvl: "medium", cat: "♣ QUEUE", t: "Queue rotation", f: x => x - 10, code:
`queue<int> q;
for (int i = 1; i <= 6; i++) q.push(i);
for (int k = 0; k < 4; k++) {
  q.push(q.front());
  q.pop();
}
x = x - q.front() * 2;` },

  { lvl: "medium", cat: "♥ LINKED LIST", t: "Middle node", f: x => x - 8, code:
`${NODE}
Node* head = nullptr;
for (int i = 12; i >= 2; i -= 2) head = new Node{i, head};
Node* slow = head; Node* fast = head;
while (fast && fast->next) {
  slow = slow->next;
  fast = fast->next->next;
}
x = x - slow->v;` },

  // ---- HARD: big or tricky ----
  { lvl: "hard", cat: "♦ BINARY TREE", t: "Double or nothing", f: x => x * 2, code:
`// BST: insert 7, 3, 9, 1, 5 in this order
int cnt = 0;
void walk(N* t) {
  if (!t) return;
  walk(t->l);
  if (t->v < 6) cnt++;
  walk(t->r);
}
walk(root);
if (cnt % 2 == 1) x = x * 2;
else x = 0;` },

  { lvl: "hard", cat: "★ RECURSION", t: "Rabbit hole", f: x => x - 26, code:
`int f(int n) {
  if (n <= 1) return n;
  return f(n - 1) + f(n - 2);
}
x = x - 2 * f(7);` },

  { lvl: "hard", cat: "★ BFS / DFS", t: "Wipe out", f: x => 0, code:
`vector<int> adj[6] = {{}, {2, 3}, {4}, {}, {2}, {1}};
bool seen[6] = {}; queue<int> q;
q.push(1); seen[1] = true; int cnt = 0;
while (!q.empty()) {
  int u = q.front(); q.pop(); cnt++;
  for (int v : adj[u])
    if (!seen[v]) { seen[v] = true; q.push(v); }
}
if (cnt == 4) x = 0;
else x = x + 20;` },

  { lvl: "hard", cat: "★ BITS", t: "Counting ones", f: x => x + 20, code:
`int n = 45, c = 0;
while (n) {
  n &= n - 1;   // removes the lowest 1 bit
  c++;
}
x = x + c * 5;` },
];

export const GOLD = 15;   // whole number, so scores never have .5

export const GOLD_CARD = { gold: true, cat: "★ GOLDEN", t: "The Golden Card", ans: 10, code:
`int a[] = {3, 8, 2, 7, 5};
int c = 0;
for (int i = 0; i < 5; i++)
  for (int j = 0; j < 4 - i; j++)
    if (a[j] > a[j + 1]) {
      swap(a[j], a[j + 1]);
      c++;
    }
cout << c + a[2];` };
