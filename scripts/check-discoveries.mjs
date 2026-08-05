// Diagnostic: kondisi word_discoveries sebelum refactor ke FK-only.
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

const cols = await q(
  "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='word_discoveries' order by ordinal_position"
);
console.log("=== word_discoveries columns ===");
console.log(cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));

const count = await q("select count(*) as n from public.word_discoveries");
console.log("=== rows:", count[0].n);

const orphans = await q(
  "select count(*) as n from public.word_discoveries d where not exists (select 1 from public.vocabulary v where v.word_id = d.word_id)"
);
console.log("=== orphan word_id (tidak ada di vocabulary):", orphans[0].n);

const fks = await q(
  "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.word_discoveries'::regclass and contype = 'f'"
);
console.log("=== FK constraints ===");
console.log(fks.length ? fks.map((f) => `${f.conname}: ${f.def}`).join("\n") : "(none)");

const sample = await q("select discovery_id, user_id, word_id from public.word_discoveries order by discovered_at desc limit 5");
console.log("=== sample rows ===");
console.log(JSON.stringify(sample, null, 2));
