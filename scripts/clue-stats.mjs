import { readFileSync, readdirSync } from "node:fs";
const dir = "src/data/vocabulary";
const files = readdirSync(dir).filter(f => /^tier\d+\.ts$/.test(f)).sort();
for (const f of files) {
  const s = readFileSync(dir + "/" + f, "utf8");
  const lines = s.split("\n").filter(l => /^  \[/.test(l));
  const nVar = lines.filter(l => l.includes('"Bentuk lain')).length;
  const nDup = lines.filter(l => {
    const parts = l.match(/^  \["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\],$/);
    if (!parts) return false;
    return parts[2] === parts[3];
  }).length;
  const nFall = lines.filter(l => l.includes('"Huruf pertama')).length;
  const nAnt = lines.filter(l => l.includes('"Antonim')).length;
  console.log(`${f}: varian=${nVar} dup=${nDup} antonim=${nAnt} fallback=${nFall}`);
}