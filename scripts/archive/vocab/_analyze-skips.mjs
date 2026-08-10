import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));

const ABBREV = /\b(pd|dl|krn|dgn|yg|sbg|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk)\b/i;
const CLASS_MARKER = /\b(Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\s*\(?kata/i;
const PLACEHOLDER = /\s-{1,2}\s/;
const BAD_PREFIX = /^(merupakan kata|sinonim|antonim|contoh)\b/i;
const LEAK_PAT = /Kata berawalan|Berawalan huruf|berakhir huruf|huruf terakhir|berjumlah\s*\d+\s*huruf|\b\d+\s*huruf\b/i;

function unbalanced(t) {
  if (!t) return false;
  let d = 0;
  for (const ch of t) {
    if (ch === "(") d++;
    else if (ch === ")") { d--; if (d < 0) return true; }
  }
  return d !== 0;
}
const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/gi, "");
const overlaps = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb || (na.length >= 12 && (na.includes(nb) || nb.includes(na)));
};

const rows = [];
for (const f of files.sort()) {
  const lines = readFileSync(join(dir, f), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = {
      leak: [c1, c2, c3].some((v) => new RegExp(`\\b${esc}\\b`, "i").test(v)),
      abbrev: [c1, c2, c3].some((v) => ABBREV.test(v)),
      marker: [c1, c2, c3].some((v) => CLASS_MARKER.test(v)),
      ph: [c1, c2, c3].some((v) => PLACEHOLDER.test(v)),
      paren: [c1, c2, c3].some((v) => unbalanced(v)),
      c1Bad: BAD_PREFIX.test(c1.trim()),
      leakPat: [c1, c2, c3].some((v) => LEAK_PAT.test(v)),
      short: [c1, c2, c3].some((v) => v.trim().length < 4),
    };
    if (!Object.values(flags).some(Boolean)) continue;
    // Apakah overlap antar kolom? (penyebab minimal repair gagal)
    const dup = overlaps(c1, c2) || overlaps(c1, c3) || overlaps(c2, c3);
    rows.push({ f, w, flags, dup });
  }
}
const onlyMechanical = rows.filter((r) => !r.dup && (r.flags.abbrev || r.flags.paren || r.flags.ph || r.flags.marker));
const dupRows = rows.filter((r) => r.dup);
console.log("Total remaining:", rows.length);
console.log("  — mekanik saja (abbrev/paren/ph, tanpa overlap):", onlyMechanical.length);
console.log("  — ada overlap antar kolom (butuh material baru):", dupRows.length);
console.log("  — c1Bad/leakPat/short/leak:", rows.filter((r) => r.flags.c1Bad || r.flags.leakPat || r.flags.short || r.flags.leak).length);
console.log("\nSample mekanik (harusnya bisa dibenerin):");
for (const r of onlyMechanical.slice(0, 15)) console.log(`  ${r.f} ${r.w} ${JSON.stringify(r.flags)}`);
