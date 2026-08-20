/**
 * Audit semua tier vocabulary (1–10) untuk:
 * 1. Clue bocor — clue mengandung kata jawaban (kata dasar / bentuk imbuhan)
 * 2. Clue terlalu panjang (>80 char) — kemungkinan copy-paste KBBI tanpa edit
 * 3. Clue terlalu pendek (<10 char) — kemungkinan placeholder
 * 4. Kata duplikat antar tier
 * 5. Kata non-huruf (ada angka/simbol)
 * 6. Kosakata terlalu pendek (<3 huruf) atau terlalu panjang (>10 huruf)
 *
 * Usage: bun scripts/vocab/audit-vocab.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOCAB_DIR = resolve(__dirname, "../../src/data/vocabulary");

const TIER_FILES = Array.from({ length: 10 }, (_, i) =>
  resolve(VOCAB_DIR, `tier${i + 1}.ts`)
);

/** Ekstrak array of [word, c1, c2, c3] dari file tier TS. */
function parseTierFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const tierMatch = content.match(/tier(\d+)/i);
  const tierNum = tierMatch ? parseInt(tierMatch[1]) : 0;

  // Match all tuples: ["word", "c1", "c2", "c3"]
  const tupleRe = /\["([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\]/g;
  const entries = [];
  let m;
  while ((m = tupleRe.exec(content)) !== null) {
    entries.push({
      word: m[1],
      c1: m[2],
      c2: m[3],
      c3: m[4],
      tier: tierNum,
    });
  }
  return entries;
}

/** Stemmer sederhana Indonesia — hapus prefiks/sufiks umum. */
function stripAffixes(word) {
  let stems = [word];

  // Sufiks
  const suffixes = ["kan", "an", "i", "nya", "lah", "kah", "tah"];
  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      stems.push(word.slice(0, -suf.length));
    }
  }

  // Prefiks umum
  const prefixes = [
    "meng", "meny", "men", "mem", "me",
    "peng", "peny", "pen", "pem", "pe",
    "ber", "bel", "ter", "se",
    "di", "ke",
  ];
  for (const pfx of prefixes) {
    if (word.startsWith(pfx) && word.length - pfx.length >= 3) {
      stems.push(word.slice(pfx.length));
    }
  }

  // Kombinasi pre+suf
  const preSuf = [
    ["meng", "kan"], ["meng", "an"], ["meng", "i"],
    ["meny", "kan"], ["meny", "an"],
    ["men", "kan"], ["men", "an"], ["men", "i"],
    ["mem", "kan"], ["mem", "an"],
    ["me", "kan"], ["me", "an"],
    ["peng", "kan"], ["peng", "an"],
    ["peny", "kan"], ["peny", "an"],
    ["ber", "an"], ["ber", "i"],
    ["ter", "an"], ["ter", "i"],
  ];
  for (const [p, s] of preSuf) {
    if (word.startsWith(p) && word.endsWith(s)) {
      const mid = word.slice(p.length, -s.length);
      if (mid.length >= 2) stems.push(mid);
    }
  }

  return [...new Set(stems)];
}

/** Cek apakah clue mengandung kata jawaban (exact atau stem). */
function checkClueLeak(word, clue, stems) {
  const clueLower = clue.toLowerCase();
  const wordLower = word.toLowerCase();

  // Exact match
  if (clueLower.includes(wordLower)) {
    return { type: "exact", word: wordLower };
  }

  // Stem match — cari stem di clue
  for (const stem of stems) {
    if (stem.length >= 3 && clueLower.includes(stem)) {
      return { type: "stem", word: stem };
    }
  }

  return null;
}

// ===== MAIN =====
const allWords = new Map(); // word -> [{tier, idx}]
const issues = {
  clueLeak: [],
  clueTooLong: [],
  clueTooShort: [],
  duplicates: [],
  badFormat: [],
  shortWord: [],
  longWord: [],
};

for (const tierFile of TIER_FILES) {
  const entries = parseTierFile(tierFile);
  const tierNum = entries[0]?.tier || 0;

  for (let i = 0; i < entries.length; i++) {
    const { word, c1, c2, c3, tier } = entries[i];

    // Track duplicates
    if (!allWords.has(word)) {
      allWords.set(word, []);
    }
    allWords.get(word).push({ tier, idx: i + 1 });

    // Check word format
    if (!/^[a-z]+$/.test(word)) {
      issues.badFormat.push({ tier, idx: i + 1, word, reason: "bukan hanya huruf kecil" });
    }

    // Check word length
    if (word.length < 3) {
      issues.shortWord.push({ tier, idx: i + 1, word });
    }
    if (word.length > 10) {
      issues.longWord.push({ tier, idx: i + 1, word });
    }

    // Check clue length
    const clues = [c1, c2, c3];
    for (const [ci, clue] of clues.entries()) {
      if (clue.length > 80) {
        issues.clueTooLong.push({
          tier, idx: i + 1, word,
          clueNum: ci + 1,
          length: clue.length,
          clue: clue.slice(0, 100) + "...",
        });
      }
      if (clue.length < 10) {
        issues.clueTooShort.push({
          tier, idx: i + 1, word,
          clueNum: ci + 1,
          clue,
        });
      }
    }

    // Check clue leaks
    const stems = stripAffixes(word.toLowerCase());
    for (const [ci, clue] of clues.entries()) {
      const leak = checkClueLeak(word, clue, stems);
      if (leak) {
        issues.clueLeak.push({
          tier, idx: i + 1, word,
          clueNum: ci + 1,
          leakType: leak.type,
          leakedWord: leak.word,
          clue,
        });
      }
    }
  }
}

