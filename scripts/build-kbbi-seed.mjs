// Builds src/data/vocabulary/tier1..10.ts from real KBBI data.
//
// Sources:
//   KBBI JSON   : https://github.com/dyazincahya/KBBI-SQL-database (dictionary__JSON.json)
//   Frequency   : https://github.com/hermitdave/FrequencyWords (content/2018/id/id_50k.txt)
//
// Rules:
//   - Only plain single words [a-z], length 3..10 (grid is 10x10).
//   - Exclude archaic/classical (arkaik, klasik), colloquial (cakapan), dialect (dialek),
//     and function words (p, pron, konj, prep). Exclude cross-references.
//   - Prefer the modern plain-text format over the legacy HTML format for duplicates.
//   - One word per tier, no duplicates across the whole dataset.
//   - Ordered by frequency (common words first) within each length bucket.
//
// Tier buckets (1000 words each):
//   t1: 3-4 letters | t2: 5 | t3: 6 | t4: 7 | t5: 8 | t6: 9 | t7: 10
//   t8: 10 (batch 2) | t9: 9 (batch 2) | t10: 8 (batch 2)
//
// Usage: node scripts/build-kbbi-seed.mjs [kbbi.json] [freq.txt]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const kbbiPath = process.argv[2] ?? "/tmp/kbbi.json";
const freqPath = process.argv[3] ?? "/tmp/id_freq.txt";
const outDir = join(ROOT, "src", "data", "vocabulary");

const WORDS_PER_TIER = 1000;
const MAX_LEN = 10; // grid 10x10

// ---------------------------------------------------------------- sources
const j = JSON.parse(readFileSync(kbbiPath, "utf8"));
const entries = j.dictionary ?? j;

const freq = new Map();
for (const line of readFileSync(freqPath, "utf8").split("\n")) {
  const parts = line.trim().split(/\s+/);
  if (parts.length >= 2) {
    const n = Number(parts[parts.length - 1]);
    if (Number.isFinite(n)) freq.set(parts[0].toLowerCase(), n);
  }
}

// ---------------------------------------------------------------- parser
const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const CLASS_LABEL = {
  n: "Kata benda",
  v: "Kata kerja",
  a: "Kata sifat",
  adv: "Kata keterangan",
  num: "Kata bilangan",
  interj: "Kata seru",
  "": "Kata dalam KBBI",
};
const FUNCTION_CLASSES = new Set(["p", "pron", "konj", "prep"]);
const LABEL_CODE = {
  Nomina: "n",
  Verba: "v",
  Adjektiva: "a",
  Adverbia: "adv",
  Numeralia: "num",
  Pronomina: "pron",
  Partikel: "p",
  Interjeksi: "interj",
  Konjungsi: "konj",
  Preposisi: "prep",
};

const labelFor = (klass) => CLASS_LABEL[klass.split(/\s+/)[0]] ?? "Kata dalam KBBI";

const cleanDef = (raw) => {
  let def = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // cut example sentences / derived forms
  const colon = def.indexOf(":");
  if (colon >= 0) def = def.slice(0, colon);
  // cut at first derived form: "; ber·a·ku v …" (syllabified words after the main def)
  def = def.replace(/(;\s*\S*·.*$)/, "");
  // strip sense numbering "(1) " / "1 " anywhere
  def = def.replace(/\(\d+\)\s*/g, "").replace(/^\d+\s+/, "");
  def = def.replace(/^[;,\s]+/, "").replace(/[;,\s]+$/g, "").trim();
  if (!def) return "";
  if (def.length < 3) return "";
  if (!/[a-z]/i.test(def)) return "";
  if (def.length > 110) def = `${def.slice(0, 107).trimEnd()}…`;
  return def;
};

const LABEL_RE = /\b(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\([^)]*\))?\s*/;
const SHORT_CODE_RE = /^[a-z·.]+\s+(n|v|a|adv|num|p|pron|ark|kl|cak)(?=\s|$)/;
const AFFIX_RE = /bentuk terikat|singkatan|akronim|kependekan|lambang/i;

/**
 * Parse a plain-text meaning line → { klass, def } | "reason".
 * Handles prefixes: /pronunciation/, ", variant", "Berasal dari bahasa X",
 * "[Skt]", "Istilah …", "Arkais…", "Cakapan…", "Dialek…", "Lihat …".
 */
