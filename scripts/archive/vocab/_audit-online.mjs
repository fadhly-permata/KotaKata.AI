import { readFileSync } from "node:fs";

const r = JSON.parse(readFileSync("/tmp/apply-report.json", "utf8"));
const c = r.results.filter((x) => x.changed);
console.log("changed:", c.length);

const EN =
  /\b(the|and|you|your|with|this|that|from|for|are|was|were|have|has|will|would|about|here|there|their|what|when|where|which|who|how|why|to|of|in|it|is|be|as|by|at|videos|music|watch|share|news|login|account|email|password|site|home|page|menu|search|world|youtube|facebook|instagram|welcome)\b/i;

const unbalanced = (t) => {
  let d = 0;
  for (const ch of t) {
    if (ch === "(") d++;
    else if (ch === ")") {
      d--;
      if (d < 0) return true;
    }
  }
  return d !== 0;
};

let bad = 0;
for (const x of c) {
  const n = x.new;
  const esc = x.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leak = n.some((v) => new RegExp(`\\b${esc}\\b`, "i").test(v));
  const enJunk = n.some((v) => (v.match(EN) ?? []).length >= 4);
  const paren = n.some((v) => unbalanced(v));
  if (leak || enJunk || paren) {
    bad++;
    console.log("SUSPECT:", x.word, { leak, enJunk, paren }, JSON.stringify(n));
  }
}
console.log("suspects:", bad);
