// Merge: untuk row yang masih placeholder ("Merupakan kata"), ambil isian dari
// backup pre-revert (/tmp/tier-backup) HANYA bila hasil gabungan lolos QA
// (tidak kosong, tidak sama persis, tidak saling memuat frasa >= 12 huruf).
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
const backupDir = "/tmp/tier-backup";
const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));

const qaIssue = (a, b) => {
  if (!a || !b) return false;
  const A = a.trim();
  const B = b.trim();
  if (A === B) return true;
  if (A.length >= 12 && B.length >= 12 && (A.includes(B) || B.includes(A))) return true;
  return false;
};

let merged = 0;
let keptPlaceholder = 0;
let skippedBad = 0;
const applied = [];

for (const f of files.sort()) {
  const path = join(dir, f);
  const bpath = join(backupDir, f);
  if (!existsSync(bpath)) continue;
  const lines = readFileSync(path, "utf8").split("\n");
  const blines = readFileSync(bpath, "utf8").split("\n");
  const bmap = new Map();
  for (const bl of blines) {
    const m = bl.match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (m) bmap.set(m[1], [m[2], m[3], m[4]]);
  }
  let dirty = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const cur = [c1, c2, c3];
    if (!cur.some((c) => /^merupakan kata/i.test(c))) continue;
    const bk = bmap.get(w);
    if (!bk || bk.every((v, k) => v === cur[k])) {
      keptPlaceholder++;
      continue;
    }
    // Gabungkan: kolom placeholder dari backup, kolom lain tetap nilai sekarang.
    const mergedRow = cur.map((c, k) => (/^merupakan kata/i.test(c) ? bk[k] : c));
    const clean =
      mergedRow.every((c) => c && c.trim().length >= 4) &&
      !mergedRow.some((c) => /^merupakan kata/i.test(c)) &&
      !qaIssue(mergedRow[0], mergedRow[1]) &&
      !qaIssue(mergedRow[0], mergedRow[2]) &&
      !qaIssue(mergedRow[1], mergedRow[2]) &&
      !/^(sinonim|antonim|contoh)\b/i.test(mergedRow[0].trim());
    if (!clean) {
      skippedBad++;
      continue;
    }
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines[i] = `  ["${w}", "${esc(mergedRow[0])}", "${esc(mergedRow[1])}", "${esc(mergedRow[2])}"],`;
    dirty = true;
    merged++;
    if (applied.length < 15) applied.push(`${w}: ${JSON.stringify(mergedRow).slice(0, 140)}`);
  }
  if (dirty) writeFileSync(path, lines.join("\n"));
}
console.log(`Merged: ${merged} | kept placeholder: ${keptPlaceholder} | skipped bad: ${skippedBad}`);
applied.forEach((a) => console.log("  " + a));
