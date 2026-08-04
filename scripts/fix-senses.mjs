// Post-process: for words with "Bentuk lain" or "Huruf pertama" clues,
// try to extract proper alternate senses/synonyms from the raw KBBI data.
// Usage: node scripts/fix-senses.mjs [kbbi.json]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");
const kbbiPath = process.argv[2] ?? "/tmp/kbbi.json";

const j = JSON.parse(readFileSync(kbbiPath, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const modernize = (s) =>
  s.replace(/\byg\b/g, "yang").replace(/\bdgn\b/g, "dengan").replace(/\btt\b/g, "tentang").replace(/\bkpd\b/g, "kepada").replace(/\bsbg\b/g, "sebagai").replace(/\bdr\b/g, "dari").replace(/\btsb\b/g, "tersebut").replace(/\bspt\b/g, "seperti").replace(/\bud\b/g, "untuk").replace(/\bdll\b/g, "dan lain-lain").replace(/\bdsb\b/g, "dan sebagainya");

function cleanDef(raw) {
  let d = decode(raw).replace(/<i>.*?<\/i>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^\?/.test(d)) return "";
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  d = d.split(/:\s*(?=[a-z;]|$)/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "").replace(/;\s*\(\d+|;\s*\d+\)/i, "");
  d = d.replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  if (d.length > 90) d = d.slice(0, 87).trimEnd() + "…";
  return modernize(d);
}

// Get alternate senses for a word from KBBI
function getAlternateSenses(word) {
  const matches = entries.filter(e => (e.word ?? "").trim().toLowerCase() === word);
  const senses = [];
  for (const e of matches) {
    const arti = decode(e.arti ?? "");
    if (!arti) continue;
    // HTML: split by <b>N</b>
    if (/<b>\d+<\/b>/.test(arti)) {
      for (const p of arti.split(/<b>\d+<\/b>/).slice(1)) {
        const d = cleanDef(p);
        if (d && d.toLowerCase() !== word) senses.push(d);
      }
    }
    // Plain: split by (N) or N)
    const lines = arti.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2 && /^[a-z·.]+$/.test(lines[0])) {
      for (const line of lines.slice(1)) {
        const nm = line.match(/^\(?(\d+)\)?\s*(.*)$/);
        if (nm) {
          const d = cleanDef(nm[2]);
          if (d && d.toLowerCase() !== word) senses.push(d);
        }
      }
    }
  }
  return [...new Set(senses)];
}

// Extract synonym from def
function extractSynonym(def, word) {
  if (!def) return null;
  for (const p of def.split(";")) {
    const seg = p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!seg || !/^[a-z]{2,14}$/.test(seg)) continue;
    if (seg === word || /·|\d/.test(seg)) continue;
    return seg;
  }
  return null;
}

// Process each tier file
const files = readdirSync(vocabDir).filter(f => /^tier\d+\.ts$/.test(f)).sort();
let totalFixed = 0;

for (const f of files) {
  const path = join(vocabDir, f);
  let src = readFileSync(path, "utf8");
  let changed = false;

  // Match each line
  const lines = src.split("\n");
  const newLines = lines.map(line => {
    const m = line.match(/^  \["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\],$/);
    if (!m) return line;
    const [_, word, clue1, clue2, clue3] = m;
    let newClue2 = clue2;
    let newClue3 = clue3;

    // Fix "Bentuk lain" clue2
    if (clue2.startsWith("Bentuk lain")) {
      const senses = getAlternateSenses(word);
      if (senses.length > 0) {
        newClue2 = senses[0];
        changed = true;
      }
    }

    // Fix "Antonim dari" or "Huruf pertama" clue3 (no synonym found)
    if (clue3.startsWith("Antonim dari") || clue3.startsWith("Huruf pertama")) {
      const syn = extractSynonym(clue1, word);
      if (syn) {
        newClue3 = syn;
        changed = true;
      }
    }

    // Fix clue2 same as clue1
    if (newClue2 === clue1) {
      const senses = getAlternateSenses(word);
      const alt = senses.find(s => s !== clue1);
      if (alt) {
        newClue2 = alt;
        changed = true;
      }
    }

    if (newClue2 !== clue2 || newClue3 !== clue3) {
      totalFixed++;
      return `  ["${word}","${clue1}","${newClue2}","${newClue3}"],`;
    }
    return line;
  });

  if (changed) {
    writeFileSync(path, newLines.join("\n"));
  }
}

console.log(`Fixed ${totalFixed} entries across ${files.length} files.`);