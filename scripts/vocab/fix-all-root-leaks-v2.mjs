#!/usr/bin/env node
// ============================================================
// COMPREHENSIVE clue leak fixer — fixes ALL 792+ leaks at once
// Strategy: For each word, check all 3 clues for leaks.
// If a clue leaks, rewrite it by removing the problematic
// derivative/root word and replacing it with a generic alternative.
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const files = readdirSync(dir)
  .filter((f) => /^tier\d+\.ts$/.test(f))
  .sort();

const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================
// Indonesian morphological analysis
// ============================================================

// Map of meN prefix variants → base consonant cluster
const ME_PREFIX_MAP = {
  meny: "se",
  meng: "eng",
  men: "t",
  mem: "b",
  mec: "c", // no assimilation
  mej: "j", // no assimilation  
};

// Common Indonesian prefix patterns
const PREFIXES_LONG_TO_SHORT = [
  "mengg", "meny", "meng", "mempe", "mem", "men", "menc",
  "pengg", "peny", "peng", "pempe", "pem", "pen", "penc",
  "ber", "ter", "per",
  "pe", "me", "di", "se", "ke",
];

/**
 * Strip common Indonesian prefixes from a word to get root
 */
function stripPrefix(word) {
  const w = word.toLowerCase();
  for (const p of PREFIXES_LONG_TO_SHORT) {
    if (w.startsWith(p) && w.length > p.length + 1) {
      return { prefix: p, root: w.slice(p.length) };
    }
  }
  return null;
}

/**
 * Get the root of an Indonesian word (simple heuristic)
 */
function getRoot(word) {
  const w = word.toLowerCase();
  const result = stripPrefix(w);
  if (result) {
    // Also try stripping suffixes from root
    let r = result.root;
    const suffixes = ["kan", "an", "i", "lah", "kah"];
    for (const s of suffixes) {
      if (r.endsWith(s) && r.length > s.length + 2) {
        return { prefix: result.prefix, root: r.slice(0, -s.length), suffix: s, full: r };
      }
    }
    return { prefix: result.prefix, root: r, suffix: "", full: r };
  }
  return null;
}

/**
 * Generate all possible derivative forms of a root word
 */
function getDerivativeForms(root) {
  const forms = new Set();
  const prefixes = ["me", "ber", "ter", "pe", "di", "se", "ke", "per", "mem", "pen", "meng", "meny", "men", "menc"];
  const suffixes = ["kan", "an", "i", "lah", "kah", "tah", "nya"];

  for (const p of prefixes) {
    for (const s of suffixes) {
      forms.add(p + root + s);
    }
    forms.add(p + root);
  }
  for (const s of suffixes) {
    forms.add(root + s);
  }
  return Array.from(forms).filter(f => f.length >= 4);
}

/**
 * Check if clue contains a word from a list (whole word match)
 */
function containsWholeWord(clue, wordList) {
  const c = clue.toLowerCase();
  for (const w of wordList) {
    if (w.length < 3) continue;
    const regex = new RegExp(`\\b${w}\\b`, "i");
    if (regex.test(c)) {
      return w;
    }
  }
  return null;
}

/**
 * Normalize for comparison (strip diacritics)
 */
function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// Clue rewrite rules
// ============================================================

/**
 * Given a leaking clue, rewrite it to remove the leak.
 * This applies pattern-based transformations.
 */
