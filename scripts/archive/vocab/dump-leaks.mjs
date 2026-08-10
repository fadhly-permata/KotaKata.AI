// Dump entri lengkap yang clue-nya mengandung token ber-substring kata jawaban.
// Usage: node scripts/dump-leaks.mjs <file-tier...>
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) files.push("src/data/vocabulary/tier1.ts");

const re = /^  \["((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/gm;

for (const file of files) {
  const s = readFileSync(file, "utf8");
  console.log(`\n===== ${file} =====`);
  let m;
  let count = 0;
  while ((m = re.exec(s)) !== null) {
    const w = m[1].toLowerCase();
    if (w.length < 3) continue;
    const clues = [m[2], m[3], m[4]].join(" | ").toLowerCase();
    const tokens = clues.split(/[^a-z0-9]+/).filter(Boolean);
    if (tokens.some((t) => t !== w && t.includes(w))) {
      count++;
      console.log(JSON.stringify([m[1], m[2], m[3], m[4]]));
    }
  }
  console.log(`count: ${count}`);
}
