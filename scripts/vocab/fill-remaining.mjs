// ============================================================
// KotaKata AI — Isi sisa placeholder "Merupakan kata X" di tier 6–10.
//
// Sisa 327 kata ultra-langka berdefinisi tunggal: KBBI lokal & web
// tidak menyediakan bahan untuk c2/c3 (senses kosong, tanpa contoh),
// sehingga generator otomatis research-clues.mjs tidak sanggup.
// Map kurasi di scripts/vocab/remaining/*.mjs mengisi c2/c3 dari
// pengetahuan umum yang TIDAK bocor jawaban, TIDAK duplikat/substring
// antar kolom, dan TIDAK memakai pola "Merupakan kata X".
//
// Usage:
//   node scripts/vocab/fill-remaining.mjs          # dry-run: report + validate
//   node scripts/vocab/fill-remaining.mjs --apply  # tulis balik ke tier files
//   node scripts/vocab/fill-remaining.mjs --tier=8 # hanya tier tertentu
//   node scripts/vocab/fill-remaining.mjs --sql    # + regenerate vocabulary.sql
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import { REMAINING_T10 } from "./remaining/tier10.mjs";
import { REMAINING_T9 } from "./remaining/tier9.mjs";
import { REMAINING_T8A } from "./remaining/tier8a.mjs";
import { REMAINING_T8B } from "./remaining/tier8b.mjs";
import { REMAINING_T7 } from "./remaining/tier7.mjs";
import { REMAINING_T6 } from "./remaining/tier6.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const VOCAB_DIR = join(ROOT, "src", "data", "vocabulary");

const ALL = { ...REMAINING_T10, ...REMAINING_T9, ...REMAINING_T8A, ...REMAINING_T8B, ...REMAINING_T7, ...REMAINING_T6 };

const flag = (name) => process.argv.includes(`--${name}`);
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
};
const APPLY = flag("apply");
const WITH_SQL = flag("sql");
const TIER_FILTER = arg("tier", "");

// ---------------------------------------------------------------- row regex (sama dgn checker)
const ROW_RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;

// ROW_RE menangkap teks VERBATIM (sudah ber-escape seperti di file). Map
// kurasi di bawah TIDAK memakai tanda kutip ganda/backslash, jadi penulisan
// balik dilakukan verbatim tanpa escape ulang (menghindari double-escape).
const esc = (s) => s; // verbatim: konten kurasi bebas \" dan \\

// ---------------------------------------------------------------- QA rules (mirror check-clue-quality + research-clues)
const wb = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");

function leaksAnswer(clue, word) {
  if (!clue) return false;
  return wb(word).test(clue);
}

function hasUnbalancedParen(t) {
  if (!t) return false;
  let depth = 0;
  for (const ch of t) {
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth < 0) return true;
    }
  }
  return depth !== 0;
}

/** Duplikat QA: sama persis, atau salah satu memuat yang lain bila KEDUANYA >= 12 huruf. */
function qaDup(a, b) {
  if (!a || !b) return false;
  const A = a.trim();
  const B = b.trim();
  if (A === B) return true;
  if (A.length >= 12 && B.length >= 12 && (A.includes(B) || B.includes(A))) return true;
  return false;
}

const BAD_PREFIX = /^(merupakan kata|hal yang berkaitan dengan|berkaitan dengan adanya|berkaitan dengan kegiatan)/i;
const SINONIM_C1 = /^(sinonim|antonim)\s*[:—–-]/i;
const LEAK_RE = /Kata berawalan|Berawalan huruf|berakhir huruf|huruf terakhir|berjumlah\s*\d+\s*huruf|\b\d+\s*huruf\b/i;
const TAUTOLOGY_RE = /^(bersifat|keadaan yang) [a-z·]{2,16}$/i;
const BROKEN_FRAG_RE = /^[a-z·]{1,16}[),;:]$/i;

function isJunk(t) {
  if (!t) return true;
  const s = t.trim();
  if (s.length < 4) return true;
  if (BROKEN_FRAG_RE.test(s)) return true;
  if (hasUnbalancedParen(s)) return true;
  if (/^(kata kerja|kata benda|kata sifat|kata keterangan|sebagainya|dan sebagainya|dan lain|verba|nomina|adjektiva|adverbia)\b/i.test(s)) return true;
  if (/^[a-z·]{2,16}\s*\)/.test(s)) return true;
  if (/\s-{1,2}\s/.test(s)) return true;
  return false;
}

