// Debug a single KBBI entry parse path.
// Usage: node scripts/debug-entry.mjs aku [kbbi.json]
import { readFileSync } from "node:fs";

const target = process.argv[2] ?? "aku";
const path = process.argv[3] ?? "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(path, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const hits = entries.filter((e) => (e.word ?? "").trim().toLowerCase() === target);
console.log(`entries for "${target}":`, hits.length);
for (const e of hits.slice(0, 3)) {
  const arti = decode(e.arti ?? "");
  console.log("--- raw (first 200):", JSON.stringify(arti.slice(0, 200)));
  console.log("has <b>:", arti.includes("<b>"), "| has ? :", arti.includes(" ? "), "| has CRLF:", /\r?\n/.test(arti));
  const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  console.log("lines:", lines.length, "| lines[0]:", JSON.stringify(lines[0]), "| is clean word:", /^[a-z·.]+$/.test(lines[0] ?? ""));
  console.log("lines[1]:", JSON.stringify(lines[1] ?? ""));
}
