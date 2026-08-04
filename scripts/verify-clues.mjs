// Verify the exact words the user complained about + count stats in cloud.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/verify-clues.mjs
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}
const ref = "uylunbabcudjpcphzchw";

const q1 = `select count(*) as total,
  count(distinct word) as unique_words,
  count(*) filter (where clue_2 like '%berakhir huruf%' or clue_2 like '%berjumlah%' or clue_2 like '%vokal%') as old_clue2,
  count(*) filter (where clue_3 like 'Pola:%' or clue_3 like 'Huruf vokal%' or clue_3 like 'Diawali huruf%') as old_clue3,
  count(distinct clue_3) as unique_clue3
from public.vocabulary;`;

const q2 = `select word_id, word, clue_1, clue_2, clue_3, tier_level from public.vocabulary
where word in ('dan','akan','bisa','ada','adalah','jangan','sangat','melakukan','diameter','briologi')
order by word_id;`;

const q3 = `select word, clue_2, clue_3 from public.vocabulary
where tier_level in (1,3,6,10) order by tier_level, random() limit 12;`;

for (const [label, query] of [["stats", q1], ["complained", q2], ["random", q3]]) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  console.log(`=== ${label} (HTTP ${res.status}) ===`);
  console.log(text.slice(0, 4000));
}
