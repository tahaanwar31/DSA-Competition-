// Creates an admin (or changes their password) for the /admin page.
//   node scripts/add-admin.js <name>
// It asks for the password (nothing shows while you type).
const readline = require("readline");
const { sb, hashPw } = require("../server.js");
const name = (process.argv[2] || "").trim();
if (!name) { console.log("Usage: node scripts/add-admin.js <name>"); process.exit(1); }

function askHidden(q) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, a => { rl.close(); process.stdout.write("\n"); res(a); });
  });
}
(async () => {
  const pw = await askHidden(`Password for admin "${name}": `);
  if (pw.length < 6) { console.log("Use 6 or more characters."); process.exit(1); }
  if ((await askHidden("Type it again: ")) !== pw) { console.log("They don't match."); process.exit(1); }
  const [old] = await sb(`admins?username=eq.${encodeURIComponent(name)}&select=id`);
  if (old) await sb(`admins?id=eq.${old.id}`, { method: "PATCH", body: { password_hash: hashPw(pw) } });
  else await sb("admins", { method: "POST", body: { username: name, password_hash: hashPw(pw) } });
  console.log(old ? `Password changed for "${name}".` : `Admin "${name}" created. Log in at /admin`);
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
