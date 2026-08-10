// Verifikasi kualitas 10.000 kata di tier1..10.ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
let total = 0;
const words = new Set();
const stats = { dup12: 0, dup23: 0, dup13: 0, letterC3: 0, bermaknaC2: 0, contohC2: 0, shortC1: 0 };
const dups = [];
const samples = { bad: [] };

for (const f of readdirSync(dir).filter((x) => /^tier\d+\.ts$/.test(x)).sort()) {
  const s = readFileSync(join(dir, f), "utf8");
  const re = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
  for (const m of s.matchAll(re)) {
    const [, w, c1, c2, c3] = m;
    total++;
    if (words.has(w)) { dups.push(`${f}: ${w}`); }
    words.add(w);
    const l1 = c1.toLowerCase(), l2 = c2.toLowerCase(), l3 = c3.toLowerCase();
    if (l1 === l2) stats.dup12++;
    if (l2 === l3) stats.dup23++;
    if (l1 === l3) stats.dup13++;
    if (/^Kata berawalan/.test(c3)) stats.letterC3++;
    if (/^Bermakna sama/.test(c2)) stats.bermaknaC2++;
    if (/^Contoh:/.test(c2)) stats.contohC2++;
    if (c1.length < 4) stats.shortC1++;
  }
}

console.log("TOTAL:", total, "UNIK:", words.size, "DUPLIKAT:", dups.length);
if (dups.length) console.log("  contoh:", dups.slice(0, 10).join(", "));
console.log("clue2==clue1:", stats.dup12, "| clue3==clue2:", stats.dup23, "| clue3==clue1:", stats.dup13);
console.log("clue3 huruf-fallback:", stats.letterC3, "| clue2 'Bermakna sama':", stats.bermaknaC2, "| clue2 'Contoh:':", stats.contohC2, "| clue1 pendek:", stats.shortC1);
