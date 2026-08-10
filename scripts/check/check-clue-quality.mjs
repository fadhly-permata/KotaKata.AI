// ============================================================
// KotaKata AI — Pemeriksa kualitas clue per tier file.
// Deteksi: clue kosong, duplikat antar kolom, clue mengandung
// jawaban (bocor), contoh "--", placeholder "Merupakan kata",
// c1 berformat sinonim, dst.
// Usage: node scripts/check/check-clue-quality.mjs src/data/vocabulary/tier5.ts
// ============================================================
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/check/check-clue-quality.mjs <tier-file.ts>");
  process.exit(1);
}

const src = readFileSync(file, "utf8");
const re = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;
const rows = [];
for (const m of src.matchAll(re)) rows.push([m[1], m[2], m[3], m[4]]);

const issues = [];
const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");

for (const [word, c1, c2, c3] of rows) {
  const clues = [c1, c2, c3];
  const names = ["c1", "c2", "c3"];

  // 1) Kosong
  clues.forEach((c, i) => {
    if (!c || !c.trim()) issues.push(`${word}: ${names[i]} KOSONG`);
  });

  // 2) Duplikat antar kolom (sama persis / salah satu memuat yang lain)
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const a = (clues[i] ?? "").trim();
      const b = (clues[j] ?? "").trim();
      if (!a || !b) continue;
      if (a === b) issues.push(`${word}: ${names[i]} == ${names[j]} (persis)`);
      // "memuat" dihitung hanya bila KEDUANYA >= 12 huruf — kata tunggal yang
      // wajar muncul di definisi (mis. "lingkaran" di dalam "berbentuk
      // lingkaran") bukan duplikat clue; yang dideteksi adalah duplikasi
      // frasa antar kolom (fragmen definisi yang sama).
      else if (a.length >= 12 && b.length >= 12 && (a.includes(b) || b.includes(a)))
        issues.push(`${word}: ${names[i]} memuat ${names[j]} "${b.slice(0, 40)}"`);
    }
  }

  // 3) Clue mengandung jawaban (bocor) — sebagai kata utuh
  clues.forEach((c, i) => {
    if (!c) return;
    if (wordRe(word).test(c)) issues.push(`${word}: ${names[i]} BOCOR jawaban "${c.slice(0, 60)}"`);
  });

  // 4) Contoh dengan placeholder "--" (gaya bocor jawaban)
  clues.forEach((c, i) => {
    if (!c) return;
    if (/contoh/i.test(c) && /--/.test(c)) issues.push(`${word}: ${names[i]} contoh placeholder "--"`);
  });

  // 5) c1 berformat sinonim/antonim (seharusnya definisi)
  if (/^(sinonim|antonim)\s*[:—–-]/i.test(c1)) issues.push(`${word}: c1 berformat Sinonim/Antonim`);
}

// Statistik placeholder
const placeholder = rows.filter(([, c1, c2, c3]) =>
  [c1, c2, c3].some((c) => c && /^merupakan kata/i.test(c)),
).length;

console.log(`File: ${file}`);
console.log(`Baris: ${rows.length}`);
console.log(`Placeholder "Merupakan kata": ${placeholder} (${((placeholder / rows.length) * 100).toFixed(1)}%)`);
console.log(`Issue: ${issues.length}`);
const byType = {};
for (const i of issues) {
  const type = i.split(":")[1]?.trim() ?? "";
  byType[type] = (byType[type] ?? 0) + 1;
}
console.log("Rincian:", JSON.stringify(byType, null, 2));
console.log("\n── Sample issue (max 30) ──");
issues.slice(0, 30).forEach((i) => console.log("  " + i));
