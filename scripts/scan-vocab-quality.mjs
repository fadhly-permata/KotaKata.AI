// Scan generated tier files for quality anomalies.
// Usage: node scripts/scan-vocab-quality.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+\.ts$/.test(f)).sort();

const issues = { syllabification: [], html: [], empty: [], equalsWord: [], veryShort: [], leadingJunk: [] };
const perTier = new Map();

for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const tuples = [...src.matchAll(/^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"([^"]*)",\s*"([^"]*)"\],$/gm)].map(
    (m) => [m[1], m[2], m[3], m[4]],
  );
  perTier.set(f, tuples.length);
  for (const [word, def, clue2, clue3] of tuples) {
    if (def.includes("·")) issues.syllabification.push(`${f}:${word} => ${def}`);
    if (/[<>]|&(lt|gt|amp|quot);/.test(def)) issues.html.push(`${f}:${word} => ${def}`);
    if (!def.trim()) issues.empty.push(`${f}:${word}`);
    if (def.trim().toLowerCase() === word.toLowerCase()) issues.equalsWord.push(`${f}:${word}`);
    if (def.length < 5) issues.veryShort.push(`${f}:${word} => "${def}"`);
    if (/^[a-z·]+\s+(n|v|a|adv|num|p|pron)\s/.test(def)) issues.leadingJunk.push(`${f}:${word} => "${def}"`);
    if (!clue2 || clue2.includes("berakhir huruf") || clue2.includes("dalam KBBI"))
      issues.empty.push(`${f}:${word} => clue2 lama: "${clue2}"`);
    if (!clue3 || clue3.includes("Diawali huruf"))
      issues.empty.push(`${f}:${word} => clue3 lama: "${clue3}"`);
  }
}

console.log("Per tier:", JSON.stringify([...perTier.entries()].map(([f, n]) => `${f}:${n}`).join(" ")));
for (const [k, v] of Object.entries(issues)) {
  console.log(`\n=== ${k} (${v.length}) ===`);
  console.log(v.slice(0, 15).join("\n"));
}
