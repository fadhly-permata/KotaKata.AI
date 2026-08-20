#!/usr/bin/env node
// ============================================================
// Fix ALL remaining clue leaks across all tier vocabulary files.
// Usage: node scripts/vocab/fix-all-leaks.mjs [--dry-run]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const isDryRun = process.argv.includes("--dry-run");

function containsWord(str, word) {
  return str.toLowerCase().includes(word.toLowerCase());
}

// ============================================================
// COMPREHENSIVE FIX MAP — ALL leaks found in scan
// ============================================================
const FIXES = {
  // ═══════════════ TIER 1 ═══════════════
  "tendang": {
    clue_1: "Melontarkan kaki ke arah tertentu",
    clue_2: "Menghantam dengan bagian kaki",
    clue_3: "Sinonim: tendangan"
  },
  "akustik": {
    clue_1: "Cabang ilmu tentang bunyi dan pendengaran",
    clue_2: "Perihal suara dan cara menangkapnya",
    clue_3: "Sinonim: ilmu suara"
  },
  
  // ═══════════════ TIER 2 ═══════════════
  "saling": {
    clue_1: "Satu sama lain; berbalas-balasan",
    clue_2: "Timbal balik antara dua pihak",
    clue_3: "Sinonim: berbalasan"
  },
  "teknis": {
    clue_1: "Berkenaan dengan teknik atau cara kerja",
    clue_2: "Bersifat keahlian atau praktis",
    clue_3: "Sinonim: praktis"
  },
  "global": {
    clue_1: "Menyeluruh; meliputi seluruh dunia",
    clue_2: "Berskala internasional",
    clue_3: "Sinonim: mendunia"
  },
  "tonton": {
    clue_1: "Menyaksikan pertunjukan atau film",
    clue_2: "Menyaksikan dengan mata",
    clue_3: "Sinonim: saksikan"
  },
  "kritik": {
    clue_1: "Kecaman atau tanggapan tajam",
    clue_2: "Tanggapan terhadap kekurangan",
    clue_3: "Sinonim: kecaman"
  },
  "rohani": {
    clue_1: "Bersifat batiniah",
    clue_2: "Menyangkut jiwa atau spritual",
    clue_3: "Antonim: jasmani"
  },
  "anal": {
    clue_1: "Berkaitan dengan anus atau dubur",
    clue_2: "Menyangkut organ pencernaan akhir",
    clue_3: "Sinonim: dubur"
  },
  "etis": {
    clue_1: "Sesuai dengan asas perilaku yang disepakati",
    clue_2: "Berdasarkan moral yang baik",
    clue_3: "Sinonim: bermoral"
  },
  "medis": {
    clue_1: "Berkenaan dengan bidang kedokteran",
    clue_2: "Bersifat pengobatan dan kesehatan",
    clue_3: "Sinonim: kedokteran"
  },
  
  // ═══════════════ TIER 3 ═══════════════
  "ritmik": {
    clue_1: "Bersifat berirama",
    clue_2: "Senam dengan gerakan berirama",
    clue_3: "Sinonim: berirama"
  },
  "taktis": {
    clue_1: "Bersangkutan dengan siasat perang",
    clue_2: "Pandai menyiasati keadaan",
    clue_3: "Sinonim: cerdik"
  },
  "psikis": {
    clue_1: "Bersangkutan dengan kejiwaan",
    clue_2: "Hal yang bersifat batiniah",
    clue_3: "Antonim: fisik"
  },
  "nyambung": {
    clue_1: "Bersambung satu sama lain",
    clue_2: "Jawaban yang berkesinambungan",
    clue_3: "Sinonim: bersambung"
  },
  
  // ═══════════════ TIER 4 ═══════════════
  "anggar": {
    clue_1: "Olahraga berpedang",
    clue_2: "Rencana biaya untuk suatu kegiatan",
    clue_3: "Sinonim: pedang"
  },
  "krista": {
    clue_1: "Tepi atau sisi dalam istilah biologi",
    clue_2: "Bagian dalam mitokondria",
    clue_3: "Sinonim: tepi"
  },
  "termasyhur": {
    clue_1: "Sangat terkenal; tersohor",
    clue_2: "Dikenal luas oleh banyak orang",
    clue_3: "Sinonim: terkenal"
  },
  "militer": {
    clue_1: "Berkenaan dengan tentara",
    clue_2: "Bersifat angkatan bersenjata",
    clue_3: "Sinonim: tentara"
  },
  
  // ═══════════════ TIER 5 ═══════════════
  "nasional": {
    clue_1: "Berkenaan dengan bangsa atau negara",
    clue_2: "Berskala seluruh wilayah negara",
    clue_3: "Antonim: internasional"
  },
  
  // ═══════════════ TIER 10 ═══════════════
  "kolonial": {
    clue_1: "Bersangkutan dengan sifat jajahan",
    clue_2: "Zaman penguasaan asing",
    clue_3: "Sinonim: penjajahan"
  },
  "kognitif": {
    clue_1: "Bersangkutan dengan proses berpikir",
    clue_2: "Menyangkut pengetahuan dan pemahaman",
    clue_3: "Sinonim: intelektual"
  },
  "mencipta": {
    clue_1: "Memusatkan angan-angan untuk mengadakan sesuatu",
    clue_2: "Mengarang; melukis; membuat karya",
    clue_3: "Sinonim: berkreasi"
  },
  "otomotif": {
    clue_1: "Bersangkutan dengan kendaraan bermotor",
    clue_2: "Industri mobil dan kendaraan",
    clue_3: "Sinonim: kendaraan"
  },
  "tersohor": {
    clue_1: "Terkenal atau masyhur",
    clue_2: "Namanya dikenal ke mana-mana",
    clue_3: "Sinonim: ternama"
  },
  "berkarya": {
    clue_1: "Mempunyai pekerjaan tetap",
    clue_2: "Mengarang, melukis, dan sebagainya",
    clue_3: "Sinonim: berprofesi"
  },
  "menyepak": {
    clue_1: "Memukul dengan kaki",
    clue_2: "Menendang bola",
    clue_3: "Sinonim: menendang"
  },
  "diagonal": {
    clue_1: "Garis yang menghubungkan dua sudut berseberangan",
    clue_2: "Garis miring pada segi empat",
    clue_3: "Sinonim: miring"
  },
  "yudisial": {
    clue_1: "Bersangkutan dengan lembaga hukum",
    clue_2: "Bersifat peradilan",
    clue_3: "Sinonim: hukum"
  },
  "transpor": {
    clue_1: "Angkutan barang dari satu tempat ke tempat lain",
    clue_2: "Sarana pengangkutan",
    clue_3: "Sinonim: angkutan"
  },
  "arboreal": {
    clue_1: "Organisme yang hidup pada pohon",
    clue_2: "Yang berdiam di atas pohon",
    clue_3: "Sinonim: pepohonan"
  },
};

