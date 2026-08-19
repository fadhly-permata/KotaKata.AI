#!/usr/bin/env node
// ============================================================
// Scan all tier vocabulary files for clue leaks:
// 1. Answer word appears inside any clue (bocor jawaban)
// 2. Clue contains a derivative/inflected form that reveals the answer
// 3. Syllabification marks (·)
// 4. Empty or very short clues
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const files = readdirSync(dir)
  .filter((f) => /^tier\d+\.ts$/.test(f))
  .sort();

// --- Helpers ---

/** Normalize for comparison: lowercase, strip non-alphanumeric ID chars */
function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Check if a clue contains the answer word or a derivative.
 * Returns { leaked: boolean, reason: string }
 */
function checkClueLeak(word, clue, clueIndex) {
  const w = norm(word);
  const c = norm(clue);

  if (w.length < 3) return { leaked: false }; // skip very short words

  // Direct containment: clue contains the answer word
  if (c.includes(w)) {
    return { leaked: true, reason: `clue_${clueIndex} contains answer "${word}"` };
  }

  // Check common Indonesian affixation patterns
  const prefixes = ["me", "ber", "ter", "pe", "di", "se", "ke", "per"];
  const suffixes = ["kan", "an", "i", "lah", "kah", "tah", "nya"];

  // If the word starts with a common prefix root
  for (const p of prefixes) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      const root = w.slice(p.length);
      // Check if the root appears in clue
      if (root.length >= 3 && c.includes(root)) {
        // Only flag if the root word itself is what's in the clue (not just substring)
        const rootPattern = new RegExp(`\\b${root}\\b|${root}`, "i");
        if (rootPattern.test(c)) {
          return {
            leaked: true,
            reason: `clue_${clueIndex} contains root "${root}" of "${word}" (prefix "${p}")`,
          };
        }
      }
    }
  }

  // For derived words: if answer is "X" and clue contains "menXkan", "berX", etc.
  // Check if clue starts with a verb form of the answer
  const verbPrefixes = ["me", "ber", "ter"];
  for (const vp of verbPrefixes) {
    // e.g. "sepak" → "menyepak", clue shouldn't contain "menyepak"
    const derived = vp + w;
    if (c.includes(derived)) {
      return {
        leaked: true,
        reason: `clue_${clueIndex} contains derived form "${derived}" of "${word}"`,
      };
    }
    // With nasal assimilation: me + p- = men + suffix
    if (w.startsWith("p") && w.length > 3) {
      const noP = w.slice(1);
      const nasalDerived = "men" + noP;
      if (c.includes(nasalDerived)) {
        return {
          leaked: true,
          reason: `clue_${clueIndex} contains derived form "${nasalDerived}" of "${word}"`,
        };
      }
    }
  }

  return { leaked: false };
}

// --- Main scan ---

const leaks = [];
const issues = { empty: [], syllabification: [], short: [] };

for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const tuples = [
    ...src.matchAll(
      /^\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?$/gm
    ),
  ].map((m) => [m[1], m[2], m[3], m[4]]);

  for (const [word, clue1, clue2, clue3] of tuples) {
    // Check clue leaks
    for (const [idx, clue] of [
      [1, clue1],
      [2, clue2],
      [3, clue3],
    ]) {
      const result = checkClueLeak(word, clue, idx);
      if (result.leaked) {
        leaks.push({ tier: f, word, ...result });
      }
    }

    // Check syllabification
    if (clue1.includes("·")) {
      issues.syllabification.push(`${f}:${word} => ${clue1}`);
    }
    if (clue2.includes("·")) {
      issues.syllabification.push(`${f}:${word} clue2 => ${clue2}`);
    }
    if (clue3.includes("·")) {
      issues.syllabification.push(`${f}:${word} clue3 => ${clue3}`);
    }

    // Check empty
    if (!clue1.trim()) {
      issues.empty.push(`${f}:${word} => empty clue_1`);
    }

    // Check very short
    if (clue1.trim().length < 5) {
      issues.short.push(`${f}:${word} => "${clue1}" (${clue1.length} chars)`);
    }
  }
}

console.log(`\n=== CLUE LEAKS (${leaks.length}) ===`);
for (const l of leaks) {
  console.log(`${l.tier}: "${l.word}" — ${l.reason}`);
}

console.log(`\n=== SYLLABIFICATION (${issues.syllabification.length}) ===`);
for (const s of issues.syllabification.slice(0, 10)) {
  console.log(s);
}

console.log(`\n=== EMPTY/SHORT (${issues.empty.length + issues.short.length}) ===`);
for (const e of [...issues.empty, ...issues.short].slice(0, 10)) {
  console.log(e);
}
