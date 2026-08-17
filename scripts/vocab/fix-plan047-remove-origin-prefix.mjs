#!/usr/bin/env node
// ============================================================
// PLAN-047: Hapus prefix "Kata serapan dari ..." & "Kata dari ..."
// dari clue_1 di semua tier. Ganti dengan definisi normal.
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// Pattern: "Kata serapan dari bahasa X: [definition]" atau
//          "Kata dari bahasa X/daerah Y: [definition]"
const ORIGIN_PREFIX_RE =
  /^(?:Kata serapan dari bahasa\s+\S+|Kata dari bahasa\s+\S+(?:\s+daerah\s+\S+)?)\s*:\s*/i;

const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier\d+.*\.ts$/.test(f))
  .sort();

let totalFixed = 0;
let totalSkipped = 0;
const fixes = []; // { file, word, oldC1, newC1 }

for (const file of tierFiles) {
  const filePath = join(vocabDir, file);
  let src = readFileSync(filePath, "utf8");

  // Parse all entries
  const entryRe =
    /^(\s*\[\s*)"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\](,?)$/gm;

  let modified = false;
  const entries = [];

  for (const m of src.matchAll(entryRe)) {
    const [full, prefix, word, c1, c2, c3, comma] = m;
    entries.push({ full, prefix, word, c1, c2, c3, comma, index: m.index });

    if (ORIGIN_PREFIX_RE.test(c1)) {
      // Extract definition after the prefix
      const match = c1.match(ORIGIN_PREFIX_RE);
      const definition = c1.slice(match[0].length).trim();

      if (definition && definition.length >= 8) {
        // Check if new c1 would be duplicate of c2 or c3
        const isDupC2 = c2.trim().toLowerCase() === definition.toLowerCase();
        const isDupC3 = c3.trim().toLowerCase() === definition.toLowerCase();
        const isContained =
          (c2.length >= 12 && definition.length >= 12 && c2.includes(definition)) ||
          (c3.length >= 12 && definition.length >= 12 && c3.includes(definition));

        if (isDupC2 || isDupC3 || isContained) {
          // Fallback: use c2 as new c1 (shift clues)
          // But we need to make sure c2 is not also a sinonim/antonim format
          const newC1 = c2.startsWith("Sinonim:") || c2.startsWith("Antonim:")
            ? definition  // Use extracted definition anyway
            : c2;
          const newC2 = c2.startsWith("Sinonim:") || c2.startsWith("Antonim:")
            ? c3
            : c3; // Keep c3 as is
          
          // Actually, let's just use the extracted definition - it's the best option
          fixes.push({ file, word, oldC1: c1, newC1: definition, reason: "extracted" });
          totalFixed++;
          modified = true;
        } else {
          fixes.push({ file, word, oldC1: c1, newC1: definition, reason: "extracted" });
          totalFixed++;
          modified = true;
        }
      } else {
        // Definition too short, use c2 as new c1
        if (c2 && c2.length >= 8 && !c2.startsWith("Sinonim:") && !c2.startsWith("Antonim:")) {
          fixes.push({ file, word, oldC1: c1, newC1: c2, reason: "fallback-c2" });
          totalFixed++;
          modified = true;
        } else {
          // Use extracted definition anyway (might be short but better than prefix)
          if (definition) {
            fixes.push({ file, word, oldC1: c1, newC1: definition, reason: "extracted-short" });
            totalFixed++;
            modified = true;
          } else {
            totalSkipped++;
            console.log(`SKIP ${file}: ${word} — definition kosong setelah prefix dihapus`);
          }
        }
      }
    }
  }

  if (modified) {
    // Rebuild the file with fixed entries
    let newSrc = src;
    // Apply fixes in reverse order to preserve indices
    for (const fix of fixes.filter((f) => f.file === file).reverse()) {
      const escapedNewC1 = fix.newC1.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const oldEntry = fix.oldC1.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const pattern = fix.c1
        ? `"${oldEntry}"`
        : `"${oldEntry}"`;

      // Find and replace the specific entry's c1
      const wordEsc = fix.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(\\[\\s*"${wordEsc}"\\s*,\\s*")((?:[^"\\\\]|\\\\.)*)(")`,
      );
      const m = newSrc.match(re);
      if (m) {
        newSrc = newSrc.slice(0, m.index) +
          m[1] + escapedNewC1 + m[3] +
          newSrc.slice(m.index + m[0].length);
      }
    }
    writeFileSync(filePath, newSrc);
    console.log(`✅ ${file}: ${fixes.filter((f) => f.file === file).length} entries diperbaiki`);
  }
}

console.log(`\n=== RINGKASAN PLAN-047 ===`);
console.log(`Total diperbaiki: ${totalFixed}`);
console.log(`Total di-skip: ${totalSkipped}`);
console.log(`File diproses: ${tierFiles.length}`);

// Save report
const report = { totalFixed, totalSkipped, fixes: fixes.map(({ file, word, oldC1, newC1, reason }) => ({ file, word, oldC1: oldC1.slice(0, 80), newC1: newC1.slice(0, 80), reason })) };
writeFileSync(join(ROOT, "scripts/vocab/plan047-report.json"), JSON.stringify(report, null, 2));
console.log(`Report disimpan: scripts/vocab/plan047-report.json`);
