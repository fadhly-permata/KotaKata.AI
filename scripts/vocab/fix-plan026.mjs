// ============================================================
// ENGINE PLAN-026 — terapkan FIX_CLUES (tier1), SWAP (tier2-10),
// dan bangun tier1-part1.ts dari kandidat PART1.
// Usage: node scripts/vocab/fix-plan026.mjs [--dry-run]
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FIX_CLUES, PART1_FIX, SCRAMBLED_FIX, SWAP } from "./plan026-data.mjs";
import { PART1_FIX_EXTRA } from "./plan026-part1-fix.mjs";
import { SWAP_FIX } from "./plan026-swap-fix.mjs";
import { PART1 } from "./plan026-part1.mjs";

const DRY = process.argv.includes("--dry-run");
const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const TUPLE_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/;

const esc = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const fmtTuple = (t) => `  [${t.map(esc).join(", ")}],`;

const parseTuples = (src) => {
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(TUPLE_RE);
    if (m) out.push({ line, word: m[1], tuple: [m[1], m[2], m[3], m[4]] });
  }
  return out;
};

const readTierFiles = () =>
  readdirSync(vocabDir)
    .filter((f) => /^tier\d.*\.ts$/.test(f) && !/^tier\d+\.ts$/.test(f) === false || /^tier\d+(-part\d+|[ab])?\.ts$/.test(f))
    .filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f))
    .sort((a, b) => {
      const k = (f) => {
        const m = f.match(/^tier(\d+)(?:([ab])|-part(\d+))?\.ts$/);
        return [Number(m[1]), m[2] ? 1 : m[3] ? 2 : 0, m[2] ? (m[2] === "a" ? 1 : 2) : m[3] ? Number(m[3]) : 0];
      };
      const ka = k(a), kb = k(b);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
    });

const allWordsByTier = () => {
  const map = new Map();
  for (const f of readTierFiles()) {
    const tier = Number(f.match(/^tier(\d+)/)[1]);
    const ws = parseTuples(readFileSync(join(vocabDir, f), "utf8")).map((e) => e.word);
    map.set(tier, [...(map.get(tier) ?? []), ...ws]);
  }
  return map;
};

// ---------- 1) Tier 1: FIX_CLUES (full tuple) + SCRAMBLED_FIX + dedupe ----------
const tier1Path = join(vocabDir, "tier1.ts");
{
  const src = readFileSync(tier1Path, "utf8");
  const seen = new Set();
  const out = [];
  let fixed = 0, dupDropped = 0;
  for (const line of src.split("\n")) {
    const m = line.match(TUPLE_RE);
    if (!m) { out.push(line); continue; }
    const word = m[1];
    let tuple;
    if (SCRAMBLED_FIX[word]) {
      // field kata rusak akibat bug engine v1 — ganti penuh
      tuple = SCRAMBLED_FIX[word];
      fixed++;
    } else if (FIX_CLUES[word]) {
      tuple = [word, ...FIX_CLUES[word]];
      fixed++;
    } else {
      tuple = [m[1], m[2], m[3], m[4]];
    }
    if (seen.has(tuple[0])) { dupDropped++; continue; }
    seen.add(tuple[0]);
    out.push(fmtTuple(tuple));
  }
  if (!DRY) writeFileSync(tier1Path, out.join("\n"));
  console.log(`tier1.ts: FIX ${fixed} entri, DEDUP ${dupDropped} duplikat → ${seen.size} kata`);
}

// ---------- 2) Tier 2-10: SWAP ----------
const tierFiles = readTierFiles();
let swapApplied = 0;
for (const f of tierFiles) {
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  const out = [];
  let changed = 0;
  for (const line of src.split("\n")) {
    const m = line.match(TUPLE_RE);
    if (!m) { out.push(line); continue; }
    const key = `${m[1]}|${tier}`;
    const repl = SWAP[key];
    if (repl) { out.push(fmtTuple(repl)); changed++; continue; }
    const fix = SWAP_FIX[key];
    if (fix) { out.push(fmtTuple(fix)); changed++; continue; }
    out.push(line);
  }
  if (changed) {
    if (!DRY) writeFileSync(path, out.join("\n"));
    swapApplied += changed;
    console.log(`${f}: SWAP ${changed} kata`);
  }
}
console.log(`SWAP total: ${swapApplied} kata`);