function parsePlainMeaning(meaning) {
  if (/\bLihat\b/i.test(meaning)) return "crossref";
  if (/\b(Arkais|Klasik|Cakapan|Dialek)\b/i.test(meaning) || /\btidak baku\b/i.test(meaning))
    return "low-quality";

  const lm = meaning.match(LABEL_RE);
  let klass = "";
  let def = meaning;
  if (lm) {
    klass = LABEL_CODE[lm[1]] ?? "";
    def = meaning.slice(lm.index + lm[0].length);
  } else {
    // bracketed short code: "[pron] …" / "[n] …"
    const bc = meaning.match(/^\[(adv|num|pron|ark|kl|cak|n|v|a|p)\]\s*/);
    if (bc) {
      klass = bc[1];
      def = meaning.slice(bc[0].length);
    } else {
      // short code form: "aku pron …" / "se·ka·rang n …"
      const sc = meaning.match(SHORT_CODE_RE);
      if (sc) {
        klass = sc[1];
        def = meaning.slice(sc[0].length);
      }
    }
  }
  if (klass === "ark" || klass === "kl" || klass === "cak") return "low-quality";
  if (AFFIX_RE.test(klass)) return "low-quality";
  if (FUNCTION_CLASSES.has(klass)) return "function-word";

  // strip pronunciation /.../, leading variants ", x.y.z", etymology, [subject], "Istilah …"
  def = def
    .replace(/^\/[^/]*\//, " ")
    .replace(/^,?\s*[a-z·.]+\s*,?\s*/, " ")
    .replace(/^Berasal dari bahasa [A-Za-z]+/, " ")
    .replace(/^\[[^\]]*\]/, " ")
    .replace(/^Istilah [a-z ]+?(?=\s+[a-z])/, " ")
    .replace(/\s+/g, " ")
    .trim();

  const clean = cleanDef(def);
  if (!clean) return "no-def";
  return { klass, def: clean };
}

/**
 * Parse one KBBI entry → { word, klass, def, fmt } | null (skip) | "reason" (dropped).
 * fmt: "plain" (modern, preferred) | "html" (legacy).
 */
function parseEntry(e) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) return null;
  if (word.length < 3 || word.length > MAX_LEN) return null;

  const arti = decode(e.arti ?? "");
  if (!arti) return null;

  // cross-ref: "<b>lema ? target" or "lema ? target"
  if (arti.includes(" ? ")) return "crossref";

  // ---- HTML format (legacy): <b>lema</b> <i>klass</i> …
  if (arti.includes("<b>")) {
    const m = arti.match(
      /^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*(?:\/[^/]*\/)?\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s,
    );
    if (!m) return null;
    const tokens = m[1];
    const rest = m[2];
    const classMatch = tokens.match(/<i>([^<]*)<\/i>/);
    const klass = classMatch ? classMatch[1].trim() : "";
    if (/(^|\s)(ark|kl|cak)(\s|$)/i.test(klass) || AFFIX_RE.test(klass)) return "low-quality";
    if (FUNCTION_CLASSES.has(klass.split(/\s+/)[0])) return "function-word";
    const defMatch = rest.match(/^(.*?)(?=<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : rest);
    if (!def || def.toLowerCase() === word) return "no-def";
    return { word, klass, def, fmt: "html", arti };
  }

  // ---- plain format (preferred): "kata.dengan.titik" + meaning, or single-line meaning
  const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let meaning = null;
  if (lines.length >= 2 && /^[a-z·.]+$/.test(lines[0])) {
    meaning = lines.slice(1).join(" ");
  } else if (lines.length === 1) {
    meaning = lines[0];
  }
  if (meaning) {
    const r = parsePlainMeaning(meaning);
    if (typeof r === "string") return r;
    if (r.def.toLowerCase() === word) return "no-def";
    return { word, ...r, fmt: "plain", arti };
  }

  return null;
}

// ---------------------------------------------------------------- collect
const byWord = new Map(); // word → {entry, fmt}
const dropped = { crossref: 0, "low-quality": 0, "function-word": 0, "no-def": 0, other: 0 };

for (const e of entries) {
  const r = parseEntry(e);
  if (r === null) {
    dropped.other++;
    continue;
  }
  if (typeof r === "string") {
    dropped[r]++;
    continue;
  }
  const cur = byWord.get(r.word);
  // prefer plain (modern) over html (legacy)
  if (!cur || (cur.fmt === "html" && r.fmt === "plain")) byWord.set(r.word, r);
}

const candidates = [...byWord.values()].map((c) => ({
  word: c.word,
  klass: c.klass,
  def: c.def,
  arti: c.arti,
  freq: freq.get(c.word) ?? 0,
}));

// ---------------------------------------------------------------- tier buckets
const byLen = new Map();
for (const c of candidates) {
  const L = c.word.length;
  if (!byLen.has(L)) byLen.set(L, []);
  byLen.get(L).push(c);
}
for (const arr of byLen.values()) arr.sort((a, b) => b.freq - a.freq);

