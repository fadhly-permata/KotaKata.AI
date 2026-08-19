#!/usr/bin/env node
// ============================================================
// Scan for PRECISE clue leaks - answer word in clue.
// Usage: node scripts/vocab/scan-precise-leaks.mjs
// ============================================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");

function containsWord(str, word) {
  // Check if word appears as a whole word (not just substring)
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return regex.test(str);
}

// Check for root word in clue (e.g., "hitung" in "berhitung")
function containsRoot(clue, word) {
  // Extract potential root from word
  let root = word;
  
  // Remove prefixes
  root = root.replace(/^(ber|ter|me|pe|mem|pen|meng|meny|men|menc|di|se)/, '');
  
  // Remove suffixes
  root = root.replace(/(kan|an|i|lah|kah|nya|mu|ku)$/, '');
  
  // Only check if root is 3+ chars
  if (root.length < 3) return false;
  
  const regex = new RegExp(`\\b${root}\\b`, 'i');
  return regex.test(clue);
}

const leaks = [];
for (let tier = 1; tier <= 10; tier++) {
  const filePath = join(dir, `tier${tier}.ts`);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }
  
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\["([a-z]+)"/);
    if (!match) continue;
    const word = match[1];
    
    // Extract clues
    const tupleMatch = lines[i].match(/\["([a-z]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\]/);
    if (!tupleMatch) continue;
    
    const [, , clue1, clue2, clue3] = tupleMatch;
    const allClues = `${clue1} ${clue2} ${clue3}`;
    
    // Check 1: Exact word in clue
    if (containsWord(allClues, word)) {
      leaks.push({ tier, word, type: 'exact', line: i+1 });
      continue;
    }
    
    // Check 2: Root word in clue
    if (containsRoot(allClues, word)) {
      leaks.push({ tier, word, type: 'root', line: i+1 });
    }
  }
}

console.log(`\n=== PRECISE LEAK SCAN ===`);
console.log(`Total leaks: ${leaks.length}`);

if (leaks.length > 0) {
  console.log(`\nBy tier:`);
  const byTier = {};
  leaks.forEach(l => {
    if (!byTier[l.tier]) byTier[l.tier] = [];
    byTier[l.tier].push(l);
  });
  
  Object.keys(byTier).sort((a,b) => a-b).forEach(t => {
    console.log(`\nTier ${t}:`);
    byTier[t].forEach(l => {
      console.log(`  [${l.type}] ${l.word} (line ${l.line})`);
    });
  });
} else {
  console.log(`\n✅ No precise leaks found!`);
}
