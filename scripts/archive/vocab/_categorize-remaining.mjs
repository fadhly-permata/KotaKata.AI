// Categorize remaining flagged rows in applied tier files (one-time diagnostic).
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

const cats = {};
const samples = {};
let total = 0;
let flagged = 0;
for (const f of files.sort()) {
  const lines = readFileSync(join(dir, f), "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    total++;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = [];
    if ([c1, c2, c3].some((v) => new RegExp(`\\b${esc}\\b`, "i").test(v))) flags.push("leak");
    if ([c1, c2, c3].some((v) => ABBREV.test(v))) flags.push("abbrev");
    if ([c1, c2, c3].some((v) => CLASS_MARKER.test(v))) flags.push("marker");
    if ([c1, c2, c3].some((v) => PLACEHOLDER.test(v))) flags.push("ph");
    if ([c1, c2, c3].some((v) => unbalanced(v))) flags.push("paren");
    if (BAD_PREFIX.test(c1.trim())) flags.push("c1Bad");
    if ([c1, c2, c3].some((v) => LEAK_PAT.test(v))) flags.push("leakPat");
    if ([c1, c2, c3].some((v) => v.trim().length < 4)) flags.push("short");
    if (flags.length) {
      flagged++;
      const k = flags.join("+");
      cats[k] = (cats[k] || 0) + 1;
      (samples[k] = samples[k] || []).push(`${w}: ${JSON.stringify([c1, c2, c3])}`);
    }
  }
}
console.log(`total rows: ${total} | flagged: ${flagged}`);
for (const k of Object.keys(cats).sort((a, b) => cats[b] - cats[a])) {
  console.log(`${cats[k].toString().padStart(4)} ${k}`);
  samples[k].slice(0, 2).forEach((s) => console.log("     ", s.slice(0, 170)));
}