function validateSet(word, c1, c2, c3) {
  const cols = [c1, c2, c3];
  if (cols.some((c) => !c || !c.trim())) return "ada kolom kosong";
  if (cols.some((c) => c.trim().length < 4)) return "ada kolom terlalu pendek";
  if (cols.some((c) => leaksAnswer(c, word))) return "bocor jawaban";
  if (cols.some((c) => hasUnbalancedParen(c))) return "kurung tidak seimbang";
  if (cols.some((c) => isJunk(c))) return "kolom junk";
  if (cols.some((c) => LEAK_RE.test(c))) return "kolom memuat pola bocor";
  if (cols.some((c) => BAD_PREFIX.test(c))) return "kolom placeholder/fallback";
  if (cols.some((c) => /^merupakan kata/i.test(c))) return "masih placeholder";
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      if (qaDup(cols[i], cols[j])) return `c${i + 1} duplikat c${j + 1}`;
    }
  if (SINONIM_C1.test(c1)) return "c1 berformat Sinonim/Antonim";
  // c2/c3 tidak boleh tautologi pendek atau fallback lemah
  if (cols.slice(1).some((c) => TAUTOLOGY_RE.test(c))) return "c2/c3 tautologi";
  return null;
}

// ---------------------------------------------------------------- baca tier files
const tierFiles = readdirSync(VOCAB_DIR)
  .filter((f) => /^tier(\d+)(?:[ab]|-part\d+)?\.ts$/.test(f))
  .sort((a, b) => {
    const key = (f) => {
      const m = f.match(/^tier(\d+)(?:([ab])|-part(\d+))?\.ts$/);
      const tier = Number(m[1]);
      const kind = m[2] ? 1 : m[3] ? 2 : 0;
      const num = m[2] ? (m[2] === "a" ? 1 : 2) : m[3] ? Number(m[3]) : 0;
      return [tier, kind, num];
    };
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });

const rowsByFile = new Map();
for (const f of tierFiles) {
  const src = readFileSync(join(VOCAB_DIR, f), "utf8");
  const rows = [...src.matchAll(ROW_RE)].map((m) => ({ word: m[1], c1: m[2], c2: m[3], c3: m[4], lineIdx: src.slice(0, m.index).split("\n").length - 1 }));
  rowsByFile.set(f, { src, rows });
}

// ---------------------------------------------------------------- main
const report = { total: 0, ok: 0, skipped: 0, issues: [], changes: [] };
const tierNum = (f) => Number(f.match(/^tier(\d+)/)[1]);

for (const [f, { rows }] of rowsByFile) {
  if (TIER_FILTER && tierNum(f) !== Number(TIER_FILTER)) continue;
  for (const r of rows) {
    const override = ALL[r.word];
    if (!override) continue;
    report.total++;

    let c1 = r.c1;
    let c2;
    let c3;
    if (override.length === 3) {
      [c1, c2, c3] = override;
    } else if (override.length === 2) {
      [c2, c3] = override;
    } else {
      report.issues.push(`${r.word}: override format salah (harus 2 atau 3 kolom)`);
      continue;
    }

    const err = validateSet(r.word, c1, c2, c3);
    if (err) {
      report.issues.push(`${r.word} (t${tierNum(f)}): ${err} — "${c1}" | "${c2}" | "${c3}"`);
      continue;
    }

    const changed = c1 !== r.c1 || c2 !== r.c2 || c3 !== r.c3;
    if (changed) report.changes.push({ file: f, lineIdx: r.lineIdx, word: r.word, tier: tierNum(f), new: [c1, c2, c3] });
    report.ok++;
  }
}

console.log(`Target: ${report.total} kata`);
console.log(`OK (valid + berubah): ${report.changes.length}`);
console.log(`Skipped (tidak berubah/valid): ${report.ok - report.changes.length}`);
console.log(`Issues: ${report.issues.length}`);
for (const i of report.issues.slice(0, 40)) console.log(`  ⚠ ${i}`);

// ---------------------------------------------------------------- apply
if (APPLY && report.changes.length) {
  const byFile = new Map();
  for (const ch of report.changes) {
    if (!byFile.has(ch.file)) byFile.set(ch.file, []);
    byFile.get(ch.file).push(ch);
  }
  for (const [f, list] of byFile) {
    const lines = readFileSync(join(VOCAB_DIR, f), "utf8").split("\n");
    for (const ch of list) {
      const [c1, c2, c3] = ch.new;
      lines[ch.lineIdx] = `  ["${esc(ch.word)}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`;
    }
    writeFileSync(join(VOCAB_DIR, f), lines.join("\n"));
    console.log(`  ✓ ${f}: ${list.length} baris diperbarui`);
  }
}

if (APPLY && WITH_SQL) {
  console.log("  ↻ regenerate supabase/data/vocabulary.sql …");
  execSync(`node ${join(__dirname, "gen-vocab-sql.mjs")}`, { stdio: "inherit" });
  console.log("  ✓ SQL regenerated");
}

if (!APPLY && report.changes.length) {
  console.log(`\nℹ️  ${report.changes.length} perbaikan SIAP — jalankan dengan --apply untuk menulis balik.`);
}
