// Bandingkan daftar kata file tier versi asli vs versi sekarang.
// Usage: node scripts/check-tier-order.mjs <file-asli> <file-sekarang>
import { readFileSync } from "node:fs";

const [origPath, curPath] = process.argv.slice(2);
const re = /^\s*\[\s*"((?:[^"\\]|\\.)*)"\s*,/gm;

function words(p) {
  const s = readFileSync(p, "utf8");
  const out = [];
  let m;
  while ((m = re.exec(s))) out.push(m[1]);
  return out;
}

const orig = words(origPath);
const cur = words(curPath);
const oi = new Map(orig.map((w, i) => [w, i]));

const missing = orig.filter((w) => !cur.includes(w));
const extra = cur.filter((w) => !oi.has(w));

let mono = true;
const badIdx = [];
for (let i = 1; i < cur.length; i++) {
  if (oi.get(cur[i]) < oi.get(cur[i - 1])) {
    mono = false;
    if (badIdx.length < 6) badIdx.push(i);
  }
}

console.log("orig:", orig.length, "| cur:", cur.length);
console.log("MISSING (ada di asli, tidak di sekarang):", missing.length, missing.join(", "));
console.log("EXTRA (ada di sekarang, tidak di asli):", extra.length, extra.join(", "));
console.log("urutan monotonik sama dengan asli:", mono);
badIdx.forEach((i) => console.log(`  loncat di #${i}: ${cur[i - 1]} -> ${cur[i]}`));

// posisi penyisipan utk kata yang hilang (berdasarkan urutan asli)
for (const w of missing) {
  const oPos = oi.get(w);
  const prev = oPos > 0 ? orig[oPos - 1] : "(AWAL)";
  const next = oPos < orig.length - 1 ? orig[oPos + 1] : "(AKHIR)";
  console.log(`  sisipkan '${w}' setelah '${prev}' sebelum '${next}'`);
}
