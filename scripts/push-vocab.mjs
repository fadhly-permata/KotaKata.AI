// Push supabase/vocabulary.sql ke Supabase via Management API.
// Token dibaca dari env SUPABASE_ACCESS_TOKEN atau dari .env.local (tidak pernah dicetak).
// Usage: node scripts/push-vocab.mjs [sql-file]
import { readFileSync, existsSync } from "node:fs";

const sqlFile = process.argv[2] ?? "supabase/vocabulary.sql";
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

const query = readFileSync(sqlFile, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 3000));
process.exit(res.ok ? 0 : 1);
