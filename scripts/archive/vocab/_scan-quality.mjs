// Quick scan of remaining weak/absurd clue patterns across all tiers.
import { readFileSync } from "node:fs";

const RE = /^  \[\"([^\"]+)\",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

const patterns = [
  { name: "Merupakan kata X", re: /^merupakan kata/i },
  { name: "hal yang berkaitan dengan", re: /^hal yang berkaitan dengan/i },
  { name: "berkaitan dengan adanya", re: /^berkaitan dengan adanya/i },
  { name: "Contoh: di c1", re: /^Contoh:/i },
  { name: "Sinonim di c1", re: /^Sinonim:/i },
  { name: "Antonim di c1", re: /^Antonim:/i },
  { name: "c2==c3", re: null },
  { name: "c2 memuat c3 (>=12)", re: null },
  { name: "bocor kata (whole word)", re: null },
  { name: "hanya 1 kata", re: /^[a-z·]+$/i },
];

const out = [];
for (let t = 1; t <= 10; t++) {
  const files = [];
  const main = `src/data/vocabulary/tier${t}.ts`;
  try { files.push(main); } catch { /* ignore */ }
  const parts = [];
  try {
    const fs = require("node:fs");
    const dir = "src/data/vocabulary";
    parts.push(...fs.readdirSync(dir).filter(f => f.startsWith(`tier${t}`) && f.includes("part")).map(f => `${dir}/${f}`));
  } catch { /* ignore */ }
  const all = [...new Set([main, ...parts])];
  const rows = [];
  for (const f of all) {
    try {
      const src = readFileSync(f, "utf8");
      rows.push(...[...src.matchAll(RE)].map(m => [m[1], m[2], m[3], m[4]]));
    } catch { /* skip */ }
  }
  const counts = {};
  const samples = {};
  for (const [word, c1, c2, c3] of rows) {
    const cols = [c1, c2, c3];
    for (const p of patterns) {
      const hit = p.re ? cols.some(c => p.re.test(c)) : null;
      if (hit) {
        counts[p.name] = (counts[p.name] ?? 0) + 1;
        if (!samples[p.name]) samples[p.name] = `${word}: c1="${c1.slice(0, 60)}"`;
      }
    }
    if (c2 === c3) { counts["c2==c3"] = (counts["c2==c3"] ?? 0) + 1; if (!samples["c2==c3"]) samples["c2==c3"] = word; }
    const l2 = c2.toLowerCase(), l3 = c3.toLowerCase();
    if (l2.length >= 12 && (l2.includes(l3) || l3.includes(l2))) { counts["c2 memuat c3 (>=12)"] = (counts["c2 memuat c3 (>=12)"] ?? 0) + 1; if (!samples["c2 memuat c3 (>=12)"]) samples["c2 memuat c3 (>=12)"] = `${word}: c2="${c2.slice(0,50)}" c3="${c3.slice(0,50)}"`; }
    for (const c of cols) {
      const re = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i");
      if (re.test(c)) { counts["bocor kata (whole word)"] = (counts["bocor kata (whole word)"] ?? 0) + 1; if (!samples["bocor kata (whole word)"]) samples["bocor kata (whole word)"] = `${word}: "${c.slice(0, 60)}"`; break; }
    }
    if (/^[a-z·]+$/i.test(c1) && c1.length > 3) { counts["hanya 1 kata"] = (counts["hanya 1 kata"] ?? 0) + 1; if (!samples["hanya 1 kata"]) samples["hanya 1 kata"] = `${word}: "${c1}"`; }
  }
  out.push(`\n=== TIER ${t} (${rows.length} rows) ===`);
  for (const p of patterns) {
    if (counts[p.name]) out.push(`  ${p.name}: ${counts[p.name]}  ${samples[p.name] ?? ""}`);
  }
  for (const k of ["c2==c3", "c2 memuat c3 (>=12)", "bocor kata (whole word)", "hanya 1 kata"]) {
    if (counts[k]) out.push(`  ${k}: ${counts[k]}  ${samples[k] ?? ""}`);
  }
}
console.log(out.join("\n"));
