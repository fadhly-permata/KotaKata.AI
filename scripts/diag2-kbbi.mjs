// Sample KBBI entries where the parse regex fails, to improve the parser.
// Usage: node scripts/diag2-kbbi.mjs /tmp/kbbi.json
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(path, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const re = /^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s;

let shown = 0;
const samples = [];
for (const e of entries) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) continue;
  if (word.length !== 10) continue;
  const arti = decode(e.arti ?? "");
  if (!re.test(arti)) {
    samples.push(`${word} => ${arti.slice(0, 180)}`);
    if (++shown >= 25) break;
  }
}
console.log(samples.join("\n"));
