// Runs a .sql file against a Supabase project via the Management API.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-supabase-sql.mjs [sql-file] [project-ref]
// Project ref defaults to the KotaKata project (uylunbabcudjpcphzchw).
import { readFileSync } from "node:fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}

const sqlFile = process.argv[2] ?? "supabase/data/vocabulary.sql";
const ref = process.argv[3] ?? process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";
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
