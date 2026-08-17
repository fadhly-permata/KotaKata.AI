// PLAN-045: audit distribusi frekuensi kata per tier.
// Menghitung: berapa % kata per tier yang termasuk SANGAT_UMUM (sehari-hari),
// dan mendaftar outlier:
//   - kata SANGAT_UMUM di tier 6-10 (harusnya di tier rendah)
//   - kata dengan penanda JARANG di tier 1-3 (harusnya di tier tinggi)
// Usage: node scripts/check/audit-frequency.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SANGAT_UMUM, RARE_SUFFIX_RE, RARE_PREFIX_RE } from "../vocab/frequency-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const commonSet = new Set(SANGAT_UMUM);
const byTier = {};
for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  for (const m of src.matchAll(/^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm)) {
    (byTier[tier] = byTier[tier] || []).push({ word: m[1], c1: m[2] });
  }
}

console.log("=== DISTRIBUSI per tier ===");
const pct = (n, d) => ((n / d) * 100).toFixed(0) + "%";
for (let t = 1; t <= 10; t++) {
  const list = byTier[t] ?? [];
  const common = list.filter((x) => commonSet.has(x.word)).length;
  const rare = list.filter((x) => RARE_SUFFIX_RE.test(x.word) || RARE_PREFIX_RE.test(x.word)).length;
  console.log(`tier${t}: n=${list.length} | kata sehari-hari=${pct(common, list.length)} (${common}) | penanda-jarang=${pct(rare, list.length)} (${rare})`);
}

console.log("\n=== OUTLIER: kata SANGAT_UMUM di tier 6-10 (harus di bawah) ===");
for (let t = 6; t <= 10; t++) {
  const list = byTier[t] ?? [];
  const hits = list.filter((x) => commonSet.has(x.word));
  if (hits.length) {
    console.log(`tier${t} (${hits.length}): ${hits.slice(0, 25).map((x) => x.word).join(", ")}${hits.length > 25 ? "…" : ""}`);
  }
}

console.log("\n=== OUTLIER: kata berpenanda JARANG di tier 1-3 (harus ke atas) ===");
for (let t = 1; t <= 3; t++) {
  const list = byTier[t] ?? [];
  const hits = list.filter((x) => RARE_SUFFIX_RE.test(x.word) || RARE_PREFIX_RE.test(x.word));
  if (hits.length) {
    console.log(`tier${t} (${hits.length}): ${hits.slice(0, 25).map((x) => x.word).join(", ")}${hits.length > 25 ? "…" : ""}`);
  }
}