// ============================================================
// Apply fixes
// ============================================================
let totalFixed = 0;
let totalSkipped = 0;
let totalStillLeaking = 0;

for (let tier = 1; tier <= 10; tier++) {
  const filePath = join(dir, `tier${tier}.ts`);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }
  
  let changed = false;
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\["([a-z]+)"/);
    if (!match) continue;
    const word = match[1];
    
    if (!FIXES[word]) continue;
    
    const fixes = FIXES[word];
    const oldLine = lines[i];
    
    // Extract current clues
    const tupleMatch = oldLine.match(/\["([a-z]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\]/);
    if (!tupleMatch) continue;
    
    const [, , oldClue1, oldClue2, oldClue3] = tupleMatch;
    
    // Apply fixes
    const newClue1 = fixes.clue_1 || oldClue1;
    const newClue2 = fixes.clue_2 || oldClue2;
    const newClue3 = fixes.clue_3 || oldClue3;
    
    // Check if new clues still leak
    const newLine = oldLine
      .replace(`"${oldClue1}"`, `"${newClue1}"`)
      .replace(`"${oldClue2}"`, `"${newClue2}"`)
      .replace(`"${oldClue3}"`, `"${newClue3}"`);
    
    // Verify no leak in new clues
    let stillLeaks = false;
    for (const checkWord of [word, ...getDerivatives(word)]) {
      if (checkWord.length < 3) continue;
      if (newLine.toLowerCase().includes(checkWord.toLowerCase())) {
        stillLeaks = true;
        break;
      }
    }
    
    if (stillLeaks) {
      console.log(`🔴 ${filePath}: ${word} - NEW CLUE STILL LEAKS!`);
      totalStillLeaking++;
      continue;
    }
    
    if (oldLine === newLine) {
      totalSkipped++;
      continue;
    }
    
    if (isDryRun) {
      console.log(`✅ ${filePath}: ${word}`);
      console.log(`   OLD: ${oldLine.substring(0, 100)}`);
      console.log(`   NEW: ${newLine.substring(0, 100)}`);
      totalFixed++;
    } else {
      lines[i] = newLine;
      changed = true;
      totalFixed++;
      console.log(`✅ ${filePath}: ${word}`);
    }
  }
  
  if (changed && !isDryRun) {
    writeFileSync(filePath, lines.join("\n"), "utf-8");
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${totalFixed}, Skipped: ${totalSkipped}, Still leaking: ${totalStillLeaking}`);

function getDerivatives(word) {
  const roots = new Set();
  roots.add(word);
  
  const prefixes = ['me', 'pe', 'ber', 'ter', 'mem', 'pen', 'meng', 'meny', 'men', 'menc', 'di', 'se'];
  const suffixes = ['kan', 'an', 'i', 'lah', 'kah', 'nya', 'mu', 'ku'];
  
  for (const p of prefixes) {
    for (const s of suffixes) {
      roots.add(p + word + s);
    }
    roots.add(p + word);
  }
  for (const s of suffixes) {
    roots.add(word + s);
  }
  
  roots.add('ber' + word);
  roots.add('ter' + word);
  roots.add('me' + word);
  roots.add('pe' + word);
  roots.add('di' + word);
  roots.add('se' + word);
  roots.add(word + 'an');
  roots.add(word + 'kan');
  roots.add(word + 'i');
  
  return Array.from(roots);
}
