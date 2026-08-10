import { readFileSync } from "node:fs";

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;
const byWord = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!byWord.has(w)) byWord.set(w, []);
  byWord.get(w).push(e.arti ?? "");
}
for (const w of ["bertumpu", "estimasi", "mendekap", "mengepel", "mengeong", "berdetik"]) {
  console.log(`\n=== ${w} ===`);
  (byWord.get(w) ?? []).forEach((a, i) => console.log(`[${i}] ${a.slice(0, 320)}`));
}
