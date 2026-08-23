#!/usr/bin/env node
/**
 * ============================================================
 * KotaKata.AI — Audit Bug Otomatis (`npm run audit:bugs`)
 * ============================================================
 * Pengecekan statis untuk pola-pola bug logic/tampilan/UX yang
 * pernah menyebabkan masalah nyata di project ini:
 *
 *   1. window./document. TANPA guard platform (aturan #5b — kasus
 *      PLAN-076: Hermes punya window tapi tidak punya fungsi browser).
 *   2. window.addEventListener TANPA cek fungsi eksplisit.
 *   3. Alert.alert — NO-OP di react-native-web (dialog tidak muncul).
 *   4. setInterval TANPA clearInterval di file yang sama (timer leak).
 *   5. `catch {}` kosong tanpa komentar "// abaikan" (aturan #7).
 *   6. console.log tersisa (harusnya loggerDebug dkk.).
 *   7. TODO/FIXME/HACK yang menandakan pekerjaan belum selesai.
 *
 * Pemakaian:
 *   npm run audit:bugs          → laporan penuh
 *   node scripts/audit-bugs.mjs --quiet   → hanya ringkasan
 *
 * Exit code SELALU 0 (alat pelaporan, bukan gate CI) — baca outputnya.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const quiet = process.argv.includes("--quiet");

/** Kumpulkan semua file .ts/.tsx di src (rekursif). */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);

// ── Aturan deteksi ────────────────────────────────────────────
// severity: KRITIS | SEDANG | MINOR
const findings = [];

