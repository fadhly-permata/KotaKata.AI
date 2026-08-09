// Categorize KBBI arti formats and sample the plain-text format.
// Usage: node scripts/kbbi/diag3-kbbi.mjs /tmp/kbbi.json
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

const cats = { html: 0, cross: 0, plain: 0, other: 0 };
const plainSamples = [];
const crossSamples = [];

for (const e of entries) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) continue;
  if (word.length < 3 || word.length > 10) continue;
  const arti = decode(e.arti ?? "");

  if (arti.includes("<b>")) {
    if (arti.includes(" ? ")) {
      cats.cross++;
      if (crossSamples.length < 8) crossSamples.push(`${word} => ${arti.slice(0, 60)}`);
    } else {
      cats.html++;
    }
  } else if (/[\r\n]/.test(arti) || /^[a-z·.]+ /.test(arti)) {
    cats.plain++;
    if (plainSamples.length < 25) plainSamples.push(`${word} => ${JSON.stringify(arti.slice(0, 110))}`);
  } else {
    cats.other++;
    if (plainSamples.length < 25 && cats.other < 6) plainSamples.push(`[other] ${word} => ${JSON.stringify(arti.slice(0, 110))}`);
  }
}

console.log("cats:", JSON.stringify(cats));
console.log("--- cross samples ---");
console.log(crossSamples.join("\n"));
console.log("--- plain/other samples ---");
console.log(plainSamples.join("\n"));
