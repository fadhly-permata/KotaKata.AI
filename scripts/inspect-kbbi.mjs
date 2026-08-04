import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;
console.log("entry keys:", Object.keys(entries[0]));
for (const w of ["sekarang", "beberapa", "mengerti", "semuanya", "defensif", "briologi"]) {
  const m = entries.filter((e) => (e.word ?? "").trim().toLowerCase() === w);
  console.log("=== " + w + " (" + m.length + " entries) ===");
  m.slice(0, 2).forEach((e) => console.log(JSON.stringify(e).slice(0, 500)));
}
