// Jalankan 4 file migrasi supabase/ berurutan + verifikasi singkat.
// Token dibaca dari .env.local / .env (atau process.env bila di-inject).
// Tidak pernah mencetak nilai token — hanya panjangnya untuk konfirmasi.
import { readFileSync, existsSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k) out[k] = v;
  }
  return out;
}

const fileEnv = { ...loadEnvFile(".env.local"), ...loadEnvFile(".env") };
const token = process.env.SUPABASE_ACCESS_TOKEN ?? fileEnv.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    "MISSING SUPABASE_ACCESS_TOKEN (tidak ada di process.env, .env.local, atau .env)",
  );
  process.exit(2);
}
console.log("Token ditemukan ✓ (panjang: " + token.length + ", tidak dicetak isinya)");

const ref =
  process.env.SUPABASE_PROJECT_REF ?? fileEnv.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";
const base = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function q(sql) {
  const r = await fetch(base, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`);
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

console.log("\n=== PRE-CHECK (kondisi DB saat ini) ===");
const pre = [
  ["users rows", "select count(*) as n from public.users"],
  ["word_discoveries rows", "select count(*) as n from public.word_discoveries"],
  ["saved_boards rows", "select count(*) as n from public.saved_boards"],
  [
    "FK word_discoveries",
    "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.word_discoveries'::regclass and contype='f'",
  ],
  [
    "FK saved_boards",
    "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.saved_boards'::regclass and contype='f'",
  ],
  [
    "FK users",
    "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.users'::regclass and contype='f'",
  ],
  [
    "users columns",
    "select string_agg(column_name||':'||data_type, ', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='users'",
  ],
  [
    "word_discoveries columns",
    "select string_agg(column_name||':'||data_type, ', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='word_discoveries'",
  ],
  [
    "saved_boards columns",
    "select string_agg(column_name||':'||data_type, ', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='saved_boards'",
  ],
];
for (const [label, sql] of pre) {
  try {
    const res = await q(sql);
    console.log(label + ": " + JSON.stringify(res).slice(0, 700));
  } catch (err) {
    console.log(label + ": ERROR " + String(err.message).slice(0, 300));
  }
}

const FILES = [
  "supabase/migrations/fix-user-tables.sql",
  "supabase/migrations/fix-word-discoveries.sql",
  "supabase/data/vocabulary.sql",
  "supabase/migrations/rls-policies.sql",
];

let failed = 0;
for (const f of FILES) {
  // vocabulary.sql memakai TRUNCATE. Dengan FK word_discoveries → vocabulary
  // (ON DELETE CASCADE), menjalankannya saat ada riwayat pemain akan GAGAL —
  // atau dengan CASCADE malah menghapus seluruh "Sejarah Saya". word_id bersifat
  // deterministik, jadi kalau tabel sudah terisi penuh, file ini dilewati.
  if (f === "supabase/data/vocabulary.sql") {
    try {
      const res = await q("select count(*) as n from public.vocabulary");
      const n = res?.[0]?.n ?? 0;
      if (n >= 9000) {
        let discCount = 0;
        try {
          const dr = await q("select count(*) as n from public.word_discoveries");
          discCount = dr?.[0]?.n ?? 0;
        } catch {
          // tabel mungkin belum dibuat di project baru — biarkan default 0
        }
        console.log(
          `\n▶ ${f} ... SKIP (vocabulary sudah berisi ${n} kata — seed deterministik, tidak perlu reload; ${discCount} baris riwayat pemain terlindungi)`,
        );
        continue;
      }
    } catch (err) {
      // Kalau cek gagal, biarkan file dicoba — error akan tercatat di bawah.
      console.log(`\n▶ ${f} ... (cek isi vocabulary gagal, mencoba tetap jalan)`);
    }
  }

  process.stdout.write(`\n▶ ${f} ... `);
  try {
    const res = await q(readFileSync(f, "utf8"));
    console.log("OK" + (res && res.message ? ` (${res.message})` : ""));
  } catch (err) {
    failed++;
    console.log("GAGAL");
    console.log(String(err.message).slice(0, 600));
  }
}

console.log("\n=== VERIFIKASI ===");
const checks = [
  [
    "users columns (user_id type)",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='users' order by ordinal_position",
  ],
  [
    "word_discoveries columns",
    "select string_agg(column_name || ':' || data_type, ', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='word_discoveries'",
  ],
  [
    "saved_boards columns (user_id type)",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='saved_boards' order by ordinal_position",
  ],
  [
    "word_discoveries FK",
    "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.word_discoveries'::regclass and contype='f'",
  ],
  ["vocabulary rows", "select count(*) as n from public.vocabulary"],
  ["word_discoveries rows", "select count(*) as n from public.word_discoveries"],
  [
    "RLS enabled (public)",
    "select tablename from pg_tables where schemaname='public' and rowsecurity order by tablename",
  ],
  [
    "RLS policies word_discoveries",
    "select policyname, cmd from pg_policies where schemaname='public' and tablename='word_discoveries' order by cmd",
  ],
  [
    "RLS policies vocabulary",
    "select policyname, cmd from pg_policies where schemaname='public' and tablename='vocabulary' order by cmd",
  ],
  [
    "discoveries per user",
    "select user_id, count(*) as n from public.word_discoveries group by user_id order by n desc",
  ],
  [
    "10 discovery terbaru (join vocabulary)",
    "select d.discovery_id, d.word_id, v.word, d.discovered_at from public.word_discoveries d left join public.vocabulary v on v.word_id = d.word_id order by d.discovered_at desc limit 10",
  ],
];
for (const [label, sql] of checks) {
  try {
    const res = await q(sql);
    console.log(label + ":", JSON.stringify(res).slice(0, 900));
  } catch (err) {
    console.log(label + ": ERROR " + String(err.message).slice(0, 300));
  }
}

console.log(
  failed === 0
    ? "\n✅ Semua file migrasi sukses dijalankan."
    : `\n⚠️ ${failed} file gagal — periksa pesan error di atas.`,
);
process.exit(failed === 0 ? 0 : 1);
