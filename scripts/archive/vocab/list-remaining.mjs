// Daftar ringkas kata yang masih punya placeholder.
import { readFileSync } from "node:fs";

const RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;
const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;
const byWordRaw = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!byWordRaw.has(w)) byWordRaw.set(w, []);
  byWordRaw.get(w).push(e.arti ?? "");
}

for (const t of [10, 9, 8, 7, 6]) {
  const src = readFileSync(`src/data/vocabulary/tier${t}.ts`, "utf8");
  const rows = [...src.matchAll(RE)].map(m => [m[1], m[2], m[3], m[4]]);
  const list = rows.filter(([, , c2, c3]) => /^merupakan kata/i.test(c2) || /^merupakan kata/i.test(c3));
  console.log(`\n===== TIER ${t} (${list.length}) =====`);
  for (const [word, c1] of list) {
    const arti = (byWordRaw.get(word) ?? [])[0] ?? "";
    const clean = arti.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
    console.log(`${word}\t${c1.slice(0, 55)}\t|| ${clean}`);
  }
}
