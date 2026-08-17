// ============================================================
// PLAN-047: Perbaiki issue QA check-clue-quality yang tersisa
// (15 issue: c1==c2 persis / c1 memuat c2) di tier 2, 6, 7, 8, 9, 10.
// Target akhir: check-clue-quality 0 issue semua tier.
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// word -> [c1, c2, c3] BARU (nilai null = biarkan kolom lama)
const FIXES = {
  // ---- tier2.ts ----
  kitab: [null, "buku suci yang berisi wahyu", null],
  emang: [null, "sebutan untuk paman", null],
  kapel: [null, null, "Sinonim: rumah ibadah"],
  // ---- tier6.ts ----
  komposisi: [null, "susunan bagian-bagian", null],
  infanteri: [null, null, "pasukan darat yang bertempur dengan berjalan kaki"],
  proyektil: [null, "peluru yang dilontarkan dari senjata api", null],
  // ---- tier7.ts ----
  kalkulator: [null, "mesin untuk menghitung", null],
  artifisial: [null, "buatan manusia; bukan asli", null],
  korsleting: [null, "hubungan pendek pada arus listrik", null],
  // ---- tier8.ts ----
  notifikasi: [null, null, "kabar pemberitahuan resmi"],
  // ---- tier9.ts ----
  arbitrase: [null, "perwasitan untuk menyelesaikan sengketa", null],
  disposisi: [null, "catatan arahan pejabat pada surat dinas", null],
  // ---- tier10.ts ----
  miliuner: [null, "orang yang kekayaannya berjumlah jutaan", null],
  praktisi: ["orang yang menjalankan suatu profesi", null, "Sinonim: pelaksana"],
  aklamasi: [null, null, "persetujuan bulat tanpa pemungutan suara"],
};

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const files = ["tier2.ts", "tier6.ts", "tier7.ts", "tier8.ts", "tier9.ts", "tier10.ts"];
let fixed = 0;

for (const f of files) {
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  const newFix = FIXES;
  let out = src.replace(WORD_RE, (full, word, c1, c2, c3) => {
    const fx = newFix[word];
    if (!fx) return full;
    const n1 = fx[0] ?? c1;
    const n2 = fx[1] ?? c2;
    const n3 = fx[2] ?? c3;
    fixed++;
    return `  ["${word}", "${esc(n1)}", "${esc(n2)}", "${esc(n3)}"],`;
  });
  if (out !== src) {
    writeFileSync(path, out);
    console.log(`✍ ${f}: diperbarui`);
  }
}

console.log(`\n=== Total kata diperbaiki: ${fixed} ===`);
const remaining = Object.keys(FIXES).filter(
  (w) => !files.some((f) => {
    const src = readFileSync(join(vocabDir, f), "utf8");
    return src.includes(`"${w}"`);
  }),
);
if (remaining.length) console.warn("PERINGATAN: kata tidak ditemukan di file:", remaining.join(", "));