// ---------- 3) Bangun tier1-part1.ts ----------
{
  // Hanya hitung tier1.ts (TANPA part1) supaya engine idempotent:
  // part1 adalah file yang sedang dibangun ulang.
  const tierWords = allWordsByTier();
  const tier1Words = new Set(parseTuples(readFileSync(tier1Path, "utf8")).map((e) => e.word));
  const otherWords = new Set();
  for (const [t, ws] of tierWords) if (t !== 1) for (const w of ws) otherWords.add(w);

  const NEED = 1000 - tier1Words.size;
  if (NEED <= 0) {
    console.log(`tier1-part1.ts: sudah lengkap (tier1.ts punya ${tier1Words.size} kata) — tidak ditulis ulang`);
  } else {
  const selected = [];
  const seen = new Set();
  const rejected = [];
  for (const [w, c1, c2, c3] of PART1) {
    if (selected.length >= NEED) break;
    if (tier1Words.has(w)) { rejected.push(`${w}(sudah di tier1)`); continue; }
    if (otherWords.has(w)) { rejected.push(`${w}(ada di tier lain)`); continue; }
    if (seen.has(w)) { rejected.push(`${w}(duplikat internal)`); continue; }
    seen.add(w);
    const pf = { ...PART1_FIX, ...PART1_FIX_EXTRA }[w];
    selected.push([w, pf?.c1 ?? c1, pf?.c2 ?? c2, pf?.c3 ?? c3]);
  }
  console.log(`tier1-part1.ts: butuh ${NEED}, terpilih ${selected.length} dari ${PART1.length} kandidat`);
  if (selected.length < NEED) {
    console.error(`KURANG: hanya ${selected.length}/${NEED} kandidat lolos`);
    console.error("Ditolak:", rejected.slice(0, 20).join(", "));
    process.exit(1);
  }
  const body = selected.map(fmtTuple).join("\n");
  const out = `// Tier 1 (bagian 2) — ${selected.length} kata mudah tambahan (PLAN-026).
// Digabung dengan tier1.ts oleh src/data/vocabulary/index.ts dan
// scripts/vocab/gen-vocab-sql.mjs (dibaca sebagai tier1-part1.ts).
// Format: [kata, clue_1 (definisi), clue_2 (petunjuk lain), clue_3 (sinonim/antonim)].
export const TIER_1_WORDS_PART_1: [string, string, string, string][] = [
${body}
];
`;
  if (!DRY) writeFileSync(join(vocabDir, "tier1-part1.ts"), out);
  console.log(`tier1-part1.ts: ditulis ${selected.length} entri`);
  }
}

// ---------- 4) Validasi akhir ----------
{
  const tierWords = allWordsByTier();
  for (const [t, ws] of [...tierWords.entries()].sort((a, b) => a[0] - b[0])) {
    const uniq = new Set(ws);
    console.log(`  t${t}: ${ws.length} entri, ${uniq.size} unik, ${ws.length - uniq.size} duplikat-internal`);
  }
  // bentrok antar tier
  const global = new Map();
  for (const [t, ws] of tierWords) for (const w of new Set(ws)) {
    if (global.has(w)) global.get(w).push(t); else global.set(w, [t]);
  }
  const collisions = [...global.entries()].filter(([, ts]) => ts.length > 1);
  if (collisions.length) {
    console.log(`BENTROK antar tier: ${collisions.length} kata → ${collisions.slice(0, 15).map(([w, ts]) => `${w}(${ts.join(",")})`).join(", ")}`);
  } else {
    console.log("BENTROK antar tier: 0 ✅");
  }
}
