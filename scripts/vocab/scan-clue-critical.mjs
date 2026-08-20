#!/usr/bin/env node
// ============================================================
// Refined scanner: only flag CRITICAL clue leaks
// 1. Answer word appears EXACTLY in any clue (most egregious)
// 2. Obvious Indonesian derivatives: meN+answer, ber+answer, ter+answer
//    where answer root is ≥ 4 chars
// Also scan for potential non-KBBI words.
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const files = readdirSync(dir)
  .filter((f) => /^tier\d+\.ts$/.test(f))
  .sort();

/**
 * Check for critical clue leaks only.
 * Returns array of { type, clueIndex, detail }
 */
function findCriticalLeaks(word, clues) {
  const leaks = [];
  const w = word.toLowerCase();

  if (w.length < 3) return leaks; // skip very short words

  for (let i = 0; i < clues.length; i++) {
    const c = clues[i].toLowerCase();

    // 1. Direct exact match of answer word in clue
    if (c.includes(w)) {
      leaks.push({
        type: "DIRECT",
        clueIndex: i + 1,
        detail: `clue_${i + 1} "${clues[i]}" contains answer "${word}"`,
      });
      continue; // don't double-flag
    }

    // 2. Obvious derivative forms (only for words ≥ 4 chars)
    if (w.length >= 4) {
      // meN+X: menyepak, mengambil, etc.
      const meForms = [
        "me" + w,
        "men" + w,
        "meng" + w,
        "mem" + w,
        "meny" + w,
      ];
      for (const form of meForms) {
        if (c.includes(form)) {
          leaks.push({
            type: "DERIVATIVE",
            clueIndex: i + 1,
            detail: `clue_${i + 1} "${clues[i]}" contains derivative "${form}" of "${word}"`,
          });
          break;
        }
      }

      // ber+X: berhitung, berjalan, etc.
      if (c.includes("ber" + w)) {
        leaks.push({
          type: "DERIVATIVE",
          clueIndex: i + 1,
          detail: `clue_${i + 1} "${clues[i]}" contains derivative "ber${word}"`,
        });
      }

      // ter+X: terima, etc.
      if (c.includes("ter" + w)) {
        leaks.push({
          type: "DERIVATIVE",
          clueIndex: i + 1,
          detail: `clue_${i + 1} "${clues[i]}" contains derivative "ter${word}"`,
        });
      }

      // peN+X: petani, etc.
      const peForms = ["pe" + w, "pen" + w, "peng" + w, "pem" + w, "peny" + w];
      for (const form of peForms) {
        if (c.includes(form)) {
          leaks.push({
            type: "DERIVATIVE",
            clueIndex: i + 1,
            detail: `clue_${i + 1} "${clues[i]}" contains derivative "${form}" of "${word}"`,
          });
          break;
        }
      }

      // di+X: diasingkan, etc.
      if (c.includes("di" + w)) {
        leaks.push({
          type: "DERIVATIVE",
          clueIndex: i + 1,
          detail: `clue_${i + 1} "${clues[i]}" contains derivative "di${word}"`,
        });
      }

      // ke+X: kesukaan, etc.
      if (c.includes("ke" + w)) {
        leaks.push({
          type: "DERIVATIVE",
          clueIndex: i + 1,
          detail: `clue_${i + 1} "${clues[i]}" contains derivative "ke${word}"`,
        });
      }

      // se+X: sesama, etc.
      if (c.includes("se" + w)) {
        leaks.push({
          type: "DERIVATIVE",
          clueIndex: i + 1,
          detail: `clue_${i + 1} "${clues[i]}" contains derivative "se${word}"`,
        });
      }
    }
  }

  return leaks;
}

// --- Main scan ---

const allLeaks = [];
const perTier = {};

for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const tuples = [
    ...src.matchAll(
      /^\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?$/gm
    ),
  ].map((m) => [m[1], m[2], m[3], m[4]]);

  perTier[f] = { total: tuples.length, direct: 0, derivative: 0, words: [] };

  for (const [word, clue1, clue2, clue3] of tuples) {
    const leaks = findCriticalLeaks(word, [clue1, clue2, clue3]);
    if (leaks.length > 0) {
      const hasDirect = leaks.some((l) => l.type === "DIRECT");
      const hasDerivative = leaks.some((l) => l.type === "DERIVATIVE");
      if (hasDirect) perTier[f].direct++;
      if (hasDerivative) perTier[f].derivative++;
      perTier[f].words.push({ word, leaks });
      allLeaks.push({ tier: f, word, leaks });
    }
  }
}

console.log(`\n=== CRITICAL CLUE LEAK SUMMARY ===`);
let totalDirect = 0,
  totalDerivative = 0;
for (const [tier, data] of Object.entries(perTier)) {
  const count = data.direct + data.derivative;
  if (count > 0) {
    console.log(
      `${tier}: ${count} leaked words (${data.direct} direct, ${data.derivative} derivative) / ${data.total} total`
    );
    totalDirect += data.direct;
    totalDerivative += data.derivative;
  }
}
console.log(
  `\nTOTAL: ${allLeaks.length} words with critical leaks (${totalDirect} direct, ${totalDerivative} derivative)`
);

console.log(`\n=== DIRECT LEAKS (most critical) ===`);
for (const l of allLeaks) {
  const directs = l.leaks.filter((x) => x.type === "DIRECT");
  if (directs.length > 0) {
    console.log(`\n${l.tier}: "${l.word}"`);
    for (const d of directs) {
      console.log(`  ${d.detail}`);
    }
  }
}

console.log(`\n=== DERIVATIVE LEAKS ===`);
for (const l of allLeaks) {
  const derivatives = l.leaks.filter((x) => x.type === "DERIVATIVE");
  if (derivatives.length > 0 && !l.leaks.some((x) => x.type === "DIRECT")) {
    console.log(`\n${l.tier}: "${l.word}"`);
    for (const d of derivatives) {
      console.log(`  ${d.detail}`);
    }
  }
}
