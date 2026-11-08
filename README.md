<div align="center">

# 🕯️ CODE 21: THE MANSION

### A haunted first-person card game for the **PROCOM DSA Competition**

*Search an abandoned mansion. Read the code. Don't look into her eyes.*

![The ghost](docs/ghost.jpg)

</div>

---

## 👻 What is it?

**Code 21: The Mansion** turns a Data Structures & Algorithms quiz into a horror game.

Teams walk through a dark, abandoned two-floor mansion and its haunted grounds, a forest, a cemetery and a crypt, with only a flashlight. Almost every **drawer, cupboard, chest and coffin** hides a card with a short piece of code on it. Read it, work out what it does to your team's value `x`, and decide in **10 seconds**: take it or drop it.

The goal: get `x` as close to **31** as possible.

But you are not alone in the house. She appears without warning. **Don't look into her eyes.**

<table>
  <tr>
    <td><img src="docs/card.jpg" alt="A card hidden in a drawer"></td>
    <td><img src="docs/grand-hall.jpg" alt="The grand hall"></td>
    <td><img src="docs/pool.jpg" alt="The abandoned indoor pool"></td>
  </tr>
  <tr align="center">
    <td><sub>Cards hide in drawers</sub></td>
    <td><sub>The grand hall</sub></td>
    <td><sub>The abandoned pool</sub></td>
  </tr>
</table>

---

## 🚀 Quick start

You only need **[Node.js](https://nodejs.org)** (any recent version). No `npm install` is needed.

```bash
git clone https://github.com/tahaanwar31/DSA-Competition-.git
cd DSA-Competition-
node server.js
```

Then open **http://localhost:8780** in **Google Chrome** and click to enter.

> [!IMPORTANT]
> Don't double-click `index.html`. Browsers block the 3D models when a page is opened as a file, so the game must be served by `server.js`.

> [!NOTE]
> An internet connection is needed the first time, because the 3D engine (Three.js) and the fonts load from a CDN.

**Another port:** `node server.js 9000` → http://localhost:9000

---

## 🎮 Controls

| Key | Action |
| :---: | --- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Move |
| <kbd>Mouse</kbd> | Look around |
| <kbd>Shift</kbd> | Run |
| <kbd>Space</kbd> | Jump (over fences, graves and low furniture) |
| <kbd>E</kbd> | Open / close a drawer, cupboard, chest or coffin |
| <kbd>C</kbd> | Grab the card inside |
| <kbd>E</kbd> / <kbd>Q</kbd> | **Take** / **drop** the card (you have 10 seconds) |
| <kbd>F</kbd> | Flashlight on / off |
| <kbd>Esc</kbd> | Pause |

---

## 📜 Rules

1. Every team starts at **`x = 0`**.
2. Open things and find cards. Each card shows code that changes `x`.
3. **Take** the card to apply it, or **drop** it to skip it. You have **10 seconds** to decide.
4. Get as close to **31** as you can.

### ⚖️ Going over 31

If a team goes **over 31**, its score is balanced back to **31** and then **5 is taken off**, so the score becomes **26**.

### 👁️ The ghost

- She appears suddenly: right in front of you, far away down a corridor, or upside down on the ceiling.
- **Look into her eyes for a full second** and you are **busted: `x − 3`**.
- Letting a card's timer run out is also **−3**.

### 🏆 Example

| Team | Final `x` | Score | Rank |
| :---: | :---: | :---: | :---: |
| Team B | 29 | **29** | 🥇 1st |
| Team C | 28 | **28** | 🥈 2nd |
| Team A | 50 | 50 → 31 − 5 = **26** | 🥉 3rd |

---

## 🃏 Editing the cards

All the questions live in **`cards.js`**. Each card looks like this:

```js
{ cat: "♠ STACK", t: "Two stacks", f: x => x + 7, code:
`stack<int> a, b;
...` }
```

| Field | Meaning |
| --- | --- |
| `cat` | Small label on top of the card (the topic) |
| `t` | Card title |
| `code` | The code snippet players read |
| `f` | What **taking** the card really does to `x`, so it must match the code |

About 95% of drawers, cupboards, chests and coffins get a random card from this list every round.

---

## 🗂️ Project structure

```
├── index.html      the whole game (Three.js, WebAudio, shaders)
├── cards.js        the cards and their code snippets
├── server.js       tiny local server (Node.js, no packages)
├── package.json    `npm start` also runs the server
├── assets/
│   ├── models/     3D furniture, statues, trees, gates (glTF)
│   └── tex/        wall, floor and stone textures
└── docs/           screenshots for this page
```

---

## ✨ Features

- 🏚️ A full two-floor mansion: grand hall, library, study, kitchen, dining room, nursery, master bedroom, gallery and an abandoned indoor pool
- 🌲 Haunted grounds: courtyard, dead forest, cemetery and crypt, with rain, fog and lightning
- 🗄️ Working drawers, cupboards, chests, coffins, doors and gates
- 👻 A ghost with an eye-contact mechanic and jumpscares
- 🪟 Lit windows where shadows move when you are outside
- 🔊 Sound made live in the browser: wood creaks, thunder, heartbeat, whispers
- 💻 Runs on normal laptops: power saving when paused, one active tab at a time, auto resolution

---

## 🙏 Credits

- **3D models and textures:** [Poly Haven](https://polyhaven.com) (CC0)
- **Engine:** [Three.js](https://threejs.org) r170
- **Fonts:** Cinzel, Rock Salt, JetBrains Mono, IBM Plex Sans (Google Fonts)

<div align="center">

**PROCOM · Software Engineering Competitions**
ACM Student Chapter, FAST NUCES Karachi

</div>