function rewriteClue(clue, word, leakedWord) {
  let newClue = clue;

  // Pattern 1: "orang yang [derivative]" → "seseorang yang berkecimpung di bidang [root]"
  // Pattern 2: "alat untuk [derivative]" → "perangkat yang berfungsi untuk [generic action]"
  // Pattern 3: "yang [derivative]" → "yang berkaitan dengan [generic]"
  // etc.

  // Generic action descriptions for common patterns
  const genericReplacements = {
    "menyanyi": "bersuara merdu",
    "menulis": "berkarya lewat tulisan",
    "melaut": "bekerja di laut",
    "menghapus": "membersihkan bekas",
    "memarut": "mengolah bahan parutan",
    "membayar": "melakukan transaksi",
    "mencabut": "melepaskan dari tempatnya",
    "mencopet": "mengambil milik orang lain secara diam-diam",
    "digigit": "terkena gigitan",
    "dilipat": "dirangkap",
    "melontar": "melemparkan",
    "melontari": "melempari",
    "menjarah": "mengambil paksa",
    "meluncur": "bergerak mulus di permukaan",
    "coretan": "tanda goresan",
    "memantik": "menyulut",
    "mengunci": "mengaitkan agar terkait",
    "mencetak": "membuat cetakan",
    "menopang": "menahan dari bawah",
    "mendecit": "berbunyi nyaring",
    "menindas": "bertindak kejam",
    "menyedot": "mengisap",
    "mengasihi": "mencintai",
    "mencakar": "menggores dengan kuku",
    "bergema": "berulang suaranya",
    "ditelan": "masuk ke dalam tubuh",
    "memberatkan": "menambah beban",
    "kelubung": "terbungkus",
    "menebang": "memotong pohon",
    "garisnya": "batas-batasnya",
    "bergerak": "berpindah posisi",
    "berdekam": "berdiam lama",
    "mendaratkan": "menurunkan dari udara",
    "mendarat": "turun ke darat",
    "kerutnya": "lipatan-lipatannya",
    "meminjam": "meminta pinjaman",
    "menyamar": "berpura-pura",
    "mendetik": "berdetak",
    "membebaskan": "melepaskan dari penahanan",
    "dikuras": "dihabiskan isinya",
    "menyegarkan": "membuat segar",
    "disusun": "dirangkai",
    "jamurnya": "tumbuhan mikroskopisnya",
    "mencetak": "membuat hasil cetak",
    "mengunci": "mengunci agar aman",
    "dicakup": "termasuk di dalamnya",
    "melompat": "berpindah dengan lompatan",
    "dituduh": "disangka melakukan kesalahan",
    "berulas": "membahas",
    "menyalurkan": "mengarahkan",
    "menyiram": "memberi air",
    "menuntun": "membimbing jalan",
    "menyamun": "merampas",
    "nomornya": "angka-angkanya",
    "berbelok": "mengubah arah",
    "memungut": "mengambil dari tanah",
    "dikikis": "terkikis habis",
    "dibalas": "dibalas jasa",
    "menumpas": "memusnahkan",
    "bekasnya": "jejak-jejaknya",
    "ombaknya": "gelombang-gelombangnya",
    "membisikkan": "berkata pelan",
    "mencegah": "menghalangi",
    "meninjau": "melihat dan memeriksa",
    "menjamin": "menyatakan pasti",
    "dicabut": "ditarik keluar",
    "bercabut": "tarik-menarik",
    "menambah": "menambah jumlah",
    "jumputan": "ambilan sedikit",
    "memanjat": "naik ke atas",
    "dijamah": "dipegang",
    "batasnya": "limitsnya",
    "nanahnya": "cairan infeksiinya",
    "menengahi": "memisahkan dua pihak",
    "bangsanya": "suku bangsanya",
    "sisiknya": "lapisan-lapisannya",
    "mencukur": "menghilangkan rambut",
    "diobati": "diberi pengobatan",
    "menerangi": "memberi cahaya",
    "pecandu": "orang yang candu",
    "menyuplai": "mengirim pasokan",
    "menyumbang": "memberikan sumbangan",
    "menyendiri": "berada sendirian",
    "menyemprot": "menyemburkan cairan",
    "menyembuhkan": "mengobati penyakit",
    "menyelinap": "bergerak diam-diam",
    "menyegarkan": "membuat menjadi segar",
    "menyandera": "membawa sandera",
    "menyandang": "menanggung",
    "menjaga": "mengawasi",
    "menimbun": "menumpuk",
    "mengontrol": "mengendalikan",
    "mengolah": "menggunakan bahan",
    "mengkritik": "menilai kekurangan",
    "menghangatkan": "membuat suhu naik",
    "menggerakkan": "membuat bergerak",
    "mengangkut": "membawa barang",
    "mengangkat": "mengambil dari bawah",
    "mengaduk": "mencampur",
    "menebang": "memotong",
    "mendobrak": "memaksa masuk",
    "mendidik": "mengajarkan",
    "menangkap": "menahan",
    "menampar": "memukul telapak tangan",
    "mengangkut": "memindahkan",
    "menyambung": "menghubungkan",
    "menyusun": "merangkai",
    "menyediakan": "menyiapkan",
    "mengayuh": "menggerakkan dengan kaki",
    "menyewa": "meminjam dengan bayaran",
    "menyapu": "membersihkan dengan sapu",
    "menyeberang": "melintasi",
    "menyewakan": "meminjamkan dengan bayaran",
    "menyongsong": "menanti dengan gembira",
    "menyimak": "mendengarkan",
    "menyimpang": "menyimpang dari jalan",
    "menyembunyikan": "menyembunyikan",
    "menyambut": "menyongsong",
  };

  // Replace the leaked word with a generic alternative in the clue
  const leakedLower = leakedWord.toLowerCase();
  
  // Try to find a generic replacement
  if (genericReplacements[leakedLower]) {
    const replacement = genericReplacements[leakedLower];
    // Case-insensitive replace of the leaked word
    const regex = new RegExp(`\\b${leakedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    newClue = clue.replace(regex, replacement);
    if (newClue !== clue) return newClue;
  }

  // Pattern: remove "yang [derivative]" and replace with "yang berkaitan dengan [root]"
  const yangPattern = new RegExp(`\\byang\\s+${leakedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
  if (yangPattern.test(clue)) {
    const rootInfo = getRoot(word);
    const root = rootInfo ? rootInfo.root : word;
    newClue = clue.replace(yangPattern, `yang berkaitan dengan ${root}`);
    if (newClue !== clue) return newClue;
  }

  // Pattern: "untuk [derivative]" → "yang berfungsi untuk aktivitas terkait [root]"
  const untukPattern = new RegExp(`\\buntuk\\s+${leakedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
  if (untukPattern.test(clue)) {
    const rootInfo = getRoot(word);
    const root = rootInfo ? rootInfo.root : word;
    newClue = clue.replace(untukPattern, `yang berfungsi untuk aktivitas terkait ${root}`);
    if (newClue !== clue) return newClue;
  }

  // Pattern: "[derivative] something" → "melakukan aktivitas terkait [root] something"
  const derivativeAsWhole = new RegExp(`\\b${leakedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
  if (derivativeAsWhole.test(clue)) {
    const rootInfo = getRoot(word);
    const root = rootInfo ? rootInfo.root : word;
    newClue = clue.replace(derivativeAsWhole, `melakukan aktivitas terkait ${root}`);
    if (newClue !== clue) return newClue;
  }

  // If nothing worked, return null (needs manual fix)
  return null;
}

// ============================================================
// Main fix logic
// ============================================================

let totalFixed = 0;
let totalFailed = 0;
const failedEntries = [];

for (const f of files) {
  const filepath = join(dir, f);
  const src = readFileSync(filepath, "utf8");
  
  // Parse all tuples
  const tupleRegex = /^(\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?)$/gm;
  const tuples = [];
  let match;
  while ((match = tupleRegex.exec(src)) !== null) {
    tuples.push({
      fullMatch: match[1],
      word: match[2],
      clue1: match[3],
      clue2: match[4],
      clue3: match[5],
    });
  }

  let fixedCount = 0;
  let newSrc = src;

  for (const t of tuples) {
    const clues = [
      { idx: 1, value: t.clue1 },
      { idx: 2, value: t.clue2 },
      { idx: 3, value: t.clue3 },
    ];

    let newClues = [...clues];
    let modified = false;

    for (const clue of clues) {
      const c = norm(clue.value);
      const w = norm(t.word);

      // Check 1: Exact answer word in clue
      if (c.includes(w) && w.length >= 3) {
        // Need to rewrite this clue
        const rewritten = rewriteClue(clue.value, t.word, t.word);
        if (rewritten) {
          newClues[clue.idx - 1] = { idx: clue.idx, value: rewritten };
          modified = true;
          totalFixed++;
        } else {
          totalFailed++;
          failedEntries.push({ tier: f, word: t.word, clueIdx: clue.idx, clue: clue.value, reason: "exact answer" });
        }
        continue;
      }

      // Check 2: Clear derivative form as whole word
      const rootInfo = getRoot(t.word);
      if (rootInfo) {
        const derivatives = getDerivativeForms(rootInfo.root);
        const found = containsWholeWord(clue.value, derivatives);
        if (found) {
          const rewritten = rewriteClue(clue.value, t.word, found);
          if (rewritten) {
            newClues[clue.idx - 1] = { idx: clue.idx, value: rewritten };
            modified = true;
            totalFixed++;
          } else {
            totalFailed++;
            failedEntries.push({ tier: f, word: t.word, clueIdx: clue.idx, clue: clue.value, reason: `derivative "${found}"` });
          }
        }
      }
    }

    if (modified) {
      // Rebuild the tuple string
      const newTuple = `  ["${t.word}", "${newClues[0].value}", "${newClues[1].value}", "${newClues[2].value}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      fixedCount++;
    }
  }

  if (fixedCount > 0 && !DRY_RUN) {
    writeFileSync(filepath, newSrc, "utf8");
  }

  console.log(`${f}: ${fixedCount} entries modified`);
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total fixes applied: ${totalFixed}`);
console.log(`Failed to fix: ${totalFailed}`);
if (failedEntries.length > 0) {
  console.log(`\nFailed entries:`);
  for (const e of failedEntries) {
    console.log(`  ${e.tier}: "${e.word}" clue${e.clueIdx} (${e.reason}): "${e.clue}"`);
  }
}
if (DRY_RUN) {
  console.log(`\n[DRY RUN] No files were modified.`);
}
