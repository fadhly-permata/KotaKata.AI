// Patch build-kbbi-seed.mjs to fix clue generators.
// Run: node scripts/fix-clues.mjs
import { readFileSync, writeFileSync } from "node:fs";
const path = "scripts/build-kbbi-seed.mjs";
let src = readFileSync(path, "utf8");

// Rename old makeClue2
src = src.replace("function makeClue2", "function _oldMakeClue2");
src = src.replace("function makeClue3", "function _oldMakeClue3");

// Add new clue generators
const newClues = `
function makeClue2(c) {
  const { word, senses } = c;
  if (senses && senses.length >= 1) {
    let alt = senses[0];
    if (alt.toLowerCase() === word) {
      if (senses.length >= 2) alt = senses[1];
      else return "Bentuk lain dari " + word;
    }
    return alt;
  }
  return "Bentuk lain dari " + word;
}

function makeClue3(c) {
  const { word, def } = c;
  const syn = extractSynonym(def, word);
  if (syn) return syn;
  const n = word.length;
  const first = word[0].toUpperCase();
  const last = word[n - 1].toUpperCase();
  return "Huruf pertama " + first + ", terakhir " + last + " (" + n + " huruf)";
}
`;

// Insert before emit section
src = src.replace("// ---------------------------------------------------------------- emit", newClues + "\n// ---------------------------------------------------------------- emit");

writeFileSync(path, src);
console.log("Patched clue generators.");