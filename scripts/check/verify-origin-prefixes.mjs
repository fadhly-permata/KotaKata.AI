import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildWordToLang } from "../vocab/etymology-data.mjs";

// PLAN-047: guard — pastikan TIDAK ADA clue yang memuat tag asal bahasa
// ("Kata serapan dari bahasa X:" / "Kata dari bahasa X:"). Tag ini dihapus
// karena pemilik tidak menyukainya. Kalau ada yang muncul lagi, script ini
// exit code 1 → CI/verifikasi gagal.
const w2l = buildWordToLang();
const vocabDir = "src/data/vocabulary";
const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const TAG_RE = /Kata (?:serapan|dari bahasa)\s+[A-Z]|Berasal dari bahasa\s+[A-Z]/;

const violations = [];
let totalInData = 0;

for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    const w = m[1];
    const c1 = m[2];
    const lang = w2l.get(w);
    if (!lang) continue; // bukan kata etimologi — tidak relevan
    totalInData++;
    if (TAG_RE.test(c1)) violations.push(`${f}: "${w}" => ${c1.slice(0, 70)}`);
  }
}

console.log("kata etimologi yg ADA di data:", totalInData);
console.log("clue dgn tag asal bahasa (HARUS 0):", violations.length);

if (violations.length) {
  console.log("\nVIOLATIONS (max 40):");
  violations.slice(0, 40).forEach((x) => console.log("  " + x));
  console.error("\nGAGAL: tag asal bahasa ditemukan — PLAN-047 melarangnya.");
  process.exit(1);
}
console.log("OK — tidak ada tag asal bahasa di clue vocabulary.");
