import { readFileSync, readdirSync } from "node:fs";

const RE = /^  \[\"([^\"]+)\",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const WEAK = [
  /^merupakan kata/i,
  /^hal yang berkaitan dengan/i,
  /^berkaitan dengan adanya/i,
  /^berkaitan dengan kegiatan/i,
  /^bersifat [a-z·]{2,16}$/i,
];
const isWeak = (c1, c2, c3) => [c1, c2, c3].some((c) => WEAK.some((re) => re.test(c ?? "")));

for (const t of [10, 9, 8]) {
  const dir = "src/data/vocabulary";
  const files = readdirSync(dir).filter((f) => f.startsWith(`tier${t}`) && f.endsWith(".ts")).sort();
  const rows = [];
  for (const f of files) {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    rows.push(...[...src.matchAll(RE)].map((m) => [m[1], m[2], m[3], m[4]]));
  }
  const weak = rows.filter(([, c1, c2, c3]) => isWeak(c1, c2, c3));
  console.log(`\n=== TIER ${t} (${weak.length}) ===`);
  weak.slice(0, 12).forEach(([w, c1, c2, c3]) => {
    console.log(`  ${w}\n    c1: ${c1.slice(0, 80)}\n    c2: ${c2.slice(0, 80)}\n    c3: ${c3.slice(0, 80)}`);
  });
}
