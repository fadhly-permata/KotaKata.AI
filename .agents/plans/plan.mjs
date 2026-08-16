#!/usr/bin/env node
/* ============================================================================
 * plan.mjs — Pengelola Plan Revisi KotaKata.AI
 * ============================================================================
 * Folder .agents/plans/ berisi dokumen plan revisi (format markdown) yang bisa
 * dijalankan satu per satu. File ini adalah command untuk mengelola statusnya:
 * mulai, jeda, selesai, menandai langkah selesai, dan mencatat revisi.
 *
 * USAGE
 * ----
 *   bun .agents/plans/plan.mjs list
 *       Daftar semua plan + status & progresnya (plan ber-status `skipped`
 *       disembunyikan — tampilkan dengan `list --all`).
 *
 *   bun .agents/plans/plan.mjs new "Judul plan baru"
 *       Buat plan baru (nomor otomatis PLAN-NNN). Langkahnya diisi manual
 *       dengan mengedit file markdown hasil generate.
 *
 *   bun .agents/plans/plan.mjs start <file>        # mulai / lanjutkan pengerjaan
 *   bun .agents/plans/plan.mjs pause <file>        # jeda sementara
 *   bun .agents/plans/plan.mjs stop <file>         # tandai plan SELESAI
 *   bun .agents/plans/plan.mjs skip <file>         # tandai plan DI-SKIP (tidak dikerjakan
 *                                                  #   untuk sekarang — disembunyikan dari list)
 *       <file> bisa nama file (PLAN-001-...md) atau nomor (001).
 *       Status tersimpan di baris `<!-- status: ... -->` file markdown.
 *
 *   bun .agents/plans/plan.mjs status [file]       # progres plan (atau semua)
 *   bun .agents/plans/plan.mjs check <file> <no>   # tandai langkah #no selesai
 *   bun .agents/plans/plan.mjs uncheck <file> <no> # batalkan tanda selesai
 *   bun .agents/plans/plan.mjs note <file> <no> "teks"
 *       Tambah catatan revisi pada langkah #no (dicatat di bagian
 *       "Catatan Revisi" dokumen). Wajib diberi tanda kutip.
 *   bun .agents/plans/plan.mjs notes <file>        # tampilkan semua catatan revisi
 *   bun .agents/plans/plan.mjs help                # bantuan ini
 *
 * FORMAT DOKUMEN PLAN
 * -------------------
 * Satu plan = satu file markdown di .agents/plans/. Contoh:
 *
 *   # PLAN-001 — Revisi Halaman Utama
 *
 *   <!-- status: pending -->
 *   <!-- dibuat: 2026-08-08 -->
 *
 *   ## Langkah
 *
 *   - [ ] **1. Judul langkah** — deskripsi singkat
 *   - [x] **2. Judul langkah** — sudah selesai
 *
 *   ## Catatan Revisi
 *
 *   - **1.** 2026-08-08: catatan revisi langkah 1
 *
 * Aturan:
 *   - Status valid: pending | in-progress | paused | done | skipped
 *   - Nomor langkah WAJIB ditulis `**N. ...**` setelah checkbox `- [ ]` / `- [x]`.
 *   - Catatan revisi: format `- **N.** <tanggal>: <teks>` di bawah "## Catatan Revisi".
 * ============================================================================ */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLANS_DIR = dirname(fileURLToPath(import.meta.url));

/* ── util ─────────────────────────────────────────────────────────────── */

function listPlanFiles() {
  return readdirSync(PLANS_DIR)
    .filter((f) => /^PLAN-\d{3}.*\.md$/.test(f))
    .sort();
}

function resolveFile(arg) {
  if (!arg) return null;
  if (arg.endsWith(".md")) {
    return /^PLAN-\d{3}/.test(arg) && exists(arg) ? arg : null;
  }
  // terima nomor "001" atau prefix nama
  const found = listPlanFiles().find(
    (f) => f === arg || f.startsWith(`PLAN-${arg.padStart(3, "0")}`) || f.startsWith(arg),
  );
  return found ?? null;
}

function exists(name) {
  try {
    readFileSync(join(PLANS_DIR, name), "utf8");
    return true;
  } catch {
    return false;
  }
}

function read(name) {
  return readFileSync(join(PLANS_DIR, name), "utf8");
}

function write(name, content) {
  writeFileSync(join(PLANS_DIR, name), content);
}

