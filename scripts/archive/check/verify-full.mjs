// Verifikasi hasil rebuild: 1000/tier, 0 duplikat kata, tidak ada clue terpotong "…",
// panjang clue maksimum.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
let total = 0;
const words = new Set();
const dups = [];
const stats = { clue1EndsWithEllipsis: 0, clue2EndsWithEllipsis: 0, clue3EndsWithEllipsis: 0 };
let maxLen = { len: 0, word: "", tier: "" };
const samples13 = [];

for (const f of readdirSync(dir).filter((x) => /^tier\d+\.ts$/.test(x)).sort()) {
  const s = readFileSync(join(dir, f), "utf8");
  const re = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
  let count = 0;
  for (const m of s.matchAll(re)) {
    const [, w, c1, c2, c3] = m;
    count++;
    total++;
    if (words.has(w)) dups.push(`${f}: ${w}`);
    words.add(w);
    if (/…$/.test(c1)) stats.clue1EndsWithEllipsis++;
    if (/…$/.test(c2)) stats.clue2EndsWithEllipsis++;
    if (/…$/.test(c3)) stats.clue3EndsWithEllipsis++;
    if (c1.length > maxLen.len) maxLen = { len: c1.length, word: w, tier: f };
    if (/…$/.test(c1) && samples13.length < 13) samples13.push(`${f} ${w} => ${JSON.stringify(c1.slice(-50))}`);
  }
  console.log(`${f}: ${count} kata`);
}
console.log("TOTAL:", total, "| UNIK:", words.size, "| DUPLIKAT:", dups.length);
if (dups.length) console.log("  contoh duplikat:", dups.slice(0, 8).join(", "));
console.log("clue1 berakhir …:", stats.clue1EndsWithEllipsis, "| clue2:", stats.clue2EndsWithEllipsis, "| clue3:", stats.clue3EndsWithEllipsis);
console.log("clue1 terpanjang:", maxLen.len, "karakter —", maxLen.tier, maxLen.word);
console.log("\n=== 13 clue1 berakhiran … (spot-check) ===");
console.log(samples13.join("\n"));