const take = (arr, n) => (arr ?? []).slice(0, n);
const len3_4 = [...(byLen.get(3) ?? []), ...(byLen.get(4) ?? [])].sort((a, b) => b.freq - a.freq);
const len5 = byLen.get(5) ?? [];
const len6 = byLen.get(6) ?? [];
const len7 = byLen.get(7) ?? [];
const len8 = byLen.get(8) ?? [];
const len9 = byLen.get(9) ?? [];
const len10 = byLen.get(10) ?? [];

const tiers = [
  [1, take(len3_4, 1000)],
  [2, take(len5, 1000)],
  [3, take(len6, 1000)],
  [4, take(len7, 1000)],
  [5, take(len8, 1000)],
  [6, take(len9, 1000)],
  [7, take(len10, 1000)],
  [8, take(len10, 2000).slice(1000)],
  [9, take(len9, 2000).slice(1000)],
  [10, take(len8, 2000).slice(1000)],
];

// ---------------------------------------------------------------- validate
const allWords = new Set();
const errors = [];
for (const [tier, words] of tiers) {
  if (words.length < WORDS_PER_TIER) {
    errors.push(`tier${tier}: cuma ${words.length} kata (butuh ${WORDS_PER_TIER})`);
  }
  for (const w of words) {
    if (allWords.has(w.word)) errors.push(`duplikat: ${w.word} di tier ${tier}`);
    allWords.add(w.word);
  }
}
if (errors.length) {
  console.error("VALIDASI GAGAL:");
  errors.slice(0, 30).forEach((e) => console.error("  -", e));
  process.exit(1);
}

// ---------------------------------------------------------------- clue generators
// Clue 2 & 3 di-improvisasi ala AI: pakai materi SEMANTIS asli KBBI
// (contoh kalimat asli, sinonim) — bukan statistik huruf yang kaku & absurd.
const hashOf = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// KBBI sering menulis "definisi; sinonim" — ambil sinonim kata tunggal di belakang titik koma.
function extractSynonym(def, word) {
  if (!def) return null;
  for (const p of def.split(";")) {
    const seg = p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!seg || !/^[a-z]{2,14}$/.test(seg)) continue;
    if (seg === word || /·|\d/.test(seg)) continue;
    return seg;
  }
  return null;
}

// Ambil CONTOH kalimat asli KBBI dari arti mentah (format "definisi: contoh kalimat").
// Contoh → format isian klasik TTS: "ia ___ membaca, tetapi tidak bisa menulis".
function extractExample(arti, word) {
  if (!arti) return null;
  const lowWord = word.toLowerCase();
  const trySeg = (s) => {
    if (!s) return null;
    let t = s
      .replace(/\s*\(\d+\s*\)\s*/g, " ")
      .replace(
        /\b(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\s*\([^)]*\)\s*.*$/i,
        "",
      )
      .replace(/^(?:contoh|peribahasa|~\s*)\s*/i, "")
      .replace(/^\(\d+\s*\)\s*/, "")
      .trim();
    // potong di titik koma yang menandai arti berikutnya / bentuk turunan
    const cut = t.search(/;\s*(?=\d|[a-z·]+[·-])/);
    if (cut >= 0) t = t.slice(0, cut);
    // bersihkan sisa penomoran & tanda baca di ujung
    t = t.replace(/\s*\d+\s*\)?\s*$/s, "").replace(/[;,.…]+\s*$/g, "").trim();
    if (t.length < 5) return null;
    const marker = t.match(/~|--/);
    if (marker) t = t.replace(marker[0], "___");
    else t = t.replace(new RegExp(`\\b${lowWord}\\b`, "i"), "___");
    if (!t.includes("___")) return null;
    if (t.length > 80) t = `${t.slice(0, 77).trimEnd()}…`;
    // ejaan lama → modern biar enak dibaca
    t = t
      .replace(/\byg\b/g, "yang")
      .replace(/\bdgn\b/g, "dengan")
      .replace(/\bkpd\b/g, "kepada")
      .replace(/\bsbg\b/g, "sebagai")
      .replace(/\bdr\b/g, "dari")
      .replace(/\btsb\b/g, "tersebut")
      .replace(/\bspt\b/g, "seperti")
      .replace(/\bud\b/g, "untuk")
      .trim();
    if (t.length < 5 || !t.includes("___")) return null;
    return t;
  };

  const decoded = decode(arti);
  const lines = decoded
    .split(/\r?\n/)
    .map((l) => l.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // 1) per baris: prefer "definisi: contoh" dalam satu sense
  for (const line of lines) {
    const ci = line.toLowerCase();
    const idx = line.indexOf(":");
    if (idx < 0 || !ci.includes(lowWord)) continue;
    const r = trySeg(line.slice(idx + 1));
    if (r) return r;
  }
  // 2) fallback: seluruh teks setelah titik dua pertama yang memuat kata
  const flat = lines.join(" ");
  const ci = flat.toLowerCase();
  if (ci.includes(lowWord) && flat.includes(":")) {
    for (const seg of flat.split(":").slice(1)) {
      if (!seg.toLowerCase().includes(lowWord)) continue;
      const r = trySeg(seg);
      if (r) return r;
    }
  }
  return null;
}

