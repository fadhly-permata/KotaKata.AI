#!/usr/bin/env node
// ============================================================
// PRECISE clue leak scanner — only flags REAL leaks:
// 1. Clue contains the exact answer word
// 2. Clue contains a clear derivative as a whole word
//    (me+word, ber+word, pe+word, etc.)
// 3. Does NOT flag coincidental substring matches
//    (e.g., "darah" for "merah" is NOT a leak)
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const files = readdirSync(dir)
  .filter((f) => /^tier\d+\.ts$/.test(f))
  .sort();

// Indonesian prefixes that create clear derivatives
const PREFIXES = ["me", "ber", "ter", "pe", "di", "se", "ke", "per", "mem", "pen", "meng", "meny", "men", "menc"];
const SUFFIXES = ["kan", "an", "i", "lah", "kah", "tah", "nya"];

/**
 * Check if a word starts with a prefix and what the root would be
 */
function getRoot(word) {
  const w = word.toLowerCase();
  // Try longer prefixes first
  for (const p of ["meng", "meny", "mem", "pen", "men", "menc", "ber", "ter", "per", "pe", "me", "di", "se", "ke"]) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      return { prefix: p, root: w.slice(p.length) };
    }
  }
  return null;
}

/**
 * Generate all possible derivative forms of a root word
 */
function getDerivativeForms(root) {
  const forms = new Set();
  for (const p of PREFIXES) {
    for (const s of SUFFIXES) {
      forms.add(p + root + s);
    }
    forms.add(p + root);
  }
  for (const s of SUFFIXES) {
    forms.add(root + s);
  }
  return Array.from(forms).filter(f => f.length >= 4);
}

/**
 * Check if clue contains a word from a list (whole word match, not substring)
 */
function containsWholeWord(clue, wordList) {
  const c = clue.toLowerCase();
  for (const w of wordList) {
    if (w.length < 3) continue;
    // Word boundary check
    const regex = new RegExp(`\\b${w}\\b`, "i");
    if (regex.test(c)) {
      return w;
    }
  }
  return null;
}

/**
 * Normalize for comparison
 */
function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// Main scan
// ============================================================
const realLeaks = [];
const borderline = [];

for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  const tuples = [
    ...src.matchAll(
      /^\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?$/gm
    ),
  ].map((m) => [m[1], m[2], m[3], m[4]]);

  for (const [word, clue1, clue2, clue3] of tuples) {
    const clues = [
      [1, clue1],
      [2, clue2],
      [3, clue3],
    ];

    for (const [idx, clue] of clues) {
      const c = norm(clue);
      const w = norm(word);

      // Check 1: Exact answer word in clue
      if (c.includes(w) && w.length >= 3) {
        realLeaks.push({ tier: f, word, clueIndex: idx, reason: `exact answer "${word}" in clue`, clue });
        continue;
      }

      // Check 2: Clear derivative form as whole word
      const rootInfo = getRoot(word);
      if (rootInfo) {
        const derivatives = getDerivativeForms(rootInfo.root);
        const found = containsWholeWord(clue, derivatives);
        if (found) {
          realLeaks.push({ tier: f, word, clueIndex: idx, reason: `derivative "${found}" of "${word}"`, clue });
          continue;
        }
      }

      // Check 3: Answer root as a whole word in clue (only if root is meaningful, 4+ chars)
      if (rootInfo && rootInfo.root.length >= 4) {
        const regex = new RegExp(`\\b${rootInfo.root}\\b`, "i");
        if (regex.test(clue)) {
          borderline.push({ tier: f, word, clueIndex: idx, reason: `root "${rootInfo.root}" of "${word}" as whole word`, clue });
        }
      }
    }
  }
}

console.log(`\n=== REAL LEAKS (${realLeaks.length}) ===`);
for (const l of realLeaks) {
  console.log(`${l.tier}: "${l.word}" — ${l.reason}`);
  console.log(`   clue: ${l.clue}`);
}

console.log(`\n=== BORDERLINE (${borderline.length}) ===`);
for (const l of borderline.slice(0, 30)) {
  console.log(`${l.tier}: "${l.word}" — ${l.reason}`);
  console.log(`   clue: ${l.clue}`);
}
if (borderline.length > 30) {
  console.log(`   ... and ${borderline.length - 30} more`);
}
