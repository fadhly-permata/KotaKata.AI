// Find bad/duplicate clues in cloud.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/find-bad-clues.mjs
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}
const ref = "uylunbabcudjpcphzchw";

const q1 = `select word_id, word, clue_2, clue_3 from public.vocabulary
where clue_2 like '%berjumlah%' or clue_2 like '%berakhir huruf%' or clue_2 like '%vokal%' or clue_2 like '%konsonan%' or clue_2 like '%Huruf tengahnya%' or clue_2 like '%huruf ganda%';`;

const q2 = `select word_id, word, clue_2, clue_3 from public.vocabulary
where clue_2 = clue_3 limit 20;`;

const q3 = `select count(*) as dupes from public.vocabulary where clue_2 = clue_3;`;

for (const [label, query] of [["old-format clue_2", q1], ["duplicate clue2=clue3", q3], ["dupe samples", q2]]) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log(`=== ${label} (HTTP ${res.status}) ===`);
  console.log((await res.text()).slice(0, 4000));
}
