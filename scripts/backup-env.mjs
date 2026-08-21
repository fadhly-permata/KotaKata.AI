#!/usr/bin/env node
// ============================================================
// Backup file .env / .env.local sebelum diedit.
// ============================================================
// Usage:
//   node scripts/backup-env.mjs          # backup .env.local
//   node scripts/backup-env.mjs --all    # backup .env + .env.local
//   node scripts/backup-env.mjs --restore  # restore dari .bak terakhir
// ============================================================
import { existsSync, copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const isAll = args.includes("--all");
const isRestore = args.includes("--restore");

const files = isAll ? [".env.local", ".env"] : [".env.local"];

function backup(file) {
  const src = join(ROOT, file);
  const dst = src + ".bak";
  if (existsSync(src)) {
    copyFileSync(src, dst);
    console.log(`✅ Backup: ${file} → ${file}.bak`);
  } else {
    console.log(`⚠️  Skip: ${file} tidak ditemukan`);
  }
}

function restore(file) {
  const src = join(ROOT, file);
  const bak = src + ".bak";
  if (existsSync(bak)) {
    copyFileSync(bak, src);
    console.log(`✅ Restore: ${file}.bak → ${file}`);
  } else {
    console.log(`⚠️  Skip: ${file}.bak tidak ditemukan`);
  }
}

if (isRestore) {
  for (const f of files) restore(f);
} else {
  for (const f of files) backup(f);
}
