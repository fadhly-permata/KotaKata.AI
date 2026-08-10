import { readFileSync } from "node:fs";

const r = JSON.parse(readFileSync(new URL("./research-report.json", import.meta.url), "utf8"));
const changed = r.results.filter((x) => x.changed);
const ABBREV = /\b(pd|dl|krn|dgn|yg|sbg|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk)\b/i;
const CLASS_MARKER = /\b(Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\s*\(?kata/i;
const PLACEHOLDER = /\s-{1,2}\s/;

function unbalanced(t) {
  if (!t) return false;
  let d = 0;
  for (const ch of t) {
    if (ch === "(") d++;
    else if (ch === ")") { d--; if (d < 0) return true; }
  }
  return d !== 0;
}

const bad = [];
for (const x of changed) {
  const w = x.word;
  const n = x.new;
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leak = n.some((v) => new RegExp(`\\b${esc}\\b`, "i").test(v));
  const c1Sin = /^(sinonim|antonim|contoh)\s*[:—–-]?/i.test(n[0]);
  const junk = n.some((v) => ABBREV.test(v) || CLASS_MARKER.test(v) || PLACEHOLDER.test(v) || unbalanced(v) || /^[a-z·]{1,16}[),;:]$/.test(v.trim()) || /^(v|n|a|adv)(?=[A-ZÀ-Ý])/.test(v));
  if (leak || c1Sin || junk) bad.push({ w, new: n, leak, c1Sin, junk });
}
console.log("changed:", changed.length, "REAL suspect:", bad.length);
for (const b of bad.slice(0, 30)) console.log(JSON.stringify(b));
