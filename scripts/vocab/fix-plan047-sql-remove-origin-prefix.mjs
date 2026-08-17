#!/usr/bin/env node
// ============================================================
// PLAN-047: Hapus prefix "Kata serapan dari bahasa X:" dan
//           "Kata dari bahasa X:" dari vocabulary.sql
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const sqlPath = join(ROOT, "supabase", "data", "vocabulary.sql");

const src = readFileSync(sqlPath, "utf8");

// Pola untuk menghapus prefix
// Pattern 1: "Kata serapan dari bahasa X: " diikuti definisi
const PATTERN1 = /Kata serapan dari bahasa \w+: /g;
// Pattern 2: "Kata dari bahasa X: " diikuti definisi  
const PATTERN2 = /Kata dari bahasa \w+: /g;

const before1 = (src.match(PATTERN1) || []).length;
const before2 = (src.match(PATTERN2) || []).length;

let fixed = src.replace(PATTERN1, "");
fixed = fixed.replace(PATTERN2, "");

const after1 = (fixed.match(PATTERN1) || []).length;
const after2 = (fixed.match(PATTERN2) || []).length;

console.log("=== PLAN-047: Hapus Prefix Origin dari SQL ===");
console.log(`Prefix "Kata serapan dari bahasa X:": ${before1} → ${after1}`);
console.log(`Prefix "Kata dari bahasa X:": ${before2} → ${after2}`);
console.log(`Total dihapus: ${before1 + before2}`);

if (before1 + before2 > 0) {
  writeFileSync(sqlPath, fixed);
  console.log("✓ File vocabulary.sql diperbarui");
} else {
  console.log("✓ Tidak ada prefix yang perlu dihapus");
}
