import { readFileSync } from "node:fs";

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const e = j.dictionary ?? j;
const hits = e.filter((x) => (x.word || "").trim().toLowerCase() === "tenteram");
console.log("entries:", hits.length);
for (const h of hits) {
  console.log("---- arti slice:", JSON.stringify((h.arti ?? "").slice(0, 260)));
}
