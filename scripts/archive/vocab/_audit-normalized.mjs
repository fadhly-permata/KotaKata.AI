// Audit: kolom yang nyaris sama secara ternormalisasi (paren/kolom beda tipis)
// atau isian satu-kata yang berasal dari c1.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/gi, "");
const nearSame = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return x === y || (x.length >= 12 && y.length >= 12 && (x.startsWith(y) || y.startsWith(x)));
};

const bad = [];
let total = 0;
for (const f of files.sort()) {
  const lines = readFileSync(join(dir, f), "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    total++;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const cols = [c1, c2, c3];
    // nearSame antar kolom
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 3; b++)
        if (nearSame(cols[a], cols[b])) {
          bad.push({ f, w, why: `nearSame c${a + 1}~c${b + 1}`, cols });
          break;
        }
    // isian satu-kata yang merupakan kata dari c1 (fragmen bocor)
    const n1 = norm(c1);
    for (let k = 1; k < 3; k++) {
      const t = cols[k].trim();
      if (t.length >= 4 && t.length <= 16 && !/^[A-Z]/.test(t) && !t.startsWith("Contoh:") && !t.startsWith("Sinonim:") && !t.startsWith("Antonim:") && !/Kata serapan/.test(t)) {
        const words = n1.split(/(?=.)/).join("").split("").join("");
        const nk = norm(t);
        // kata tunggal yang muncul utuh di c1
        if (nk.length >= 4 && new RegExp(`\\b${nk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(n1)) {
          bad.push({ f, w, why: `single-word c${k + 1} in c1`, cols });
        }
      }
    }
  }
}
// dedup by word
const seen = new Set();
const uniq = bad.filter((b) => (seen.has(b.w) ? false : seen.add(b.w)));
console.log(`total rows: ${total} | suspect fills: ${uniq.length}`);
uniq.slice(0, 30).forEach((b) => console.log(`  ${b.f} ${b.w} [${b.why}] ${JSON.stringify(b.cols).slice(0, 150)}`));
