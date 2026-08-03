// Analyze KBBI JSON from dyazincahya/KBBI-SQL-database
// Usage: node scripts/analyze-kbbi.mjs /tmp/kbbi.json
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(path, "utf8"));
const arr = j.dictionary ?? j;
console.log("total entries:", arr.length);

const strip = (s) =>
  (s ?? "")
    .replace(/&lt;\/?[a-z]+&gt;/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const counts = {};
const sample = [];
let multi = 0;
let clean = 0;

for (const e of arr) {
  const w = (e.word ?? "").trim();
  if (!w) continue;
  if (/[^a-z ]/.test(w)) continue; // skip words with digits, hyphens, foreign letters
  if (w.includes(" ")) {
    multi++;
    continue;
  }
  clean++;
  const L = w.length;
  counts[L] = (counts[L] ?? 0) + 1;
  if (sample.length < 30 && L >= 3 && L <= 8) {
    sample.push(`${w} → ${strip(e.arti).slice(0, 70)}`);
  }
}

console.log("length dist (single plain words):", JSON.stringify(counts, null, 0));
console.log("multi-word entries skipped:", multi, "| clean single:", clean);
console.log("--- samples 3-8 letters ---");
console.log(sample.join("\n"));
