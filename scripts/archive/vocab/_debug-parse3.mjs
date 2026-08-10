import { readFileSync } from "node:fs";

// Duplicate minimal parser pieces from research-clues.mjs
const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");

const modernize = (s) =>
  s
    .replace(/\byg\b/g, "yang")
    .replace(/\bdgn\b/g, "dengan")
    .replace(/\bdng\b/g, "dengan")
    .replace(/\btt\b/g, "tentang")
    .replace(/\bkpd\b/g, "kepada")
    .replace(/\bsbg\b/g, "sebagai")
    .replace(/\bdr\b/g, "dari")
    .replace(/\btsb\b/g, "tersebut")
    .replace(/\bspt\b/g, "seperti")
    .replace(/\bud\b/g, "untuk")
    .replace(/\bpd\b/g, "pada")
    .replace(/\bkrn\b/g, "karena")
    .replace(/\bmsl\b/g, "misalnya")
    .replace(/\bdl\b/g, "dalam")
    .replace(/\bsdh\b/g, "sudah")
    .replace(/\bdll\b/g, "dan lain-lain")
    .replace(/\bdsb\b/g, "dan sebagainya");

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
  d = d.replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  return modernize(d);
}

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const e = j.dictionary ?? j;
for (const w of ["tenteram", "berderap"]) {
  const hits = e.filter((x) => (x.word || "").trim().toLowerCase() === w);
  console.log(`\n===== ${w} (${hits.length} entries) =====`);
  hits.slice(0, 3).forEach((h, i) => {
    console.log(`--- entry ${i} arti raw (first 200):`);
    console.log(JSON.stringify((h.arti ?? "").slice(0, 200)));
    console.log(`--- entry ${i} cleanDef(first sense-ish):`);
    const arti = decode(h.arti ?? "");
    const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    console.log("lines:", JSON.stringify(lines.slice(0, 4)));
    console.log("cleanDef whole:", cleanDef(h.arti ?? "").slice(0, 200));
  });
}
