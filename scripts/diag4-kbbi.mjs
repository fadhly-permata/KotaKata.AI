// Bucket null-returning KBBI entries by arti shape and sample them.
// Usage: node scripts/diag4-kbbi.mjs /tmp/kbbi.json
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

const buckets = {
  hasB_noCRLF_noMatch: [], // contains <b> but regex fails & no newline
  noB_CRLF_singleLine: [], // newline but lines<2
  noB_noCRLF_plain: [], // single line, no tags, no newline
};
let other = 0;

const htmlRe = /^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s;

for (const e of entries) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) continue;
  if (word.length < 3 || word.length > 10) continue;
  const arti = decode(e.arti ?? "");
  if (!arti) continue;

  const hasB = arti.includes("<b>");
  const hasCRLF = /\r?\n/.test(arti);

  if (hasB && !hasCRLF && !htmlRe.test(arti)) {
    if (buckets.hasB_noCRLF_noMatch.length < 15)
      buckets.hasB_noCRLF_noMatch.push(`${word} => ${JSON.stringify(arti.slice(0, 100))}`);
  } else if (!hasB && hasCRLF) {
    const lines = arti.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      if (buckets.noB_CRLF_singleLine.length < 15)
        buckets.noB_CRLF_singleLine.push(`${word} => ${JSON.stringify(arti.slice(0, 100))}`);
    }
  } else if (!hasB && !hasCRLF) {
    if (buckets.noB_noCRLF_plain.length < 20)
      buckets.noB_noCRLF_plain.push(`${word} => ${JSON.stringify(arti.slice(0, 120))}`);
  } else {
    other++;
  }
}

console.log("=== has <b> but regex fails, no newline ===");
console.log(buckets.hasB_noCRLF_noMatch.join("\n"));
console.log("\n=== no <b>, has newline, but <2 lines ===");
console.log(buckets.noB_CRLF_singleLine.join("\n"));
console.log("\n=== no <b>, no newline, plain single line ===");
console.log(buckets.noB_noCRLF_plain.join("\n"));
console.log("\nother:", other);
