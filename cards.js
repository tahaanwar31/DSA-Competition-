// ============================================================
//  CODE 21 · THE CARDS
//  These are PLACEHOLDER cards. Replace them with the real ones.
//
//  Each card:
//    cat  : small label on top of the card (topic)
//    t    : card title
//    code : the code snippet shown on the card (use \n for new lines,
//           or a `backtick string` that spans lines)
//    f    : what TAKING the card does to the team's x
//           (must match what the code really outputs)
//
//  About 95% of drawers / cabinets / chests / coffins get a card each round,
//  picked at random from this list (cards repeat). Target is 31.
//
//  THE GOLDEN CARD (GOLD_CARD, at the bottom): exactly one per round, in a
//  random drawer. No topic is shown. If the team plays it they cannot skip:
//  they type the answer. Right = +GOLD, wrong = -GOLD (15).
//  The result stays between 0 and 31: no over-31 penalty, never below 0.
//    gold : true
//    ans  : the correct answer (a whole number the code prints)
//    f    : not used for the golden card
// ============================================================
const NODE = "struct Node { int v; Node* next; };";

export const CARDS = [
  { cat: "♠ STACK", t: "Two stacks", f: x => x + 7, code:
`stack<int> a, b;
for (int i = 1; i <= 4; i++)
  a.push(i);
b.push(a.top()); a.pop();
b.push(a.top()); a.pop();
a.push(b.top()); b.pop();
x = x + a.top() + b.top();` },

  { cat: "♣ QUEUE", t: "Last one standing", f: x => x + 3, code:
`queue<int> q;
for (int i = 1; i <= 5; i++) q.push(i);
while (q.size() > 1) {
  q.push(q.front());  // skip one
  q.pop();
  q.pop();            // remove the next
}
x = x + q.front();` },

  { cat: "♥ LINKED LIST", t: "Half reversal", f: x => x + 7, code:
`${NODE}
Node* head = nullptr;
for (int i = 5; i >= 1; i--) head = new Node{i, head};
Node* prev = nullptr; Node* cur = head;
while (cur && cur->v != 4) {
  Node* nx = cur->next; cur->next = prev;
  prev = cur; cur = nx;
}
x = x + prev->v + cur->v;` },

  { cat: "♦ BINARY TREE", t: "Tree in an array", f: x => x + 8, code:
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

  { cat: "★ BFS / DFS", t: "BFS order", f: x => x + 5, code:
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

  { cat: "♠ STACK", t: "Bracket depth", f: x => x + 3, code:
`string s = "(()(()))";
stack<char> st; int best = 0;
for (char c : s) {
  if (c == '(') st.push(c);
  else st.pop();
  best = max(best, (int)st.size());
}
x = x + best;` },

  { cat: "♣ QUEUE", t: "Reverse the first three", f: x => x + 8, code:
`queue<int> q; stack<int> s;
for (int i = 1; i <= 5; i++) q.push(i);
for (int i = 0; i < 3; i++) { s.push(q.front()); q.pop(); }
while (!s.empty()) { q.push(s.top()); s.pop(); }
for (int i = 0; i < 2; i++) { q.push(q.front()); q.pop(); }
x = x + q.front() + q.back();` },

  { cat: "♥ LINKED LIST", t: "Endless loop", f: x => x + 13, code:
`${NODE}
Node* c = new Node{3, nullptr};
Node* b = new Node{2, c};
Node* a = new Node{1, b};
c->next = b;            // loop!
Node* p = a; int sum = 0;
for (int i = 0; i < 6; i++) { sum += p->v; p = p->next; }
x = x + sum;` },

  { cat: "♦ BINARY TREE", t: "Height × leaves", f: x => x + 12, code:
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

  { cat: "★ BFS / DFS", t: "DFS finish order", f: x => x + 5, code:
`vector<int> g[6] = {{}, {2, 4}, {3}, {1}, {5}, {2}};
bool vis[6]; int cnt = 0, ans = 0;
void dfs(int u) {
  vis[u] = true;
  for (int v : g[u]) if (!vis[v]) dfs(v);
  if (++cnt == 3) ans = u;   // 3rd node to finish
}
dfs(1);
x = x + ans;` },
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
