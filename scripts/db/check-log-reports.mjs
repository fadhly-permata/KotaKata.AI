#!/usr/bin/env node
// ============================================================
// KotaKata AI — Cek & Hapus Log Report dari Supabase
// ============================================================
// Script diagnostik untuk membaca tabel `user_log_reports`,
// mengelompokkan issue serupa, dan menghapus baris yang sudah
// diperbaiki (hanya baris yang dipilih, bukan semua).
//
// Butuh akses admin (service role key) karena RLS membatasi
// select/delete ke baris milik user sendiri.
//
// Env vars (dari .env.local atau environment):
//   EXPO_PUBLIC_SUPABASE_URL     — URL project Supabase
//   SUPABASE_SERVICE_ROLE_KEY    — Service role key (admin)
//
// Cara pakai:
//   bun scripts/db/check-log-reports.mjs list [--level error|warn] [--limit N]
//   bun scripts/db/check-log-reports.mjs analyze [--limit N]
//   bun scripts/db/check-log-reports.mjs delete <id1> [id2] [id3] ...
//   bun scripts/db/check-log-reports.mjs delete-all  (HAPUS SEMUA — hati-hati!)
//
// Contoh:
//   bun scripts/db/check-log-reports.mjs list --level error
//   bun scripts/db/check-log-reports.mjs analyze --limit 100
//   bun scripts/db/check-log-reports.mjs delete uuid1 uuid2 uuid3
// ============================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Load env vars dari .env.local
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  try {
    const raw = readFileSync(resolve(process.cwd(), filePath), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file tidak ada — skip
  }
}

function loadEnv() {
  // Baca .env dulu (base), lalu .env.local (override)
  loadEnvFile(".env");
  loadEnvFile(".env.local");
}

loadEnv();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing env vars. Set EXPO_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Tambahkan ke .env.local atau export di shell.");
  process.exit(1);
}

