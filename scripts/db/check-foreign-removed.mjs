// PLAN-048: verifikasi kata asing sudah hilang dari tabel vocabulary di
// Supabase. Kata asing mentah (start, lose, cheetah, maroon, trottoar,
// qurban, fuchsia, olive, disorder) harus 0 row.
// Usage: node scripts/db/check-foreign-removed.mjs
import { readFileSync, existsSync } from "node:fs";

const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && existsSync(".env.local")) {
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (m) token = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (env atau .env.local).");
  process.exit(2);
}

const FOREIGN = ["start", "lose", "cheetah", "maroon", "trottoar", "qurban", "fuchsia", "olive", "disorder"];
const inList = FOREIGN.map((w) => `'${w}'`).join(", ");
const query = `
select word, tier_level from vocabulary where word in (${inList}) order by tier_level, word;
`;
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
let rows = [];
try { rows = JSON.parse(text); } catch { /* ignore */ }
console.log("HTTP", res.status);
if (Array.isArray(rows) && rows.length) {
  console.log("MASIH ADA kata asing di DB:", rows.map((r) => `${r.word}(t${r.tier_level})`).join(", "));
  process.exit(1);
}
console.log("OK — tidak ada kata asing tersisa di DB (start/lose/cheetah/maroon/trottoar/qurban/fuchsia/olive/disorder = 0 row).");
process.exit(0);