function setStatus(content, status) {
  return content.replace(/<!-- status: [^ ]+ -->/, `<!-- status: ${status} -->`);
}

function getStatus(content) {
  const m = content.match(/<!-- status: ([^ ]+) -->/);
  return m ? m[1] : "?";
}

function getTitle(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "(tanpa judul)";
}

function itemCount(content) {
  return (content.match(/^- \[ \] \*\*(\d+)\./gm) ?? []).length +
    (content.match(/^- \[x\] \*\*(\d+)\./gm) ?? []).length;
}

function doneCount(content) {
  return (content.match(/^- \[x\] \*\*(\d+)\./gm) ?? []).length;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/* ── commands ─────────────────────────────────────────────────────────── */

function cmdList() {
  const files = listPlanFiles();
  if (files.length === 0) {
    console.log("Belum ada plan. Buat dengan: bun .agents/plans/plan.mjs new \"Judul\"");
    return;
  }
  const showAll = process.argv.includes("--all");
  const shown = files.filter((f) => showAll || getStatus(read(f)) !== "skipped");
  if (shown.length === 0) {
    console.log("Tidak ada plan yang ditampilkan (semua skipped). Gunakan: bun .agents/plans/plan.mjs list --all");
    return;
  }
  console.log(`Plan di .agents/plans/ (${shown.length}${files.length !== shown.length ? `, ${files.length - shown.length} skipped` : ""}):\n`);
  for (const f of shown) {
    const c = read(f);
    const status = getStatus(c);
    const done = doneCount(c);
    const total = itemCount(c);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const icon = { pending: "○", "in-progress": "▶", paused: "⏸", done: "✓", skipped: "⊘" }[status] ?? "?";
    console.log(`  ${icon} ${f}  [${status}] ${done}/${total} (${pct}%)`);
    console.log(`      ${getTitle(c)}`);
  }
  console.log("\nLihat detail: bun .agents/plans/plan.mjs status <file>");
  if (!showAll) console.log("Plan skipped disembunyikan — tampilkan semua: bun .agents/plans/plan.mjs list --all");
}

function nextPlanNumber() {
  // Nomor = max nomor yang sudah ada + 1 (bukan hitung file, supaya aman
  // walau ada nomor yang terlewat seperti PLAN-012 atau nomor tertinggi > jumlah file).
  const nums = listPlanFiles()
    .map((f) => f.match(/^PLAN-(\d{3})/)?.[1])
    .filter(Boolean)
    .map(Number);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function cmdNew(title) {
  if (!title) fail("Judul wajib diisi: bun .agents/plans/plan.mjs new \"Judul\"");
  const num = String(nextPlanNumber()).padStart(3, "0");
  const name = `PLAN-${num}-${slugify(title)}.md`;
  const today = new Date().toISOString().slice(0, 10);
  const body = `# ${title}

<!-- status: pending -->
<!-- dibuat: ${today} -->

> Kelola plan ini: \`bun .agents/plans/plan.mjs <cmd> ${num}\`
> (lihat \`bun .agents/plans/plan.mjs help\`)

## Langkah

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan \`bun .agents/plans/plan.mjs note ${num} <no> "teks"\`)_

`;
  write(name, body);
  console.log(`✓ Plan dibuat: .agents/plans/${name}`);
  console.log("  Isi langkah-langkahnya dengan mengedit file tersebut, lalu jalankan:");
  console.log(`  bun .agents/plans/plan.mjs start ${num}`);
}

function cmdSetStatus(arg, status, verb) {
  const f = resolveFile(arg);
  if (!f) fail(`Plan tidak ditemukan: ${arg}. Coba: bun .agents/plans/plan.mjs list`);
  const c = setStatus(read(f), status);
  write(f, c);
  console.log(`✓ ${verb}: ${f} → ${status}`);
}

function cmdStatus(arg) {
  if (!arg) {
    cmdList();
    return;
  }
  const f = resolveFile(arg);
  if (!f) fail(`Plan tidak ditemukan: ${arg}`);
  const c = read(f);
  console.log(`${getTitle(c)}  [${getStatus(c)}]`);
  console.log(`  File: .agents/plans/${f}\n`);
  for (const line of c.split("\n")) {
    const m = line.match(/^- \[( |x)\] \*\*(\d+)\. (.*?)\*\*(?: — (.*))?$/);
    if (m) {
      const done = m[1] === "x";
      console.log(`  ${done ? "✓" : "○"} ${m[2]}. ${m[3]}${m[4] ? " — " + m[4] : ""}`);
    }
  }
  const done = doneCount(c);
  const total = itemCount(c);
  console.log(`\n  Progres: ${done}/${total} langkah selesai`);
}

function cmdToggle(arg, noStr, check) {
  const f = resolveFile(arg);
  if (!f) fail(`Plan tidak ditemukan: ${arg}`);
  const no = Number(noStr);
  if (!Number.isInteger(no) || no < 1) fail("Nomor langkah harus angka (>= 1)");
  const mark = check ? "x" : " ";
  const c = read(f);
  const re = new RegExp(`^- \\[${check ? " " : "x"}\\] \\*\\*${no}\\.`, "m");
  if (!re.test(c)) fail(`Langkah #${no} tidak ditemukan di ${f} (atau sudah ${check ? "selesai" : "belum selesai"})`);
  const next = c.replace(re, `- [${mark}] **${no}.`);
  write(f, next);
  console.log(`✓ Langkah #${no} ${check ? "ditandai SELESAI" : "dikembalikan ke belum selesai"}: ${f}`);
}

function cmdNote(arg, noStr, text) {
  const f = resolveFile(arg);
  if (!f) fail(`Plan tidak ditemukan: ${arg}`);
  const no = Number(noStr);
  if (!Number.isInteger(no) || no < 1) fail("Nomor langkah harus angka (>= 1)");
  if (!text) fail('Catatan wajib diisi dengan tanda kutip: note <file> <no> "teks"');
  const today = new Date().toISOString().slice(0, 10);
  const c = read(f);
  const line = `- **${no}.** ${today}: ${text}`;
  if (c.includes(`## Catatan Revisi`)) {
    const marker = c.includes("- _(belum ada catatan")
      ? /- _\(belum ada catatan[^\n]*\)_\n?/
      : null;
    const next = marker
      ? c.replace(marker, `${line}\n`)
      : c.replace(/(## Catatan Revisi\n)/, `$1${line}\n`);
    write(f, next);
  } else {
    write(f, `${c.trim()}\n\n## Catatan Revisi\n\n${line}\n`);
  }
  console.log(`✓ Catatan ditambahkan ke langkah #${no} (${f})`);
}

function cmdNotes(arg) {
  const f = resolveFile(arg);
  if (!f) fail(`Plan tidak ditemukan: ${arg}`);
  const c = read(f);
  const idx = c.indexOf("## Catatan Revisi");
  console.log(`Catatan revisi — ${f}\n`);
  if (idx === -1) {
    console.log("  (belum ada catatan)");
    return;
  }
  const notes = c
    .slice(idx)
    .split("\n")
    .filter((l) => /^- \*\*\d+\.\*\*/.test(l))
    .map((l) => l.replace(/^- \*\*(\d+)\.\*\* /, "  #$1  "));
  console.log(notes.length ? notes.join("\n") : "  (belum ada catatan)");
}

function cmdHelp() {
  const m = readFileSync(fileURLToPath(import.meta.url), "utf8").match(/\/\* =+([\s\S]*?)=+ \*\//);
  if (m) {
    process.stdout.write(m[1].replace(/^\s*\* ?/gm, "").trim() + "\n");
  }
}

/* ── main ─────────────────────────────────────────────────────────────── */

const [cmd, a, b, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "list":
    cmdList();
    break;
  case "new":
    cmdNew(a);
    break;
  case "start":
    cmdSetStatus(a, "in-progress", "Mulai");
    break;
  case "pause":
    cmdSetStatus(a, "paused", "Jeda");
    break;
  case "stop":
    cmdSetStatus(a, "done", "Selesai");
    break;
  case "skip":
    cmdSetStatus(a, "skipped", "Tandai SKIP");
    break;
  case "status":
    cmdStatus(a);
    break;
  case "check":
    cmdToggle(a, b, true);
    break;
  case "uncheck":
    cmdToggle(a, b, false);
    break;
  case "note":
    cmdNote(a, b, rest.join(" "));
    break;
  case "notes":
    cmdNotes(a);
    break;
  case "help":
  case "-h":
  case "--help":
    cmdHelp();
    break;
  default:
    console.error(`Perintah tidak dikenal: ${cmd ?? "(kosong)"}`);
    cmdHelp();
    process.exit(1);
}