function add(severity, file, line, rule, message, snippet = "") {
  findings.push({ severity, file: relative(ROOT, file), line, rule, message, snippet });
}

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    let code = raw;

    // Lewati blok komentar /* ... */ lintas baris.
    if (inBlockComment) {
      const endIdx = code.indexOf("*/");
      if (endIdx === -1) continue;
      code = code.slice(endIdx + 2);
      inBlockComment = false;
    }
    const openIdx = code.indexOf("/*");
    if (openIdx !== -1 && !code.slice(0, openIdx).includes("*/")) {
      code = code.slice(0, openIdx);
      inBlockComment = true;
    }
    // Buang komentar satu baris.
    const commentIdx = code.indexOf("//");
    const comment = commentIdx !== -1 ? code.slice(commentIdx) : "";
    code = commentIdx !== -1 ? code.slice(0, commentIdx) : code;
    // Buang string literal sederhana agar tidak false-positive.
    const noStr = code.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

    // 1) window./document. tanpa guard platform di sekitar (±6 baris).
    const webApiMatch = noStr.match(/\b(window|document)\.\w+/);
    if (
      webApiMatch &&
      !/Platform\.OS|isWeb/.test(noStr)
    ) {
      const ctxStart = Math.max(0, i - 6);
      const ctxEnd = Math.min(lines.length, i + 7);
      const context = lines.slice(ctxStart, ctxEnd).join("\n");
      if (!/Platform\.OS\s*[!=]==?\s*["']web["']|typeof\s+window|typeof\s+document|isWeb\b/.test(context)) {
        add("SEDANG", file, lineNo, "WEB-API-TANPA-GUARD",
          `${webApiMatch[0]} dipakai tanpa guard Platform.OS/typeof di ±6 baris (aturan #5b)`, raw.trim());
      }
    }

    // 2) window.addEventListener tanpa cek fungsi eksplisit.
    if (/window\.addEventListener\(/.test(noStr) && !/addEventListener\s*===?\s*["']function["']|Platform\.OS\s*===\s*["']web["']/.test(noStr)) {
      const ctxStart = Math.max(0, i - 4);
      const ctxEnd = Math.min(lines.length, i + 3);
      const context = lines.slice(ctxStart, ctxEnd).join("\n");
      if (!/Platform\.OS\s*===\s*["']web["']|addEventListener\s*===\s*["']function["']/.test(context)) {
        add("KRITIS", file, lineNo, "ADD-EVENTLER-TANPA-CEK-FUNGSI",
          "window.addEventListener tanpa cek fungsi eksplisit — crash di Hermes", raw.trim());
      }
    }

    // 3) Alert.alert — no-op di react-native-web.
    if (/Alert\.alert\s*\(/.test(noStr)) {
      add("KRITIS", file, lineNo, "ALERT-WEB-NOOP",
        "Alert.alert tidak menampilkan apa pun di web — pakai AppModal/ConfirmDialog", raw.trim());
    }

    // 5) catch kosong TANPA komentar alasan di dalamnya (aturan #7).
    //    Komentar penjelasan apa pun diterima — tidak harus kata "abaikan".
    if (/^\s*\}\s*catch\s*(\(\s*\w*\s*\))?\s*\{\s*$/.test(raw)) {
      const next = lines[i + 1] ?? "";
      const afterNext = lines[i + 2] ?? "";
      const isEmptyEnd = /^\s*\}\s*$/.test(next);
      const isCommentThenEnd = /^\s*\/\/[^/]/.test(next) && /^\s*\}\s*$/.test(afterNext);
      if (isEmptyEnd) {
        add("MINOR", file, lineNo, "CATCH-KOSONG",
          "catch kosong tanpa komentar alasan (aturan #7)", raw.trim());
      }
    }

    // 6) console.log tersisa.
    if (/\bconsole\.log\s*\(/.test(noStr)) {
      add("MINOR", file, lineNo, "CONSOLE-LOG",
        "console.log tersisa — gunakan loggerDebug/loggerInfo (aturan #7)", raw.trim());
    }

    // 7) TODO/FIXME/HACK.
    const todo = comment.match(/\b(TODO|FIXME|HACK)\b/);
    if (todo) {
      add("MINOR", file, lineNo, "TODO-FIXME",
        `${todo[1]} tertinggal — pastikan bukan pekerjaan yang menggantung`, raw.trim());
    }

    void comment; // reserved
  }

  // 4) setInterval tanpa clearInterval di file yang sama.
  const content = lines.join("\n");
  const si = (content.match(/setInterval\(/g) ?? []).length;
  const sc = (content.match(/clearInterval\(/g) ?? []).length;
  if (si > sc) {
    const firstLine = content.split("\n").findIndex((l) => l.includes("setInterval(")) + 1;
    add("SEDANG", file, firstLine, "TIMER-LEAK",
      `setInterval (${si}x) lebih banyak dari clearInterval (${sc}x) di file ini`, "");
  }
}

// ── Laporan ──────────────────────────────────────────────────
const ORDER = { KRITIS: 0, SEDANG: 1, MINOR: 2 };
findings.sort(
  (a, b) => ORDER[a.severity] - ORDER[b.severity] || a.file.localeCompare(b.file) || a.line - b.line,
);

const ICON = { KRITIS: "🔴", SEDANG: "🟡", MINOR: "🟢" };

console.log("\n🔍 AUDIT BUG — KotaKata.AI");
console.log(`   ${files.length} file diperiksa · ${findings.length} temuan\n`);

let lastSeverity = null;
for (const f of findings) {
  if (!quiet) {
    if (f.severity !== lastSeverity) {
      lastSeverity = f.severity;
      console.log(`${ICON[f.severity]} ─── ${f.severity} ───`);
    }
    console.log(`  ${f.file}:${f.line}  [${f.rule}]`);
    console.log(`     ${f.message}`);
    if (f.snippet) console.log(`     > ${f.snippet.slice(0, 120)}`);
    console.log("");
  }
}

const bySev = (s) => findings.filter((f) => f.severity === s).length;
console.log("═══════════════════════════════════");
console.log(`Ringkasan: 🔴 KRITIS ${bySev("KRITIS")} · 🟡 SEDANG ${bySev("SEDANG")} · 🟢 MINOR ${bySev("MINOR")}`);
console.log("Jalankan ulang kapan saja: npm run audit:bugs");
