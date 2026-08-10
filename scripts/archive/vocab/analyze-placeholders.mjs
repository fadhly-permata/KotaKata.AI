// Analisis placeholder "Merupakan kata X" di semua tier + cek bahan KBBI.
import { readFileSync } from "node:fs";

const RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;

let total = 0;
const allPh = [];
for (const t of [10,9,8,7,6,5,4,3,2,1]) {
  const src = readFileSync(`src/data/vocabulary/tier${t}.ts`, "utf8");
  const rows = [...src.matchAll(RE)].map(m => [m[1], m[2], m[3], m[4]]);
  const ph = [];
  for (const [word, c1, c2, c3] of rows) {
    [["c1",c1],["c2",c2],["c3",c3]].forEach(([col, c]) => {
      if (/^merupakan kata/i.test(c)) ph.push({ word, col, c, c1 });
    });
  }
  total += ph.length;
  console.log(`tier${t}: ${ph.length} kolom "Merupakan kata X" / ${rows.length} baris`);
  ph.slice(0,4).forEach(p => console.log(`    ${p.word}.${p.col} = "${p.c}" (c1="${p.c1.slice(0,60)}")`));
  allPh.push(...ph.map(p => ({ ...p, tier: t })));
}
console.log("\nTOTAL:", total);

// Cek bahan KBBI untuk kata yang punya placeholder
const kbbi = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = kbbi.dictionary ?? kbbi;
const byWord = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!byWord.has(w)) byWord.set(w, []);
  byWord.get(w).push(e.arti ?? "");
}

const sample = allPh.filter((p, i) => allPh.findIndex(x => x.word === p.word) === i).slice(0, 12);
console.log("\n=== BAHAN KBBI UNTUK 12 KATA PLACEHOLDER PERTAMA ===");
for (const p of sample) {
  const artis = byWord.get(p.word) ?? [];
  console.log(`\n--- ${p.word} (placeholder: ${p.c}) ---`);
  artis.slice(0, 2).forEach(a => console.log("    KBBI:", a.replace(/\n/g, " ⏎ ").slice(0, 200)));
  if (!artis.length) console.log("    (tidak ada di KBBI)");
}
