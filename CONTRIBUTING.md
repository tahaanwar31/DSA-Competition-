# 🤝 How to contribute (for the co-heads)

**Never push to `main`.** Make your changes on your own branch and open a **Pull Request**. Taha reviews it and merges it if it's good.

## First time only

```bash
git clone https://github.com/tahaanwar31/DSA-Competition-.git
cd DSA-Competition-
```

## Every time you change something

**1. Get the latest version**
```bash
git checkout main
git pull
```

**2. Make a new branch** (name it after what you're doing)
```bash
git checkout -b new-cards
```

**3. Make your changes and test them**
```bash
node server.js
```
Open http://localhost:8780 in Chrome and play to check your change works.

**4. Save and push your branch**
```bash
git add .
git commit -m "Add real DSA cards"
git push -u origin new-cards
```

**5. Open a Pull Request**
On the GitHub repo page, click **Compare & pull request**, write what you changed, and click **Create pull request**.

**6. If Taha asks for fixes**
Make them on the same branch, then:
```bash
git add .
git commit -m "Fix card 3"
git push
```
The Pull Request updates by itself.

## Rules

- ❌ Don't push to `main`.
- ✅ One branch per change (e.g. `new-cards`, `fix-ghost`, `kitchen-drawers`).
- ✅ Test the game before you push.
- ✅ In `cards.js`, the `code` on a card and its `f` must give the same result.
- ❌ Don't commit big files you don't need (videos, recordings, zips).
