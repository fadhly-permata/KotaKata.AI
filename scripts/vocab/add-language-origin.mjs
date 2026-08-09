// ============================================================
// Tambahkan keterangan asal bahasa ke clue_1 soal kata serapan.
//
// Item #1 PLAN-005: "banyak soal bukan berbahasa indonesia, tapi
// clue 1, 2, 3 gak menyebutkan bahasa tersebut berasal dari bahasa
// apa." Script ini memakai peta terkurasi scripts/vocab/etymology-data.mjs
// untuk menambah prefix "Kata serapan dari bahasa X: " ke clue_1.
//
// Presisi dijaga ketat: hanya kata yang asal bahasanya YAKIN yang ada
// di peta; kata Melayu asli / bahasa daerah TIDAK ikut.
//
// Usage:
//   bun scripts/vocab/add-language-origin.mjs            # dry-run (laporan)
//   bun scripts/vocab/add-language-origin.mjs --apply    # tulis file
//   bun scripts/vocab/add-language-origin.mjs --tier=5   # batasi ke tier tertentu
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWordToLang } from "./etymology-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const APPLY = process.argv.includes("--apply");
const tierArg = process.argv.find((a) => /^--tier=\d+$/.test(a));
const ONLY_TIER = tierArg ? Number(tierArg.split("=")[1]) : null;

const wordToLang = buildWordToLang();

// Regex baris data (identik dengan fix-tier6-10.mjs).
const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

// Escape backslash dulu, baru quote — supaya `"` yang sudah ada jadi `\"` (valid TS).
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// Penanda yang sudah ada di clue (jangan dobel).
const HAS_ORIGIN = /(Kata serapan dari bahasa|Berasal dari bahasa)\s+[A-Z]/i;

// Kata yang TIDAK BOLEH diberi prefix: prefix "Kata serapan dari bahasa X"
// memuat kata jawaban itu sendiri → bocor jawaban di clue (mis. "bahasa").
const EXCLUDE = new Set(["bahasa"]);

const files = readdirSync(vocabDir)
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
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });

const stats = { tagged: 0, skippedHasOrigin: 0, perLang: {}, perTier: {} };
const samples = [];

for (const f of files) {
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  if (ONLY_TIER && tier !== ONLY_TIER) continue;
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  let changed = 0;

  const out = src.replace(WORD_RE, (full, word, c1, c2, c3) => {
    const lang = wordToLang.get(word);
    if (!lang) return full;
    if (EXCLUDE.has(word)) return full;
    if (HAS_ORIGIN.test(c1)) {
      stats.skippedHasOrigin++;
      return full;
    }
    const newC1 = `Kata serapan dari bahasa ${lang}: ${c1}`;
    changed++;
    stats.tagged++;
    stats.perLang[lang] = (stats.perLang[lang] || 0) + 1;
    stats.perTier[`tier${tier}`] = (stats.perTier[`tier${tier}`] || 0) + 1;
    if (samples.length < 25) samples.push(`[${f}] "${word}" (${lang}) => ${newC1.slice(0, 80)}`);
    return `  ["${word}", "${esc(newC1)}", "${c2}", "${c3}"],`;
  });

  if (out !== src) {
    if (APPLY) {
      writeFileSync(path, out);
      console.log(`${APPLY ? "✍" : "·"} ${f}: ${changed} kata diberi penanda asal bahasa`);
    } else {
      console.log(`· ${f}: ${changed} kata AKAN diberi penanda asal bahasa (dry-run)`);
    }
  } else {
    console.log(`· ${f}: tidak ada perubahan`);
  }
}

console.log("\n=== RINGKASAN ===");
console.log(`Tagged: ${stats.tagged} kata | Sudah ada penanda (skip): ${stats.skippedHasOrigin}`);
console.log("Per bahasa:", JSON.stringify(stats.perLang));
console.log("Per tier:", JSON.stringify(stats.perTier));
if (!APPLY) {
  console.log("\nSample (dry-run, belum ditulis):");
  samples.forEach((s) => console.log("  " + s));
  console.log('\nJalankan dengan --apply untuk menulis perubahan ke file.');
}
