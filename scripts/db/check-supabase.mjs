// Diagnostic: daftar semua tabel di public schema + jumlah baris + kolom.
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

const tables = await q(
  "select tablename from pg_tables where schemaname='public' order by tablename"
);
console.log("=== TABLES ===");
const names = tables.map((r) => r.tablename);
console.log(names.join(", "));

for (const t of names) {
  const counts = await q(
    `select count(*) as n from public."${t}"`
  );
  const cols = await q(
    `select column_name, data_type from information_schema.columns where table_schema='public' and table_name='${t}' order by ordinal_position`
  );
  console.log(`\n=== ${t} (${counts[0].n} rows) ===`);
  console.log(cols.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
}
