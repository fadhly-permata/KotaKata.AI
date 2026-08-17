// Verifikasi vocabulary di Supabase setelah push:
// - total row
// - clue berprefix "Kata serapan dari bahasa" / "Kata dari bahasa" (harus 0)
// - jumlah per tier (harus 1000)
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

const query = `
select
  (select count(*) from vocabulary) as total,
  (select count(*) from vocabulary where clue_1 like 'Kata serapan dari%' or clue_1 like 'Kata dari bahasa%' or clue_1 like 'Berasal dari bahasa%') as tagged,
  (select count(*) from vocabulary where tier_level = 1) as t1,
  (select count(*) from vocabulary where tier_level = 2) as t2,
  (select count(*) from vocabulary where tier_level = 3) as t3,
  (select count(*) from vocabulary where tier_level = 4) as t4,
  (select count(*) from vocabulary where tier_level = 5) as t5,
  (select count(*) from vocabulary where tier_level = 6) as t6,
  (select count(*) from vocabulary where tier_level = 7) as t7,
  (select count(*) from vocabulary where tier_level = 8) as t8,
  (select count(*) from vocabulary where tier_level = 9) as t9,
  (select count(*) from vocabulary where tier_level = 10) as t10;
`;

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