function makeClue2(c) {
  const { word, klass, def, arti } = c;
  const label = labelFor(klass).replace(" dalam KBBI", "");
  const syn = extractSynonym(def, word);
  const ex = extractExample(arti, word);
  const r = hashOf(`${word}#c2`) % 2;
  if (syn && ex) return r === 0 ? `Sinonim: ${syn}` : `Contoh: \"${ex}\"`;
  if (syn) return `Sinonim: ${syn}`;
  if (ex) return `Contoh: \"${ex}\"`;
  const first = word[0].toUpperCase();
  return /Kata/.test(label) ? `${label} berawalan huruf ${first}` : `Dimulai huruf ${first}`;
}

function makeClue3(c) {
  const { word, klass, def, arti } = c;
  const n = word.length;
  const syn = extractSynonym(def, word);
  const ex = extractExample(arti, word);
  const first = word[0].toUpperCase();
  const last = word[n - 1].toUpperCase();
  const label = labelFor(klass).replace(" dalam KBBI", "");
  const c2 = makeClue2(c);
  const usedContoh = c2.includes("Contoh");
  const usedSinonim = c2.includes("Sinonim");
  if (ex && !usedContoh) return `Contoh: \"${ex}\"`;
  if (syn && !usedSinonim) return `Sinonim: ${syn}`;
  // c2 sudah pakai contoh → kasih sinonim (kalau ada)
  if (usedContoh && syn) return `Sinonim: ${syn}`;
  // c2 sudah pakai sinonim → kasih contoh (kalau ada)
  if (usedSinonim && ex) return `Contoh: \"${ex}\"`;
  // c2 sudah pakai satu-satunya materi → fallback huruf biar gak dobel/null
  return `Huruf pertama ${first}, huruf terakhir ${last} (${n} huruf)`;
}

// ---------------------------------------------------------------- emit
mkdirSync(outDir, { recursive: true });
for (const [tier, words] of tiers) {
  const rows = words
    .map((c) => {
      const esc = (s) => s.replace(/"/g, '\\"');
      return `  ["${c.word}", "${esc(c.def)}", "${esc(makeClue2(c))}", "${esc(makeClue3(c))}"],`;
    })
    .join("\n");
  const out = `// Tier ${tier} — 1000 kata asli KBBI (Kamus Besar Bahasa Indonesia), urut berdasarkan frekuensi.
// Sumber definisi : https://github.com/dyazincahya/KBBI-SQL-database (KBBI)
// Sumber frekuensi : https://github.com/hermitdave/FrequencyWords (id_50k)
// Format: [kata, clue_1 (definisi KBBI), clue_2 (petunjuk improvisasi), clue_3 (pola huruf)].
export const TIER_${tier}_WORDS: [string, string, string, string][] = [
${rows}
];
`;
  writeFileSync(join(outDir, `tier${tier}.ts`), out);
}

console.log("OK — 10.000 kata (1000/tier) → src/data/vocabulary/tier1..10.ts");
console.log("Dropped:", JSON.stringify(dropped));
console.log(
  "Per tier (kata pertama):",
  tiers.map(([t, ws]) => `t${t}:${ws[0]?.word}`).join(" | "),
);
console.log("Contoh t1:", tiers[0][1].slice(0, 20).map((c) => c.word).join(", "));
console.log("Contoh t3:", tiers[2][1].slice(0, 15).map((c) => c.word).join(", "));
console.log("Contoh t5:", tiers[4][1].slice(0, 15).map((c) => c.word).join(", "));
console.log("Contoh t8:", tiers[7][1].slice(0, 15).map((c) => c.word).join(", "));
console.log("Sample t1[0]:", JSON.stringify(tiers[0][1][0]));
console.log("Sample t5[0]:", JSON.stringify(tiers[4][1][0]));
console.log("Sample t10[0]:", JSON.stringify(tiers[9][1][0]));

// ---- statistik kualitas clue ----
let nEx = 0;
let nSyn = 0;
let nFallback = 0;
for (const [, words] of tiers) {
  for (const c of words) {
    const syn = extractSynonym(c.def, c.word);
    const ex = extractExample(c.arti, c.word);
    if (ex) nEx++;
    if (syn) nSyn++;
    if (!ex && !syn) nFallback++;
  }
}
console.log(
  `Kualitas clue — contoh kalimat: ${nEx}, sinonim: ${nSyn}, fallback huruf: ${nFallback}`,
);
