import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildWordToLang } from "../vocab/etymology-data.mjs";

const w2l = buildWordToLang();
const vocabDir = "src/data/vocabulary";
const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

const missing = [];
const has = [];
let totalInData = 0;

for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    const w = m[1];
    const c1 = m[2];
    const lang = w2l.get(w);
    if (!lang) continue;
    totalInData++;
    if (c1.startsWith("Kata serapan dari bahasa")) has.push(w);
    else missing.push(w + " => c1: " + c1.slice(0, 60));
  }
}

console.log("kata etimologi yg ADA di data:", totalInData);
console.log("punya prefix:", has.length, "| HILANG prefix:", missing.length);
console.log("\nContoh hilang (max 40):");
missing.slice(0, 40).forEach((x) => console.log("  " + x));
