// Verifikasi jumlah kata per tier di Supabase (read-only).
// Usage: node scripts/db/verify-vocab.mjs
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

const q = "select tier_level, count(*) as total from vocabulary group by tier_level order by tier_level;";
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q }),
});
const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
process.exit(res.ok ? 0 : 1);
