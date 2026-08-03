// Verify cloud vocabulary has the new improvised clues (no old-format leftovers).
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/verify-clues.mjs
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}
const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";

const q1 = `select count(*) as total,
  count(*) filter (where clue_2 like '%berakhir huruf%') as old_clue2,
  count(*) filter (where clue_3 like 'Diawali huruf%') as old_clue3,
  count(distinct clue_3) as unique_clue3
from public.vocabulary;`;

const q2 = `select word, clue_1, clue_2, clue_3, tier_level from public.vocabulary
where tier_level in (1,5,10) order by tier_level, random() limit 9;`;

for (const [label, query] of [["stats", q1], ["samples", q2]]) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  console.log(`=== ${label} (HTTP ${res.status}) ===`);
  console.log(text.slice(0, 3000));
}