const API = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Supabase REST: select + filter */
async function supaSelect(table, { select = "*", filter = "", order = "created_at.desc", limit = 100 } = {}) {
  const params = new URLSearchParams({
    select,
    order,
    limit: String(limit),
  });
  if (filter) params.append("filter", filter);

  let url = `${API}/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(order)}&limit=${limit}`;
  if (filter) {
    for (const f of filter.split("&")) {
      url += `&${f}`;
    }
  }

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase select error ${res.status}: ${body}`);
  }
  return res.json();
}

/** Supabase REST: delete with filter */
async function supaDelete(table, filter) {
  let url = `${API}/${table}?${filter}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...HEADERS, Prefer: "return=minimal" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase delete error ${res.status}: ${body}`);
  }
  return true;
}

/** Parse payload JSON menjadi array entry */
function parsePayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  try {
    const parsed = JSON.parse(typeof payload === "string" ? payload : JSON.stringify(payload));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Normalisasi message untuk grouping (buang variabel dinamis) */
function normalizeMessage(msg) {
  if (!msg) return "(no message)";
  return msg
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, "<timestamp>")
    .replace(/\d+/g, "<N>")
    .replace(/sk-[a-zA-Z0-9]+/g, "sk-***")
    .replace(/hf_[a-zA-Z0-9]+/g, "hf_***")
    .slice(0, 120);
}

/** Format tanggal Indonesia */
function fmtDate(iso) {
  return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList(args) {
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50", 10);

  // Parse --level
  let levelFilter = null;
  const levelIdx = args.indexOf("--level");
  if (levelIdx >= 0 && args[levelIdx + 1]) {
    levelFilter = args[levelIdx + 1];
  }
  const levelEq = args.find((a) => a.startsWith("--level="));
  if (levelEq) levelFilter = levelEq.split("=")[1];

  console.log(`\n📋 User Log Reports${levelFilter ? ` (${levelFilter.toUpperCase()})` : ""} — max ${limit} baris\n`);

  let filterParts = [];
  if (levelFilter) filterParts.push(`level=eq.${levelFilter}`);

  // --full: tampilkan UUID lengkap (untuk keperluan delete)
  const showFull = args.includes("--full");

  const rows = await supaSelect("user_log_reports", {
    select: "id,user_id,level,device_id,platform,app_version,created_at,payload",
    filter: filterParts.join("&"),
    limit,
  });

  if (rows.length === 0) {
    console.log("   (kosong — tidak ada log report)");
    return;
  }

  console.log(`   ${showFull ? "ID" : "ID".slice(0, 8)}  ${"Level".padEnd(6)}  ${"Platform".padEnd(8)}  ${"App Ver".padEnd(8)}  Tanggal                Pesan (Ringkas)`);
  console.log("   " + "─".repeat(100));

  for (const r of rows) {
    const entries = parsePayload(r.payload);
    const firstMsg = entries.length > 0 ? normalizeMessage(entries[0].message) : "(empty)";
    const displayId = showFull ? (r.id ?? "??") : ((r.id?.slice(0, 8) ?? "??") + "…");
    console.log(
      `   ${displayId}  ${(r.level || "?").padEnd(6)}  ${(r.platform || "?").padEnd(8)}  ${(r.app_version || "?").padEnd(8)}  ${fmtDate(r.created_at).padEnd(22)}  ${firstMsg.slice(0, 50)}`
    );
  }

  console.log(`\n   Total: ${rows.length} baris\n`);
  console.log("   💡 Untuk analisis grup: bun scripts/db/check-log-reports.mjs analyze");
  console.log("   💡 Untuk hapus baris:   bun scripts/db/check-log-reports.mjs delete <id1> [id2] ...\n");
}

async function cmdAnalyze(args) {
  const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "200", 10);

  console.log(`\n🔍 Analisis Log Reports (max ${limit} baris)\n`);

  const rows = await supaSelect("user_log_reports", {
    select: "id,user_id,level,device_id,platform,app_version,created_at,payload",
    limit,
  });

  if (rows.length === 0) {
    console.log("   (kosong — tidak ada log report)");
    return;
  }

  // Group by normalized message + source
  const groups = new Map();

  for (const r of rows) {
    const entries = parsePayload(r.payload);
    for (const e of entries) {
      const normMsg = normalizeMessage(e.message);
      const key = `${e.source || "?"}|${e.level || "?"}|${normMsg}`;
      if (!groups.has(key)) {
        groups.set(key, {
          source: e.source || "?",
          level: e.level || "?",
          message: e.message || "(empty)",
          normalizedMessage: normMsg,
          count: 0,
          reportIds: new Set(),
          sampleStack: null,
          sampleDetails: null,
          platforms: new Set(),
          versions: new Set(),
        });
      }
      const g = groups.get(key);
      g.count++;
      g.reportIds.add(r.id);
      if (!g.sampleStack && e.stack) g.sampleStack = e.stack;
      if (!g.sampleDetails && e.details) g.sampleDetails = e.details;
      g.platforms.add(r.platform || "?");
      g.versions.add(r.app_version || "?");
    }
  }

  // Sort by count desc
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count);

  console.log(`   Ditemukan ${sorted.length} grup issue unik dari ${rows.length} baris:\n`);

  let idx = 0;
  for (const g of sorted) {
    idx++;
    const levelIcon = g.level === "error" ? "🔴" : "🟡";
    console.log(`   ${idx}. ${levelIcon} [${g.level.toUpperCase()}] ${g.source} — ${g.count}x`);
    console.log(`      Pesan: ${g.message.slice(0, 100)}`);
    if (g.sampleDetails) {
      console.log(`      Details: ${g.sampleDetails.slice(0, 120)}`);
    }
    if (g.sampleStack) {
      // Tampilkan hanya baris pertama stack (jangan semua untuk keamanan)
      const firstLine = g.sampleStack.split("\n").slice(0, 2).join(" | ").slice(0, 120);
      console.log(`      Stack: ${firstLine}`);
    }
    console.log(`      Platform: ${[...g.platforms].join(", ")} | Versi: ${[...g.versions].join(", ")}`);
    console.log(`      Report IDs: ${[...g.reportIds].slice(0, 5).map((id) => id.slice(0, 8) + "…").join(", ")}${g.reportIds.size > 5 ? ` (+${g.reportIds.size - 5} lagi)` : ""}`);
    console.log();
  }

  console.log("   💡 Untuk lihat detail: bun scripts/db/check-log-reports.mjs list --level error");
  console.log("   💡 Untuk hapus baris tertentu: bun scripts/db/check-log-reports.mjs delete <id>\n");
}

async function cmdDelete(ids) {
  if (ids.length === 0) {
    console.error("❌ Tentukan ID yang ingin dihapus:");
    console.error("   bun scripts/db/check-log-reports.mjs delete <id1> [id2] [id3] ...");
    process.exit(1);
  }

  // Validate UUIDs
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalid = ids.filter((id) => !uuidRe.test(id));
  if (invalid.length > 0) {
    console.error(`❌ ID tidak valid (bukan UUID): ${invalid.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🗑️  Menghapus ${ids.length} baris dari user_log_reports...\n`);

  let deleted = 0;
  for (const id of ids) {
    try {
      await supaDelete("user_log_reports", `id=eq.${id}`);
      console.log(`   ✅ ${id.slice(0, 8)}… dihapus`);
      deleted++;
    } catch (err) {
      console.error(`   ❌ ${id.slice(0, 8)}… gagal: ${err.message}`);
    }
  }

  console.log(`\n   Selesai: ${deleted}/${ids.length} baris dihapus.\n`);
}

async function cmdDeleteAll() {
  console.log("\n⚠️  PERINGATAN: Ini akan menghapus SEMUA baris di user_log_reports!");
  console.log("   Tekan Ctrl+C dalam 5 detik untuk batal...\n");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Delete all: filter by created_at is not null (always true)
    // Hapus semua baris: filter by id is not null (selalu true)
    await supaDelete("user_log_reports", "id=not.is.null");
    console.log("   ✅ Semua baris berhasil dihapus.\n");
  } catch (err) {
    console.error(`   ❌ Gagal: ${err.message}\n`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "list":
    await cmdList(args);
    break;
  case "analyze":
    await cmdAnalyze(args);
    break;
  case "delete":
    await cmdDelete(args);
    break;
  case "delete-all":
    await cmdDeleteAll();
    break;
  default:
    console.log(`
📋 KotaKata AI — Log Report Diagnostic Tool

Cara pakai:
  bun scripts/db/check-log-reports.mjs list [--level error|warn] [--limit N]
    Lihat daftar log report (default: 50 baris, semua level)

  bun scripts/db/check-log-reports.mjs analyze [--limit N]
    Kelompokkan issue serupa & tampilkan ringkasan

  bun scripts/db/check-log-reports.mjs delete <id1> [id2] ...
    Hapus baris tertentu berdasarkan UUID (hanya yang sudah diperbaiki!)

  bun scripts/db/check-log-reports.mjs delete-all
    Hapus SEMUA baris (dengan konfirmasi 5 detik)

Env vars yang dibutuhkan (di .env.local atau shell):
  EXPO_PUBLIC_SUPABASE_URL      — URL project Supabase
  SUPABASE_SERVICE_ROLE_KEY     — Service role key (admin, bukan anon key)
`);
    break;
}
