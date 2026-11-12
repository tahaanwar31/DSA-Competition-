// Loads db/cards-data.js into Supabase.
//   node scripts/seed-cards.js            adds the cards only if the cards table is empty
//   node scripts/seed-cards.js --update   rewrites the existing cards in place (same ids, so
//                                         nothing that points at them breaks) and adds new ones. Refuses if any
//                                         team has already opened a card, unless --force.
//   node scripts/seed-cards.js --add      adds them again even if there are cards already
// The "code" column holds the three versions as one JSON text: {"cpp": "...", "java": "...", "py": "..."}
const { sb } = require("../server.js");
const cards = require("../db/cards-data.js");
const row = c => ({ level: c.level, topic: c.topic, title: c.title, effect: c.effect, code: JSON.stringify({ cpp: c.cpp, java: c.java, py: c.py }), active: c.active !== false });
const has = f => process.argv.includes(f);
(async () => {
  const have = await sb("cards?select=id&order=id");
  if (has("--update")) {
    // rewrite the cards that are already there (same ids), add any new ones at the end
    if (have.length > cards.length) throw new Error(`the database has ${have.length} cards and the file only ${cards.length}; switch extra cards off in /admin instead`);
    const plays = await sb("plays?select=id&limit=1");
    if (plays.length && !has("--force")) throw new Error("teams have already opened cards. Use --force only if you really mean to change cards during the event.");
    for (let i = 0; i < have.length; i++) await sb(`cards?id=eq.${have[i].id}`, { method: "PATCH", body: row(cards[i]) });
    const extra = cards.slice(have.length);
    if (extra.length) await sb("cards", { method: "POST", body: extra.map(row) });
    console.log(`Updated ${have.length} cards in place, added ${extra.length} new.`); return;
  }
  if (have.length && !has("--add")) { console.log(`There are already ${have.length} cards. Nothing added (use --update to rewrite them, --add to add anyway).`); return; }
  await sb("cards", { method: "POST", body: cards.map(row) });
  console.log(`Added ${cards.length} cards.`);
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
