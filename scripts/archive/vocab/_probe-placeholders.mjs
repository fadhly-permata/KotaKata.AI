// Probe: untuk row yang masih placeholder ("Merupakan kata"), adakah bahan di cache?
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");
const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));
const cacheDir = "/tmp/kotakata-research-cache";

let total = 0;
let withExample = 0;
let withSense = 0;
let withKbbi = 0;
let samples = [];
for (const f of files.sort()) {
  const lines = readFileSync(join(dir, f), "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^  \["([^"]+)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\],$/);
    if (!m) continue;
    const [w, c1, c2, c3] = [m[1], m[2], m[3], m[4]];
    const ph = [c1, c2, c3].filter((c) => /^merupakan kata/i.test(c)).length;
    if (!ph) continue;
    total++;
    let k = null;
    const cf = join(cacheDir, `${w}.json`);
    if (existsSync(cf)) {
      try {
        k = JSON.parse(readFileSync(cf, "utf8"));
      } catch {}
    }
    if (k?.kbbi?.example) withExample++;
    if (k?.kbbi?.senses?.length) withSense++;
    if (k?.kbbi) withKbbi++;
    if (samples.length < 12) {
      samples.push(
        `${w} | ex:${k?.kbbi?.example ? "Y" : "-"} senses:${k?.kbbi?.senses?.length ?? 0} | ${JSON.stringify([c1, c2, c3]).slice(0, 130)}`,
      );
    }
  }
}
console.log(`Placeholder rows: ${total}`);
console.log(`  with kbbi: ${withKbbi} | with senses: ${withSense} | with example: ${withExample}`);
console.log("--- samples ---");
samples.forEach((s) => console.log("  " + s));
