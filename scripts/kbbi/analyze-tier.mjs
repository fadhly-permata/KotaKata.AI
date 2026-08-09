// Analisis kualitas clue pada file tier vocabulary. Tidak mengubah apa pun.
// Penggunaan: node scripts/analyze-tier.mjs <path-tier>
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "src/data/vocabulary/tier1.ts";
const src = readFileSync(path, "utf8");

// Ambil baris tuple ["kata", "c1", "c2", "c3"]
const rows = [...src.matchAll(/^\s*\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]\s*,?\s*$/gm)].map(
  (m) => ({ kata: m[1], c1: m[2], c2: m[3], c3: m[4] }),
);

let sampah = 0;
let dup = 0;
let sebutJawab = 0;
let singkatan = 0;
let kosong = 0;
const sampahList = [];
const dupList = [];
const sebutList = [];
const singList = [];

for (const { kata, c1, c2, c3 } of rows) {
  const all = [c1, c2, c3].join(" | ");
  // Clue sampah: bocoran format builder lama
  if (/Merupakan kata|Kata berawalan|huruf terakhir|\b\d+ huruf\b|berawalan/i.test(all)) {
    sampah++;
    if (sampahList.length < 20) sampahList.push(`${kata}: ${all.slice(0, 100)}`);
  }
  // Duplikat clue1 == clue2
  if (c1.trim() === c2.trim() && c1.trim().length > 3) {
    dup++;
    if (dupList.length < 20) dupList.push(kata);
  }
  // Clue menyebut kata jawaban (kata utuh ≥ 3 huruf, sebagai kata utuh)
  const kw = kata.toLowerCase();
  if (kw.length >= 3) {
    const words = new Set(all.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    if (words.has(kw)) {
      sebutJawab++;
      if (sebutList.length < 20) sebutList.push(`${kata}: ${all.slice(0, 100)}`);
    }
  }
  // Singkatan editor
  if (/\bpd\b|\bdl\b|\bthd\b|\bdp\b|\bdsb\b|\bthdp\b/i.test(all)) {
    singkatan++;
    if (singList.length < 20) singList.push(`${kata}: ${all.slice(0, 80)}`);
  }
  if (!c1.trim() || !c2.trim() || !c3.trim()) kosong++;
}

console.log(`FILE: ${path}`);
console.log(`TOTAL baris ter-parse: ${rows.length}`);
console.log(`clue sampah (bocor builder): ${sampah}`);
console.log(`clue1 == clue2 (duplikat): ${dup}`);
console.log(`clue menyebut kata jawaban: ${sebutJawab}`);
console.log(`singkatan pd/dl/thd/dp/dsb: ${singkatan}`);
console.log(`ada kolom kosong: ${kosong}`);
console.log("--- sampel clue sampah ---");
sampahList.forEach((s) => console.log("  ", s));
console.log("--- sampel duplikat ---");
dupList.forEach((s) => console.log("  ", s));
console.log("--- sampel sebut jawaban ---");
sebutList.forEach((s) => console.log("  ", s));
console.log("--- sampel singkatan ---");
singList.forEach((s) => console.log("  ", s));
