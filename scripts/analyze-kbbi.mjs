import { readFileSync, readdirSync } from "node:fs";
const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;
const byWord = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!byWord.has(w)) byWord.set(w, []);
  byWord.get(w).push(e);
}

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// gather all tier words
const dir = "src/data/vocabulary";
const words = new Set();
for (const f of readdirSync(dir).filter((f) => /^tier\d+\.ts$/.test(f))) {
  const s = readFileSync(dir + "/" + f, "utf8");
  for (const m of s.matchAll(/^  \["([^"]+)",/gm)) words.add(m[1]);
}

let hasHomograph = 0, hasNumSenses = 0, hasExample = 0, hasSyn = 0, total = 0;
const stats = { multiEntry: 0, oneEntry: 0 };
for (const w of words) {
  total++;
  const es = byWord.get(w) ?? [];
  if (es.length > 1) { stats.multiEntry++; hasHomograph++; }
  else stats.oneEntry++;
  for (const e of es) {
    const arti = decode(e.arti ?? "");
    if (/<b>\d+<\/b>/.test(arti)) { hasNumSenses++; break; }
  }
  for (const e of es) {
    const arti = decode(e.arti ?? "");
    if (/:.*<i>|:\s*[^<]{6,}/.test(arti)) { hasExample++; break; }
  }
  for (const e of es) {
    const arti = decode(e.arti ?? "").replace(/<[^>]+>/g, " ");
    const parts = arti.split(";");
    if (parts.some((p) => /^[a-z]{2,14}$/.test(p.trim().replace(/[()]/g, " ").replace(/\s+/g, " ").trim()))) { hasSyn++; break; }
  }
}
console.log({ total, stats, hasHomograph, hasNumSenses, hasExample, hasSyn });
