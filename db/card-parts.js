// Shared pieces for the card files: topic labels and the Node / Tree definitions
// in C++, Java and Python. Used by db/cards-data.js and db/cards-more.js.
const ST = "♠ STACK", QU = "♣ QUEUE", SL = "♥ SINGLY LINKED LIST", DL = "♥ DOUBLY LINKED LIST", CL = "♥ CIRCULAR LINKED LIST",
  BST = "♦ BST", REC = "★ RECURSION", BFS = "★ BFS", DFS = "★ DFS";

// ---------- shared pieces ----------
const NODE = {
  cpp: `struct Node {
    int val;
    Node* next = nullptr;
};`,
  java: `class Node {
    int val;
    Node next;
    Node(int v) {
        val = v;
    }
}`,
  py: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None`,
};
const DNODE = {
  cpp: `struct Node {
    int val;
    Node* prev = nullptr;
    Node* next = nullptr;
};`,
  java: `class Node {
    int val;
    Node prev;
    Node next;
    Node(int v) {
        val = v;
    }
}`,
  py: `class Node:
    def __init__(self, val):
        self.val = val
        self.prev = None
        self.next = None`,
};
const TREE = {
  cpp: `struct Tree {
    int key;
    Tree* left = nullptr;
    Tree* right = nullptr;
};

Tree* insert(Tree* t, int key) {
    if (t == nullptr)
        return new Tree{key};
    if (key < t->key)
        t->left = insert(t->left, key);
    else
        t->right = insert(t->right, key);
    return t;
}`,
  java: `class Tree {
    int key;
    Tree left;
    Tree right;
    Tree(int k) {
        key = k;
    }
}

Tree insert(Tree t, int key) {
    if (t == null)
        return new Tree(key);
    if (key < t.key)
        t.left = insert(t.left, key);
    else
        t.right = insert(t.right, key);
    return t;
}`,
  py: `class Tree:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

def insert(t, key):
    if t is None:
        return Tree(key)
    if key < t.key:
        t.left = insert(t.left, key)
    else:
        t.right = insert(t.right, key)
    return t`,
};
const TREE_ONLY = {
  cpp: TREE.cpp.split("\n\n")[0],
  java: TREE.java.split("\n\n")[0],
  py: TREE.py.split("\n\n")[0],
};

module.exports = { ST, QU, SL, DL, CL, BST, REC, BFS, DFS, NODE, DNODE, TREE, TREE_ONLY };
