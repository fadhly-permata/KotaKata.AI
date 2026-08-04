// Builds src/data/vocabulary/tier1.ts — 100 soal TERKURASI.
// clue_1 = penjelasan utama, clue_2 = penjelasan lain (homograf/makna kedua),
// clue_3 = sinonim polos atau "Antonim: X". Sumber: dataset KBBI lokal.
// Usage: node scripts/build-tier1-curated.mjs [kbbi.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const kbbiPath = process.argv[2] ?? "/tmp/kbbi.json";
const outPath = join(ROOT, "src", "data", "vocabulary", "tier1.ts");

import { CURATED as CURATED_DATA } from "./tier1-data.mjs";

const j = JSON.parse(readFileSync(kbbiPath, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const modernize = (s) =>
  s
    .replace(/\byg\b/g, "yang")
    .replace(/\bdgn\b/g, "dengan")
    .replace(/\bdng\b/g, "dengan")
    .replace(/\btt\b/g, "tentang")
    .replace(/\bkpd\b/g, "kepada")
    .replace(/\bsbg\b/g, "sebagai")
    .replace(/\bdr\b/g, "dari")
    .replace(/\btsb\b/g, "tersebut")
    .replace(/\bspt\b/g, "seperti")
    .replace(/\bud\b/g, "untuk")
    .replace(/\bdll\b/g, "dan lain-lain")
    .replace(/\bdsb\b/g, "dan sebagainya");

// Bersihkan definisi mentah → kalimat clue yang rapi (tanpa contoh kalimat/turunan/kelas kata).
function cleanDef(raw) {
  let d = decode(raw)
    .replace(/<i>.*?<\/i>/g, " ") // kelas kata <i>v</i>, <i>n</i>, dst
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^\?/.test(d)) return ""; // crossref ("? 1kayak")
  // potong penomoran sense di awal: "1 ..." / "1) ..." / "(1) ..."
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  // potong contoh kalimat (titik dua diikuti huruf kecil, titik koma, atau ujung) & sense/turunan
  d = d.split(/:\s*(?=[a-z;]|$)/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "").replace(/;\s*\(\d+|;\s*\d+\)/i, "");
  d = d.replace(/\s*--\s*$/, "").replace(/:\s*$/, "").replace(/\s*[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  if (d.length > 90) d = `${d.slice(0, 87).trimEnd()}…`;
  return modernize(d);
}

// Ambil semua makna, DIPISAH per entri (homograf: tahu¹, tahu², ...).
// Returns: [ [def...], [def...], ... ] — satu array per entri KBBI.
function extractSensesByEntry(word) {
  const matches = entries.filter((e) => (e.word ?? "").trim().toLowerCase() === word);
  const out = [];
  for (const e of matches) {
    const arti = decode(e.arti ?? "");
    if (!arti) continue;
    const senses = [];
    const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const isPlain =
      (lines.length >= 2 && /^[a-z·.]+$/.test(lines[0])) ||
      /^[A-Z][a-z]+ \(kata/.test(lines[0] ?? "");
    if (isPlain) {
      let klass = "";
      for (const line of lines.slice(lines.length >= 2 && /^[a-z·.]+$/.test(lines[0]) ? 1 : 0)) {
        const cm = line.match(/^(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\([^)]*\))?\s*(.*)$/i);
        if (cm) {
          klass = cm[1].toLowerCase();
          const d = cleanDef(cm[2]);
          if (d) senses.push(d);
          continue;
        }
        const nm = line.match(/^\(?(\d+)\)?\s*(.*)$/);
        if (nm) {
          const d = cleanDef(nm[2]);
          if (d) senses.push(d);
        }
      }
      if (senses.length) out.push(senses);
      continue;
    }
    // ---- html ----
    const body = arti.replace(/^<b>.*?<\/b>\s*/i, "");
    if (/<b>\d+<\/b>/.test(body)) {
      for (const p of body.split(/<b>\d+<\/b>/).slice(1)) {
        const d = cleanDef(p);
        if (d) senses.push(d);
      }
    } else {
      const d = cleanDef(body);
      if (d) senses.push(d);
    }
    if (senses.length) out.push(senses);
  }
  // dedupe lintas entri (keep first)
  const seen = new Set();
  return out
    .map((arr) => {
      const uniq = [];
      for (const d of arr) {
        const k = d.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(d);
        }
      }
      return uniq;
    })
    .filter((a) => a.length > 0);
}

// word → [clue_3, clue_2Override?]
const CURATED = [
  ["dan", "Antonim: atau"],
  ["bisa", "dapat"],
  ["ada", "hadir", "mempunyai atau memiliki (uang dan sebagainya)"],
  ["akan", "hendak", "kata perangkai yang berarti 'kepada', menghubungkan verba dengan pelengkapnya"],
  ["mata", "Antonim: buta", "sesuatu yang menyerupai mata, seperti lubang kecil pada jarum"],
  ["batu", "Antonim: lunak", "akik atau batu permata untuk mata cincin"],
  ["tahu", "kenal", "makanan dari kedelai putih yang digiling halus, direbus, lalu dicetak"],
  ["satu", "Antonim: banyak", "urutan pertama sebelum angka dua"],
  ["hari", "Antonim: malam", "waktu selama matahari menerangi tempat kita, dari matahari terbit sampai terbenam"],
  ["kaya", "Antonim: miskin", "mempunyai banyak harta benda; makmur"],
  ["baik", "Antonim: buruk", "elok; patut; teratur (apik, rapi, tidak ada celanya)"],
  ["besar", "Antonim: kecil", "hebat; mulia; berkuasa (kiasan)"],
  ["kecil", "Antonim: besar", "tidak penting atau tidak berarti (tentang soal, masalah)"],
  ["lama", "Antonim: baru", "kuno; sudah tua (tentang barang, adat)"],
  ["baru", "Antonim: lama", "belum lama terjadi atau dipakai; segar; belum usang"],
  ["cepat", "Antonim: lambat"],
  ["lambat", "Antonim: cepat"],
  ["tinggi", "Antonim: rendah"],
  ["rendah", "Antonim: tinggi"],
  ["jauh", "Antonim: dekat"],
  ["dekat", "Antonim: jauh"],
  ["panas", "Antonim: dingin"],
  ["dingin", "Antonim: panas"],
  ["terang", "Antonim: gelap"],
  ["gelap", "Antonim: terang"],
  ["kering", "Antonim: basah"],
  ["basah", "Antonim: kering"],
  ["berat", "Antonim: ringan"],
  ["ringan", "Antonim: berat"],
  ["panjang", "Antonim: pendek"],
  ["pendek", "Antonim: panjang"],
  ["banyak", "Antonim: sedikit"],
  ["sedikit", "Antonim: banyak"],
  ["tua", "Antonim: muda"],
  ["muda", "Antonim: tua"],
  ["manis", "Antonim: pahit"],
  ["pahit", "Antonim: manis"],
  ["asin", "Antonim: tawar"],
  ["tawar", "Antonim: asin"],
  ["asam", "Antonim: basa"],
  ["pedas", "Antonim: tawar"],
  ["harum", "Antonim: busuk"],
  ["busuk", "Antonim: harum"],
  ["indah", "Antonim: buruk"],
  ["cantik", "Antonim: jelek"],
  ["jelek", "Antonim: bagus"],
  ["pintar", "pandai"],
  ["bodoh", "Antonim: pintar"],
  ["rajin", "Antonim: malas"],
  ["malas", "Antonim: rajin"],
  ["berani", "Antonim: takut"],
  ["takut", "Antonim: berani"],
  ["senang", "Antonim: sedih"],
  ["sedih", "Antonim: senang"],
  ["marah", "Antonim: tenang"],
  ["tenang", "Antonim: marah"],
  ["ramai", "Antonim: sepi"],
  ["sepi", "Antonim: ramai"],
  ["bersih", "Antonim: kotor"],
  ["kotor", "Antonim: bersih"],
  ["keras", "Antonim: lunak"],
  ["lunak", "Antonim: keras"],
  ["halus", "Antonim: kasar"],
  ["kasar", "Antonim: halus"],
  ["tajam", "Antonim: tumpul"],
  ["tumpul", "Antonim: tajam"],
  ["tebal", "Antonim: tipis"],
  ["tipis", "Antonim: tebal"],
  ["lebar", "Antonim: sempit"],
  ["sempit", "Antonim: lebar"],
  ["dalam", "Antonim: dangkal"],
  ["atas", "Antonim: bawah"],
  ["bawah", "Antonim: atas"],
  ["kiri", "Antonim: kanan"],
  ["kanan", "Antonim: kiri"],
  ["uang", "duit"],
  ["air", "Antonim: api"],
  ["api", "Antonim: air"],
  ["tanah", "Antonim: langit"],
  ["hujan", "Antonim: kemarau"],
  ["bulan", "Antonim: matahari"],
  ["laut", "Antonim: darat"],
  ["kota", "Antonim: desa"],
  ["desa", "Antonim: kota"],
  ["rumah", "gedung"],
  ["jalan", "Antonim: berhenti"],
  ["makan", "Antonim: puasa"],
  ["tidur", "Antonim: bangun"],
  ["buka", "Antonim: tutup"],
  ["tutup", "Antonim: buka"],
  ["lahir", "Antonim: batin"],
  ["mati", "Antonim: hidup"],
  ["hidup", "Antonim: mati"],
  ["maju", "Antonim: mundur"],
  ["mudah", "Antonim: sulit"],
  ["sulit", "Antonim: mudah"],
  ["benar", "Antonim: salah"],
  ["salah", "Antonim: benar"],
  ["kalah", "Antonim: menang"],
  ["menang", "Antonim: kalah"],
];

// ---------------------------------------------------------------- build
const errors = [];
const rows = [];
for (const [word, clue3, c2Override, c1Override] of CURATED_DATA) {
  const byEntry = extractSensesByEntry(word);
  const flat = byEntry.flat();
  const clue1 = c1Override ?? flat[0];
  let clue2 = c2Override;
  if (!clue2) clue2 = byEntry[1]?.[0] ?? byEntry[0]?.[1] ?? flat[1];
  if (clue2 === clue1) clue2 = undefined;
  if (!clue1) errors.push(`${word}: tanpa clue_1`);
  if (!clue2) errors.push(`${word}: tanpa clue_2 (${JSON.stringify(flat.slice(0, 3))})`);
  if (clue1 && clue2) {
    const esc = (s) => s.replace(/"/g, '\\"');
    rows.push(`  ["${word}", "${esc(clue1)}", "${esc(clue2)}", "${esc(clue3)}"],`);
  }
}

const out = `// Tier 1 — 100 soal TERKURASI (KBBI, dataset lokal).
// Format: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].
export const TIER_1_WORDS: [string, string, string, string][] = [
${rows.join("\n")}
];
`;

writeFileSync(outPath, out);
console.log(`OK — ${rows.length} kata → ${outPath}`);
if (errors.length) {
  console.error("MASALAH:");
  errors.slice(0, 40).forEach((e) => console.error("  -", e));
}
console.log("\n=== SAMPLE ===");
rows.slice(0, 15).forEach((r) => console.log(r));
