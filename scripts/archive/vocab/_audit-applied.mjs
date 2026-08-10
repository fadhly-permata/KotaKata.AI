import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));

const ABBREV = /\b(pd|dl|krn|dgn|yg|sbg|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk)\b/i;
const CLASS_MARKER = /\b(Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\s*\(?kata/i;
const PLACEHOLDER = /\s-{1,2}\s/;
const LEAK_PAT = /Kata berawalan|Berawalan huruf|berakhir huruf|huruf terakhir|berjumlah\s*\d+\s*huruf|\b\d+\s*huruf\b/i;
const BAD_PREFIX = /^(merupakan kata|sinonim|antonim|contoh)\b/i;

function unbalanced(t) {
  if (!t) return false;
  let d = 0;
  for (const ch of t) {
    if (ch === "(") d++;
    else if (ch === ")") { d--; if (d < 0) return true; }
  }
  return d !== 0;
}

const issues = [];
let total = 0;
for (const f of files.sort()) {
  const lines = readFileSync(join(dir, f), "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    total++;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const leak = [c1, c2, c3].some((v) => new RegExp(`\\b${esc}\\b`, "i").test(v));
    const abbrev = [c1, c2, c3].some((v) => ABBREV.test(v));
    const marker = [c1, c2, c3].some((v) => CLASS_MARKER.test(v));
    const ph = [c1, c2, c3].some((v) => PLACEHOLDER.test(v));
    const paren = [c1, c2, c3].some((v) => unbalanced(v));
    const c1Bad = BAD_PREFIX.test(c1.trim());
    const leakPat = [c1, c2, c3].some((v) => LEAK_PAT.test(v));
    const short = [c1, c2, c3].some((v) => v.trim().length < 4);
    if (leak || abbrev || marker || ph || paren || c1Bad || leakPat || short) {
      issues.push({ f, line: i + 1, w, c1, c2, c3, leak, abbrev, marker, ph, paren, c1Bad, leakPat, short });
    }
  }
}
console.log(`Total rows: ${total} | Issues: ${issues.length}`);
for (const x of issues.slice(0, 40)) {
  console.log(`${x.f}:${x.line} ${x.w} leak=${x.leak} abbrev=${x.abbrev} marker=${x.marker} ph=${x.ph} paren=${x.paren} c1Bad=${x.c1Bad} leakPat=${x.leakPat} short=${x.short}`);
  console.log(`   ${JSON.stringify([x.c1, x.c2, x.c3])}`);
}
