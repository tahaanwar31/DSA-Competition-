<div align="center">

# 🕯️ CODE 21: THE MANSION

### A haunted first-person card game for the **PROCOM DSA Competition**

*Search an abandoned mansion. Read the code. Don't look into her eyes.*

![The ghost](docs/ghost.jpg)

</div>

---

## 👻 What is it?

**Code 21: The Mansion** turns a Data Structures & Algorithms quiz into a horror game.

Teams walk through a dark, abandoned two-floor mansion and its haunted grounds, a forest, a cemetery and a crypt, with only a flashlight. Drawers, cupboards, chests and coffins hide cards with a short piece of code on them. Read the code, work out what it does to your team's value `x`, and decide in **10 seconds**: take it or drop it. Some cards raise `x`, some lower it.

The goal: have the **highest `x`** when the **10-minute** timer runs out.

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

1. Every team starts at **`x = 0`** and has **10 minutes**.
2. Open drawers, cupboards, chests and coffins to find cards. Each card shows code that changes `x`.
3. **Take** the card and `x` changes by its code. **Drop** it and `x` stays the same. You have **10 seconds** to decide.
4. Either way, the card **burns** and is gone. **Each card is in the mansion only once.**
5. Cards can **raise or lower** `x` (+, −, ×2, ×0 …), so read the code before you take it.
6. **Highest `x` when time runs out wins.** There is no upper limit.

### 🟢🟡🔴 Card levels

| Level | What it does to `x` | Where it hides |
| --- | --- | --- |
| 🟢 **Easy** | small, about ±1 to ±5 | anywhere |
| 🟡 **Medium** | about ±5 to ±15 | anywhere |
| 🔴 **Hard** | big or tricky: ×2, ×0, −20 … | the scariest places (upstairs and outside) |

Every team gets **the same cards**. Only the hiding places change from laptop to laptop, so no team gets an easier deck and teams can't tell each other where a card is.

### ⭐ The golden card

- Every round, **one golden card** is hidden in a random place. It glows gold.
- **Q** skips it. **E** plays it, and after that you can't skip: type the answer with the number keys and press **Enter**.
- **Right answer: +15. Wrong answer: −15.**

### 👁️ The ghost

- She appears suddenly: right in front of you, far away down a corridor, or upside down on the ceiling.
- **Look into her eyes for a full second** and you are **busted: `x − 3`**.
- Letting a card's 10 seconds run out is also **−3**, and the card burns.

### 🏆 Ties

If two teams finish with the same `x`, the team with **fewer busts** ranks higher.

---

## 🃏 Editing the cards

All the questions live in **`cards.js`**. Each card looks like this:

```js
{ lvl: "medium", cat: "♠ STACK", t: "Two stacks", f: x => x + 7, code:
`stack<int> a, b;
...` }
```

| Field | Meaning |
| --- | --- |
| `lvl` | `"easy"`, `"medium"` or `"hard"` |
| `cat` | Small label on top of the card (the topic) |
| `t` | Card title |
| `code` | The code snippet players read |
| `f` | What **taking** the card really does to `x`, so it must match the code |

Every card in this list is hidden **once** per round, in a random place. Hard cards go to the scariest places.

To test with a short round, open `http://localhost:8780/?time=60` (60 seconds).

---

## 🤝 Contributing

Co-heads: **don't push to `main`.** Make a branch, push it, and open a Pull Request. It gets merged after review.
The step-by-step guide is in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

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
- ⏱️ 10-minute rounds, with easy / medium / hard cards that each appear once
- 🔥 Cards burn away after you take or drop them
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
