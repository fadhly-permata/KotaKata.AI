#!/usr/bin/env node
// ============================================================
// Scan for potentially non-KBBI vocabulary words across all tiers.
// Usage: node scripts/vocab/scan-non-kbbi.mjs
// ============================================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");

// Known non-KBBI patterns (slang, abbreviations, informal)
const NON_KBBI_PATTERNS = [
  // Informal/slang
  /^(anjay|mampus|goblog|bangsat|tolol|kontol|memek|peju|kntl|mmk|anjir|kampret|bajingan|brengsek|goblok|kunyuk|jembut|pelacur|lonte|sundel|bangke|kentut|jancuk)$/i,
  // Common abbreviations
  /^(yg|dgn|kpd|pd|dr|dsb|dll|dst|tpi|msh|bgt|btw|omg|lol|rofl|afk|brb|irl|tbh|imo|imho)$/i,
  // Suffixes/particles that aren't standalone words
  /^(dong|sih|loh|deh|lah|kok|kan|nih|tuh|nih|yah|lho)$/i,
  // Unusual letter combos in Indonesian
  /^[^aeiou]*$/, // No vowels (impossible in Indonesian)
  /qw|zx|jj|qq|xx|ww/i, // Unusual consonant clusters
];

// Common KBBI words that might look unusual but are valid
const KNOWN_VALID = new Set([
  'es', 'ah', 'oh', 'ih', 'aduh', 'aih', 'amit', 'bajing', 'unjuk', 'anjuk',
  'apa', 'asu', 'ajak', 'alas', 'amal', 'anasir', 'antom', 'arang', 'banci',
  'bancuh', 'bancuh', 'basi', 'batu', 'beda', 'bentuk', 'beri', 'beru', 'besar',
  'biang', 'bong', 'bosi', 'bucu', 'budi', 'buka', 'bulu', 'bina', 'banci',
  'cuci', 'cuci', 'dampak', 'dampu', 'dansa', 'dansa', 'dara', 'dari', 'dasa',
  'datu', 'davi', 'dema', 'demo', 'dini', 'diri', 'dosa', 'duka', 'dusta',
  'efek', 'elok', 'emoh', 'enam', 'eram', 'erak', 'erang', 'erat', 'eret',
  'eroh', 'erop', 'erup', 'esai', 'etik', 'evol', 'gempa', 'gemi', 'geng',
  'gerah', 'geram', 'giat', 'gigi', 'gincu', 'girah', 'goda', 'gombal',
  'guru', 'gusti', 'hoki', 'hujan', 'hutan', 'ide', 'ilmi', 'imam', 'indah',
  'irama', 'iris', 'isap', 'istri', 'jasa', 'jenuh', 'jiwa', 'juru', 'kafi',
  'kaya', 'kembang', 'kira', 'kuku', 'kunci', 'laba', 'laci', 'laku', 'lama',
  'langit', 'lantak', 'lari', 'lekat', 'luka', 'muda', 'muka', 'nusa', 'paku',
  'paras', 'pintu', 'puas', 'rata', 'rindu', 'sari', 'sila', 'suka', 'surya',
  'tabuh', 'tali', 'tamu', 'tari', 'tata', 'teduh', 'tengah', 'tesis', 'titi',
  'ujung', 'ulu', 'unduh', 'untuk', 'upah', 'wacana', 'wahid', 'wani', 'warsa',
  'wujud', 'yakin', 'zat',
]);

function extractWords(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const words = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\["([a-z]+)"/);
    if (match) {
      words.push({ word: match[1], line: i + 1 });
    }
  }
  return words;
}

function isSuspicious(word) {
  if (KNOWN_VALID.has(word)) return false;
  
  for (const pattern of NON_KBBI_PATTERNS) {
    if (pattern.test(word)) return true;
  }
  
  // Additional checks
  // 1. Very short words (2 chars) that aren't common
  if (word.length === 2 && !/^(ah|oh|ih|es|ud|up|ai|oi|ui|ak|ob|os|oi|oy|uy|oi|au|ei|ou|ya|yo|yu|yi)$/i.test(word)) {
    return true;
  }
  
  return false;
}

console.log("=== Scanning for non-KBBI vocabulary ===\n");

const tierFiles = Array.from({ length: 10 }, (_, i) => `tier${i + 1}.ts`);
const allSuspicious = [];

for (const file of tierFiles) {
  const filePath = join(dir, file);
  try {
    const words = extractWords(filePath);
    const suspicious = words.filter(w => isSuspicious(w.word));
    if (suspicious.length > 0) {
      console.log(`\n${file}:`);
      suspicious.forEach(w => {
        console.log(`  Line ${w.line}: "${w.word}"`);
        allSuspicious.push({ ...w, file });
      });
    }
  } catch (e) {
    // File might not exist
  }
}

console.log("\n=== Summary ===");
console.log(`Total suspicious words: ${allSuspicious.length}`);

if (allSuspicious.length === 0) {
  console.log("\n✅ No obviously non-KBBI words found.");
  console.log("Note: This scanner checks for common non-standard patterns.");
  console.log("For complete verification, check against official KBBI dictionary.");
}
