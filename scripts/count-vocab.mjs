// Counts words per tier file + checks for duplicate words across all tier files.
// Usage: node scripts/count-vocab.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+[ab]?\.ts$/.test(f)).sort();

const wordCounts = new Map(); // word -> {file, count}
const total = { count: 0 };
const perFile = [];

for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const re = /^  \["([^"]+)",/gm;
  let n = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    const w = m[1];
    wordCounts.set(w, { file: f, count: (wordCounts.get(w)?.count ?? 0) + 1 });
    n++;
    total.count++;
  }
  perFile.push(`${f}: ${n}`);
}

const dups = [...wordCounts.entries()].filter(([, v]) => v.count > 1);
console.log(perFile.join("\n"));
console.log(`TOTAL: ${total.count} | unique words: ${wordCounts.size} | duplicates: ${dups.length}`);
if (dups.length) {
  console.log("DUPLICATES:", dups.slice(0, 20).map(([w, v]) => `${w}(${v.file} x${v.count})`).join(", "));
}
