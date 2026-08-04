// Spot-check curated tier-1 words in cloud.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/verify-tier1.mjs
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}
const ref = "uylunbabcudjpcphzchw";
const q = `select word_id, word, clue_1, clue_2, clue_3, tier_level
from public.vocabulary where tier_level = 1 order by word_id limit 12;`;
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q }),
});
console.log(`(HTTP ${res.status})`);
console.log((await res.text()).slice(0, 3500));
