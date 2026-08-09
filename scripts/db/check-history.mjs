// Diagnostic: data riwayat di cloud vs kemampuan baca app.
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.");
  process.exit(2);
}
const proj = "uylunbabcudjpcphzchw";
const base = `https://api.supabase.com/v1/projects/${proj}/database/query`;

async function q(sql) {
  const r = await fetch(base, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 300)}`);
  try { return JSON.parse(t); } catch { return t; }
}

const disc = await q(
  "select count(*) as n, count(distinct user_id) as users from public.word_discoveries"
);
console.log("=== word_discoveries:", JSON.stringify(disc[0]));

const boards = await q(
  "select count(*) as n, count(*) filter (where is_finished) as finished from public.saved_boards"
);
console.log("=== saved_boards:", JSON.stringify(boards[0]));

const perUser = await q(
  `select user_id, count(*) as n from public.word_discoveries group by user_id order by n desc limit 5`
);
console.log("=== discoveries per user ===");
console.log(JSON.stringify(perUser, null, 2));

const sample = await q(
  `select d.discovery_id, d.word_id, v.word, d.discovered_at
   from public.word_discoveries d
   left join public.vocabulary v on v.word_id = d.word_id
   order by d.discovered_at desc limit 10`
);
console.log("=== 10 discovery terbaru (dengan join vocabulary) ===");
console.log(JSON.stringify(sample, null, 2));
