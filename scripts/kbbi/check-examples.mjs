// Check how many KBBI entries have usable example sentences & synonyms for clue generation.
// Usage: node scripts/check-examples.mjs [kbbi.json]
import { readFileSync } from "node:fs";

const kbbiPath = process.argv[2] ?? "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(kbbiPath, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

function extractExample(arti, word) {
  const flat = decode(arti).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const ci = flat.toLowerCase();
  const re = new RegExp(`\\b${word}\\b`);
  // find colon-segments containing the word
  const parts = ci.split(":");
  for (const seg of parts.slice(1)) {
    if (!re.test(seg)) continue;
    // cut at next sense marker
    const cut = seg.search(/[;(]\(?\d/);
    let ex = (cut >= 0 ? seg.slice(0, cut) : seg).trim();
    if (ex.length < 4 || ex.length > 140) continue;
    return ex;
  }
  return null;
}

function extractSynonym(def, word) {
  if (!def) return null;
  for (const p of def.split(";")) {
    const seg = p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!seg || !/^[a-z]{2,14}$/.test(seg)) continue;
    if (seg === word || /·|\d/.test(seg)) continue;
    return seg;
  }
  return null;
}

let n = 0;
let withExample = 0;
let withSyn = 0;
let withBoth = 0;
let neither = 0;
const samples = { example: [], syn: [] };

for (const e of entries) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word) || word.length < 3 || word.length > 10) continue;
  const arti = decode(e.arti ?? "");
  if (!arti) continue;
  // skip crossrefs & function-ish? keep simple: just measure availability
  n++;
  const ex = extractExample(arti, word);
  const syn = extractSynonym(arti.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), word);
  if (ex) withExample++;
  if (syn) withSyn++;
  if (ex && syn) withBoth++;
  if (!ex && !syn) neither++;
  if (ex && samples.example.length < 12) samples.example.push(`${word} => "${ex}"`);
  if (syn && samples.syn.length < 12) samples.syn.push(`${word} => ${syn}`);
}

console.log(`total eligible: ${n}`);
console.log(`with example:   ${withExample} (${((withExample / n) * 100).toFixed(1)}%)`);
console.log(`with synonym:   ${withSyn} (${((withSyn / n) * 100).toFixed(1)}%)`);
console.log(`with both:      ${withBoth} (${((withBoth / n) * 100).toFixed(1)}%)`);
console.log(`neither:        ${neither} (${((neither / n) * 100).toFixed(1)}%)`);
console.log("\n=== example samples ===");
samples.example.forEach((s) => console.log(" ", s));
console.log("\n=== synonym samples ===");
samples.syn.forEach((s) => console.log(" ", s));
