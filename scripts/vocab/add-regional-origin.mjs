// ============================================================
// [DINONAKTIFKAN — PLAN-047] Tambahkan keterangan asal BAHASA DAERAH
// ke clue_1 soal.
//
// PLAN-047 (2026-08-17): pemilik TIDAK SUKA clue berawalan "Kata serapan
// dari bahasa X:" / "Kata dari bahasa X:" → semua tag asal bahasa dihapus
// dari vocabulary. Script ini sengaja di-nonaktifkan agar tag TIDAK muncul
// lagi. JANGAN diaktifkan kembali tanpa persetujuan pemilik.
//
// Sejarah: dibuat untuk PLAN-005 (sisa yang di-defer) — menandai kata dari
// bahasa daerah Nusantara (Jawa, Sunda, Minangkabau, dll) di clue.
//
// Usage (tidak berlaku lagi — selalu no-op):
//   node scripts/vocab/add-regional-origin.mjs [--apply]
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// PLAN-047: nonaktif — jangan pernah menambahkan tag asal bahasa lagi.
console.warn("[PLAN-047] add-regional-origin.mjs DINONAKTIFKAN — tag asal bahasa sudah dihapus. Keluar tanpa perubahan.");
process.exit(0);

const APPLY = process.argv.includes("--apply");

// word -> bahasa daerah (hasil kurasi manual + verifikasi KBBI)
const REGIONAL = {
  // ---- Jawa ----
  jun: "Jawa", // buyung; tempayan kecil dari tanah
  gun: "Jawa", // serit pada perkakas tenun
  gus: "Jawa", // nama panggilan kepada laki-laki
  meri: "Jawa", // anak itik
  kelabang: "Jawa", // lipan; kepang
  sungkawa: "Jawa", // sedih hati; duka cita
  wanda: "Jawa", // ciri wayang
  germo: "Jawa", // induk semang pelacur; muncikari
  tumbal: "Jawa", // tolak bala
  gegabah: "Jawa", // terlampau berani; kurang hati-hati
  manggung: "Jawa", // berkicau (burung)
  rembulan: "Jawa", // bulan
  // ---- Sunda ----
  emang: "Sunda", // paman
  // ---- Minangkabau ----
  pindai: "Minangkabau", // memandangi; memindai
  making: "Minangkabau", // berbau busuk
};

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const HAS_ORIGIN = /(Kata (?:serapan|dari bahasa)|Berasal dari bahasa)\s+[A-Z]/;

const files = readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f));

const stats = { tagged: 0, skippedHasOrigin: 0, notFound: 0, perLang: {} };
const samples = [];

for (const f of files) {
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  let changed = 0;

  const out = src.replace(WORD_RE, (full, word, c1, c2, c3) => {
    const lang = REGIONAL[word];
    if (!lang) return full;
    if (HAS_ORIGIN.test(c1)) {
      stats.skippedHasOrigin++;
      return full;
    }
    const newC1 = `Kata dari bahasa ${lang}: ${c1}`;
    changed++;
    stats.tagged++;
    stats.perLang[lang] = (stats.perLang[lang] || 0) + 1;
    if (samples.length < 20) samples.push(`[${f}] "${word}" (${lang}) => ${newC1.slice(0, 75)}`);
    return `  ["${word}", "${esc(newC1)}", "${c2}", "${c3}"],`;
  });

  if (out !== src) {
    if (APPLY) writeFileSync(path, out);
    console.log(`${APPLY ? "✍" : "·"} ${f}: ${changed} kata diberi penanda asal bahasa daerah`);
  }
}

console.log("\n=== RINGKASAN ===");
console.log(`Tagged: ${stats.tagged} | Sudah ada penanda (skip): ${stats.skippedHasOrigin}`);
console.log("Per bahasa:", JSON.stringify(stats.perLang));
if (!APPLY) {
  console.log("\nSample (dry-run, belum ditulis):");
  samples.forEach((s) => console.log("  " + s));
  console.log('\nJalankan dengan --apply untuk menulis perubahan ke file.');
}
