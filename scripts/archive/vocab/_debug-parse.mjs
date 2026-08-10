import { readFileSync } from "node:fs";

const KBBI_PATH = "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(KBBI_PATH, "utf8"));
const entries = j.dictionary ?? j;
const byWord = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!byWord.has(w)) byWord.set(w, []);
  byWord.get(w).push(e.arti ?? "");
}

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const modernize = (s) =>
  s
    .replace(/\byg\b/g, "yang")
    .replace(/\bdgn\b/g, "dengan")
    .replace(/\btt\b/g, "tentang")
    .replace(/\bsbg\b/g, "sebagai")
    .replace(/\bdr\b/g, "dari")
    .replace(/\bdll\b/g, "dan lain-lain")
    .replace(/\bdsb\b/g, "dan sebagainya");

function cleanDefText(raw) {
  let d = decode(raw)
    .replace(/<i>.*?<\/i>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!d || d.length < 2) return "";
  d = d.replace(/^\?\s*/, "");
  d = d.replace(/^\d+\s*\)?\s*/, "");
  d = d.replace(/^\(?\d+\)?\s*/, "");
  d = d.replace(/;.*$/, "");
  d = d.replace(/[;,:,.…]+$/g, "").trim();
  if (d.length < 2) return "";
  return modernize(d);
}

function parseKbbiEntry(artiRaw) {
  const arti = decode(artiRaw ?? "");
  if (!arti) return null;
  const out = { def: "", senses: [], example: null, klass: "" };
  if (arti.includes("<b>")) {
    const m = arti.match(/^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*(?:\/[^/]*\/)?\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s);
    if (m) {
      const classMatch = m[1].match(/<i>([^<]*)<\/i>/);
      out.klass = classMatch ? (classMatch[1].trim().split(/\s+/)[0] ?? "") : "";
      const defMatch = m[2].match(/^(.*?)(?=<i>|<b>|<br>|$)/s);
      out.def = cleanDefText(defMatch ? defMatch[1] : m[2]);
      out.senses = arti
        .split(/<b>\d+<\/b>/)
        .slice(1)
        .map((p) => cleanDefText(p))
        .filter(Boolean);
      const exMatch = m[2].match(/<i>([^<]{3,})(?:<\/i>|$)/);
      if (exMatch) out.example = modernize(exMatch[1].replace(/\s+/g, " ").trim());
    }
  } else {
    const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let meaning = lines.length >= 2 && /^[a-z·.]+$/.test(lines[0] ?? "") ? lines.slice(1).join(" ") : lines[0] ?? "";
    const lm = meaning.match(/\b(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\s*/i);
    if (lm) {
      out.klass = lm[1].toLowerCase();
      meaning = meaning.slice(lm.index + lm[0].length);
    }
    const colIdx = meaning.indexOf(":");
    if (colIdx > -1) {
      out.example = modernize(meaning.slice(colIdx + 1).replace(/\s+/g, " ").trim());
      meaning = meaning.slice(0, colIdx);
    }
    out.def = cleanDefText(meaning);
    for (const line of lines) {
      const nm = line.match(/^\(?(\d+)\)?\s*(.*)$/);
      if (nm) {
        const d = cleanDefText(nm[2]);
        if (d && d.length >= 8 && d !== out.def) out.senses.push(d);
      }
    }
  }
  if (!out.def && !out.senses.length) return null;
  return out;
}

for (const w of ["teratasi", "dagangan", "menyalak", "seadanya", "kolektif", "diameter"]) {
  const artis = byWord.get(w) ?? [];
  console.log(`\n=== ${w} (${artis.length} entries) ===`);
  artis.slice(0, 2).forEach((a) => console.log("RAW:", a.slice(0, 200)));
  const p = parseKbbiEntry(artis[0] ?? "");
  console.log("PARSED:", p ? JSON.stringify(p).slice(0, 300) : "null");
}
