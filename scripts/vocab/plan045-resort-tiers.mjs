// ============================================================
// PLAN-045: tata ulang tier berdasarkan frekuensi kata.
//
// Logika:
//  - rank 1: kata tier1 saat ini (sudah dikurasi PLAN-026 = sehari-hari)
//    → tier1 DIJAGA UTUH (1000 kata sama, urutan sama).
//  - rank 2: kata dalam daftar SANGAT_UMUM (kurasi frequency-data.mjs)
//    yang berada di tier 2+ → ditarik ke tier2 (kata umum di tier tinggi).
//  - rank 3: sisanya → urutan stabil sesuai tier/posisi sekarang.
// Hasil: tier1 = sehari-hari, tier2 = umum+sedang, tier3+ makin jarang.
// Setiap tier tetap tepat 1000 kata, tanpa duplikat.
//
// Usage: node scripts/vocab/plan045-resort-tiers.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SANGAT_UMUM } from "./frequency-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const WORDS_PER_TIER = 1000;
const commonSet = new Set(SANGAT_UMUM);

// ---- Load semua kata per tier (file utama dulu, lalu part) ----
const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier(\d+)(?:[ab]|-part\d+)?\.ts$/.test(f))
  .sort((a, b) => {
    const key = (f) => {
      const m = f.match(/^tier(\d+)(?:([ab])|-part(\d+))?\.ts$/);
      const tier = Number(m[1]);
      const kind = m[2] ? 1 : m[3] ? 2 : 0;
      const num = m[2] ? (m[2] === "a" ? 1 : 2) : m[3] ? Number(m[3]) : 0;
      return [tier, kind, num];
    };
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });

const byTier = new Map();
for (const f of tierFiles) {
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  const src = readFileSync(join(vocabDir, f), "utf8");
  const tuples = [...src.matchAll(/^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm)].map((m) => [m[1], m[2], m[3], m[4]]);
  byTier.set(tier, [...(byTier.get(tier) ?? []), ...tuples]);
}

// ---- Kumpulkan semua kata dengan rank ----
const all = [];
for (const [tier, tuples] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
  const inTier1 = tier === 1;
  tuples.slice(0, WORDS_PER_TIER).forEach((t, i) => {
    const word = t[0];
    let rank;
    if (inTier1) rank = 1;
    else if (commonSet.has(word)) rank = 2;
    else rank = 3;
    all.push({ word, clue1: t[1], clue2: t[2], clue3: t[3], tier, index: i, rank });
  });
}

// ---- Sort stabil: rank naik, lalu tier naik, lalu posisi naik ----
all.sort((a, b) => a.rank - b.rank || a.tier - b.tier || a.index - b.index);

// ---- Slicing 1000/tier ----
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const tiers = [];
for (let t = 1; t <= 10; t++) {
  const slice = all.slice((t - 1) * WORDS_PER_TIER, t * WORDS_PER_TIER);
  tiers.push(slice);
}

// ---- Statistik ----
console.log("=== STATISTIK RE-SORT ===");
for (let t = 1; t <= 10; t++) {
  const slice = tiers[t - 1];
  const common = slice.filter((x) => x.rank === 1 || x.rank === 2).length;
  console.log(`tier${t}: ${slice.length} kata | umum(rank1/2) = ${common} | dari tier lama: ${[...new Set(slice.map((x) => x.tier))].sort((a, b) => a - b).join(",")}`);
}

// ---- Validasi duplikat ----
const seen = new Set();
const dups = [];
for (const s of tiers.flat()) {
  if (seen.has(s.word)) dups.push(s.word);
  seen.add(s.word);
}
if (dups.length) {
  console.error("DUPLIKAT:", dups.join(", "));
  process.exit(1);
}
if (tiers.some((s) => s.length !== WORDS_PER_TIER)) {
  console.error("JUMLAH TIER TIDAK 1000!");
  process.exit(1);
}

// ---- Tulis ulang file tier (standalone 1000 kata per file) ----
const header = (tier, note) => `// Tier ${tier} — 1000 kata. ${note}\n// Format: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].\nexport const TIER_${tier}_WORDS: [string, string, string, string][] = [\n`;
for (let t = 1; t <= 10; t++) {
  const note =
    t <= 2
      ? "Kata umum sehari-hari (kurasi frekuensi PLAN-045)."
      : t <= 4
        ? "Kata sedang (frekuensi PLAN-045)."
        : t <= 7
          ? "Kata jarang (frekuensi PLAN-045)."
          : "Kata sangat jarang (frekuensi PLAN-045).";
  const rows = tiers[t - 1].map((x) => `  ["${x.word}", "${esc(x.clue1)}", "${esc(x.clue2)}", "${esc(x.clue3)}"],`);
  const out = header(t, note) + rows.join("\n") + "\n];\n";
  writeFileSync(join(vocabDir, `tier${t}.ts`), out);
  console.log(`✍ tier${t}.ts ditulis (${rows.length} kata)`);
}

// ---- Hapus part file (tidak dipakai lagi) ----
const orphans = ["tier1-part1.ts", "tier4-part1.ts", "tier4-part2.ts", "tier4-part3.ts", "tier5-part3.ts", "tier5-part4.ts"];
for (const f of orphans) {
  const p = join(vocabDir, f);
  try {
    rmSync(p);
    console.log(`🗑 ${f} dihapus`);
  } catch {
    console.log(`· ${f} tidak ada`);
  }
}

console.log("\n✓ Re-sort selesai. Selanjutnya: update index.ts, regenerate SQL, QA.");
