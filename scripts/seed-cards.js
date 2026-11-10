// Loads db/cards-data.js into Supabase.
//   node scripts/seed-cards.js          adds the cards only if the cards table is empty
//   node scripts/seed-cards.js --add    adds them again even if there are cards already
const { sb } = require("../server.js");
const cards = require("../db/cards-data.js");
(async () => {
  const have = await sb("cards?select=id");
  if (have.length && !process.argv.includes("--add")) { console.log(`There are already ${have.length} cards. Nothing added (use --add to add anyway).`); return; }
  await sb("cards", { method: "POST", body: cards.map(c => ({ level: c.level, topic: c.topic, title: c.title, code: c.code, effect: c.effect })) });
  console.log(`Added ${cards.length} cards.`);
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