// Check duplicates
for (const [word, locations] of allWords) {
  if (locations.length > 1) {
    issues.duplicates.push({ word, locations });
  }
}

// ===== REPORT =====
console.log("═══════════════════════════════════════════════════════════");
console.log("  AUDIT KOSAKATA KOTAKATA.AI — SEMUA TIER (1–10)");
console.log("═══════════════════════════════════════════════════════════\n");

console.log(`Total kata: ${allWords.size}`);
console.log();

// Clue Leaks
console.log(`🔴 CLUE BOCOR: ${issues.clueLeak.length}`);
console.log("───────────────────────────────────────────────────────────");
for (const l of issues.clueLeak.slice(0, 80)) {
  console.log(`  T${l.tier} #${l.idx} "${l.word}" → c${l.clueNum} (${l.leakType}: "${l.leakedWord}")`);
  console.log(`    "${l.clue.slice(0, 90)}${l.clue.length > 90 ? "..." : ""}"`);
}
if (issues.clueLeak.length > 80) {
  console.log(`  ... dan ${issues.clueLeak.length - 80} lagi`);
}
console.log();

// Clue too long
console.log(`🟡 CLUE TERLALU PANJANG (>80 char): ${issues.clueTooLong.length}`);
console.log("───────────────────────────────────────────────────────────");
for (const l of issues.clueTooLong.slice(0, 30)) {
  console.log(`  T${l.tier} #${l.idx} "${l.word}" → c${l.clueNum} (${l.length} char)`);
  console.log(`    "${l.clue}"`);
}
if (issues.clueTooLong.length > 30) {
  console.log(`  ... dan ${issues.clueTooLong.length - 30} lagi`);
}
console.log();

// Clue too short
console.log(`🟠 CLUE TERLALU PENDEK (<10 char): ${issues.clueTooShort.length}`);
console.log("───────────────────────────────────────────────────────────");
for (const l of issues.clueTooShort.slice(0, 20)) {
  console.log(`  T${l.tier} #${l.idx} "${l.word}" → c${l.clueNum}: "${l.clue}"`);
}
console.log();

// Duplicates
console.log(`🟣 KATA DUPLIKAT: ${issues.duplicates.length}`);
console.log("───────────────────────────────────────────────────────────");
for (const d of issues.duplicates.slice(0, 20)) {
  console.log(`  "${d.word}" → ${d.locations.map((l) => `T${l.tier}#${l.idx}`).join(", ")}`);
}
console.log();

// Bad format
console.log(`⚪ KATA BUKAN HURUF SAJA: ${issues.badFormat.length}`);
console.log("───────────────────────────────────────────────────────────");
for (const b of issues.badFormat.slice(0, 20)) {
  console.log(`  T${b.tier} #${b.idx}: "${b.word}" — ${b.reason}`);
}
console.log();

// Short words
console.log(`⚪ KATA < 3 HURUF: ${issues.shortWord.length}`);
for (const s of issues.shortWord.slice(0, 10)) {
  console.log(`  T${s.tier} #${s.idx}: "${s.word}"`);
}
console.log();

// Long words
console.log(`⚪ KATA > 10 HURUF: ${issues.longWord.length}`);
for (const l of issues.longWord.slice(0, 10)) {
  console.log(`  T${l.tier} #${l.idx}: "${l.word}"`);
}
console.log();

// Summary
console.log("═══════════════════════════════════════════════════════════");
console.log("RINGKASAN:");
console.log(`  Clue bocor:          ${issues.clueLeak.length}`);
console.log(`  Clue terlalu panjang: ${issues.clueTooLong.length}`);
console.log(`  Clue terlalu pendek:  ${issues.clueTooShort.length}`);
console.log(`  Kata duplikat:       ${issues.duplicates.length}`);
console.log(`  Kata non-huruf:      ${issues.badFormat.length}`);
console.log(`  Kata < 3 huruf:      ${issues.shortWord.length}`);
console.log(`  Kata > 10 huruf:     ${issues.longWord.length}`);
console.log("═══════════════════════════════════════════════════════════");

// Export detailed data for fixing
const report = { issues, allWords: Object.fromEntries(allWords) };
import { writeFileSync } from "node:fs";
writeFileSync(
  resolve(__dirname, "/tmp/vocab-audit-report.json"),
  JSON.stringify(report, null, 2)
);
console.log("\nDetail report: /tmp/vocab-audit-report.json");
