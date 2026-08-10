import { readFileSync } from "node:fs";

// Minimal re-implementation of research-clues internals for debugging
const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ");

const modernize = (s) =>
  s
    .replace(/\byg\b/g, "yang").replace(/\bdgn\b/g, "dengan").replace(/\bdng\b/g, "dengan")
    .replace(/\btt\b/g, "tentang").replace(/\bkpd\b/g, "kepada").replace(/\bsbg\b/g, "sebagai")
    .replace(/\bdr\b/g, "dari").replace(/\btsb\b/g, "tersebut").replace(/\bspt\b/g, "seperti")
    .replace(/\bud\b/g, "untuk").replace(/\bpd\b/g, "pada").replace(/\bkrn\b/g, "karena")
    .replace(/\bmsl\b/g, "misalnya").replace(/\bdl\b/g, "dalam").replace(/\bsdh\b/g, "sudah")
    .replace(/\bdll\b/g, "dan lain-lain").replace(/\bdsb\b/g, "dan sebagainya");

function cleanDef(raw) {
  let d = decode(raw).replace(/<i>.*?<\/i>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^\?/.test(d)) return "";
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  d = d.split(/:\s+(?=[a-zA-Z(])/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "");
  d = d.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "");
  d = d.replace(/;\s*Berasal dari bahasa\s+[A-Za-z]+.*$/i, "");
  d = d.replace(/^Berasal dari bahasa [A-Za-z]+\s*/i, "");
  d = d.replace(/^\([^)]*\)\s+(?=[a-z])/, "");
  d = d.replace(/^Istilah\s+\w+\s+(?=[a-z]{4,})/i, "");
  d = d.replace(/^\[\wà-ÿÀ-ÿ]+\]\s*/i, "");
  d = d.replace(/^\(\w{2,4}\)\s*/i, "");
  d = d.replace(/^(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\s*\(\s*\d+\s*\)\s*/i, "");
  d = d.replace(/^(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\s+\d+\s*/i, "");
  d = d.replace(/\s*:\s*\d+\s*[a-z].*$/i, "");
  d = d.replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  return modernize(d);
}

function hasUnbalancedParen(t) {
  if (!t) return false;
  let depth = 0;
  for (const ch of t) {
    if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth < 0) return true; }
  }
  return depth !== 0;
}

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const e = j.dictionary ?? j;
for (const w of ["tenteram", "berderap"]) {
  console.log(`\n===== ${w} =====`);
  const hits = e.filter((x) => (x.word || "").trim().toLowerCase() === w);
  for (let i = 0; i < Math.min(hits.length, 3); i++) {
    const raw = hits[i].arti ?? "";
    console.log(`entry ${i}: has <b> = ${raw.includes("<b>")}`);
    console.log(`  cleanDef(raw): ${JSON.stringify(cleanDef(raw).slice(0, 160))}`);
    // simulate generateClues c1 gate
    const old = { c1: "aman; damai (tidak terdapat kekacauan)" };
    console.log(`  simulate isGood(old c1): hasUnbalanced=${hasUnbalancedParen(old.c1)}`);
  }
}
