// Jalankan SQL sebarang ke Supabase (Management API).
// Token dibaca dari env SUPABASE_ACCESS_TOKEN atau .env.local (tidak pernah dicetak).
// Usage: node scripts/db/supabase-run.mjs "<sql>"   atau   node scripts/db/supabase-run.mjs <file.sql>
import { readFileSync, existsSync } from "node:fs";

const arg = process.argv[2] ?? "";
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

const query = arg.endsWith(".sql") ? readFileSync(arg, "utf8") : arg;
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 4000));
process.exit(res.ok ? 0 : 1);
