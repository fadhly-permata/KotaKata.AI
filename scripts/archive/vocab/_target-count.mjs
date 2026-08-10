// Count words with weak/fallback clue patterns per tier (reads part files too).
import { readFileSync, readdirSync } from "node:fs";

const RE = /^  \[\"([^\"]+)\",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

const WEAK = [
  /^merupakan kata/i,
  /^hal yang berkaitan dengan/i,
  /^berkaitan dengan adanya/i,
  /^berkaitan dengan kegiatan/i,
  /^bersifat [a-z·]{2,16}$/i,
];

for (let t = 1; t <= 10; t++) {
  const dir = "src/data/vocabulary";
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(`tier${t}`) && f.endsWith(".ts"))
    .sort();
  const rows = [];
  for (const f of files) {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    rows.push(...[...src.matchAll(RE)].map((m) => [m[1], m[2], m[3], m[4]]));
  }
  const weak = rows.filter(([, c1, c2, c3]) =>
    [c1, c2, c3].some((c) => WEAK.some((re) => re.test(c))),
  );
  console.log(`tier${t}: ${weak.length}/${rows.length} lemah  e.g. ${weak.slice(0, 2).map((w) => w[0]).join(", ")}`);
}
