// Stricter leak check: answer word appears inside any clue token (catches derived forms).
import { readFileSync } from "node:fs";

const file = process.argv[2];
const s = readFileSync(file, "utf8");
const re = /^  \["((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/gm;
let m, hits = 0;
while ((m = re.exec(s)) !== null) {
  const w = m[1].toLowerCase();
  const clues = [m[2], m[3], m[4]].join(" | ").toLowerCase();
  if (w.length < 3) continue;
  const tokens = clues.split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of tokens) {
    if (t !== w && t.includes(w)) {
      console.log(`[${m[1]}] -> token "${t}": ${clues.slice(0, 110)}`);
      hits++;
      break;
    }
  }
}
console.log(file, "substring-leak hits:", hits);
