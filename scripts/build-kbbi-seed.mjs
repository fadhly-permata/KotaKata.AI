// Builds src/data/vocabulary/tier1..10.ts from KBBI data.
// FORMAT: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)]
// Tier 1: 100 curated + 900 auto. Tiers 2-10: 1000 auto-generated each.
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
const MAX_LEN = 10;

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
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const FUNCTION_CLASSES = new Set(["p", "pron", "konj", "prep"]);
const FUNCTION_CLASSES_ID = new Set(["partikel", "pronomina", "konjungsi", "preposisi"]);
const AFFIX_RE = /bentuk terikat|singkatan|akronim|kependekan|lambang/i;
// Penanda kata serapan/dialek/daerah yang membuat kata kurang layak untuk soal umum.
const REGIONAL_RE = /\b(Mk|Ar|Sd|Jw|Aceh|Tlk|Plb|Min|Ach|Dr|Kp|kl|ark|cak|hor|ki)\b(?=\s*(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi|\(kata))/i;

const modernize = (s) =>
  s.replace(/\byg\b/g, "yang").replace(/\bdgn\b/g, "dengan").replace(/\bdng\b/g, "dengan").replace(/\btt\b/g, "tentang").replace(/\bkpd\b/g, "kepada").replace(/\bsbg\b/g, "sebagai").replace(/\bdr\b/g, "dari").replace(/\btsb\b/g, "tersebut").replace(/\bspt\b/g, "seperti").replace(/\bud\b/g, "untuk").replace(/\bdll\b/g, "dan lain-lain").replace(/\bdsb\b/g, "dan sebagainya");

function cleanDef(raw) {
  let d = decode(raw).replace(/<i>.*?<\/i>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^\?/.test(d)) return "";
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  d = d.split(/:\s*(?=[a-z;]|$)/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "").replace(/;\s*\(\d+|;\s*\d+\)/i, "");
  d = d.replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  if (d.length > 90) d = d.slice(0, 87).trimEnd() + "…";
  return modernize(d);
}

function parseEntry(e) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word) || word.length < 3 || word.length > MAX_LEN) return null;
  const arti = decode(e.arti ?? "");
  if (!arti || arti.includes(" ? ")) return null;

  // ---- HTML format ----
  if (arti.includes("<b>")) {
    const m = arti.match(/^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*(?:\/[^/]*\/)?\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s);
    if (!m) return null;
    const classMatch = m[1].match(/<i>([^<]*)<\/i>/);
    const klass = classMatch ? classMatch[1].trim() : "";
    // kelas dengan penanda regional/arkais ("Ar n", "kl a", "Mk v", "cak") → buang
    if (/(^|\s)(Ar|Mk|Sd|Jw|Aceh|kl|cak|ark|hor|ki)(\s|$)/i.test(klass)) return null;
    if (AFFIX_RE.test(klass)) return null;
    const klassTokens = klass.split(/\s+/);
    const posCode = klassTokens[klassTokens.length - 1]; // "Ar pron" → pron
    if (FUNCTION_CLASSES.has(posCode)) return null;
    const defMatch = m[2].match(/^(.*?)(?=<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : m[2]);
    if (!def || def.toLowerCase() === word) return null;
    // crossref seperti "lihat X" / "? X"
    if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
    // numbered senses
    const senses = arti.split(/<b>\d+<\/b>/).slice(1).map(p => cleanDef(p)).filter(Boolean);
    // example sentence: text inside <i> after a colon
    const exMatch = m[2].match(/<i>([^<]*)<\/i>/);
    const example = exMatch ? modernize(exMatch[1].replace(/\s+/g, " ").trim()) : null;
    const klassCode = klass.split(/\s+/)[0] ?? "";
    return { word, def, senses, example, arti, klass: klassCode };
  }

  // ---- plain format ----
  const lines = arti.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let meaning = null;
  if (lines.length >= 2 && /^[a-z·.]+$/.test(lines[0])) meaning = lines.slice(1).join(" ");
  else if (lines.length === 1) meaning = lines[0];
  if (!meaning) return null;

  if (/\b(Arkais|Klasik|Cakapan|Dialek)\b/i.test(meaning) || /\btidak baku\b/i.test(meaning)) return null;
  if (REGIONAL_RE.test(meaning)) return null;
  if (/\bLihat\b/i.test(meaning)) return null;

  const lm = meaning.match(/\b(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\([^)]*\))?\s*/i);
  let def = meaning;
  let klass = "";
  if (lm) {
    klass = lm[1].toLowerCase();
    if (FUNCTION_CLASSES.has(klass) || FUNCTION_CLASSES_ID.has(klass)) return null; // kata tugas
    def = meaning.slice(lm.index + lm[0].length);
  } else {
    // kelas kata gaya "[pron]", "[pron jamak]", "[partikel]", dst
    const bm = meaning.match(/^\[(pron|partikel|konjungsi|preposisi|interjeksi)(?:\s+[^\]]*)?\]\s*/i);
    if (bm) return null; // kata tugas — bukan soal kosakata yang bagus
    const bm2 = meaning.match(/^\[(nomina|verba|adjektiva|adverbia|numeralia)(?:\s+[^\]]*)?\]\s*/i);
    if (bm2) {
      klass = bm2[1].toLowerCase();
      def = meaning.slice(bm2.index + bm2[0].length);
    }
  }
  def = cleanDef(def);
  if (!def || def.toLowerCase() === word) return null;
  if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;

  const senses = [];
  for (const line of lines.slice(lines.length >= 2 && /^[a-z·.]+$/.test(lines[0]) ? 1 : 0)) {
    const nm = line.match(/^\(?(\d+)\)?\s*(.*)$/);
    if (nm) {
      const d = cleanDef(nm[2]);
      if (d && d.toLowerCase() !== word) senses.push(d);
    }
  }
  // plain example: text after first colon
  const colIdx = meaning.indexOf(":");
  let example = null;
  if (colIdx > -1) {
    example = modernize(meaning.slice(colIdx + 1).replace(/\s+/g, " ").trim());
    if (example.length > 70) example = example.slice(0, 67).trimEnd() + "…";
    if (example.length < 5) example = null;
  }
  return { word, def, senses, example, arti, klass };
}

// ---------------------------------------------------------------- collect ALL entries per word (homographs)
const byWord = new Map();
for (const e of entries) {
  const r = parseEntry(e);
  if (r) {
    const cur = byWord.get(r.word);
    if (!cur) byWord.set(r.word, [r]);
    else if (cur.length < 8) cur.push(r);
  }
}
const candidates = [...byWord.values()].map(group => ({
  ...group[0],
  homographs: group,
  freq: freq.get(group[0].word) ?? 0,
}));

// ---------------------------------------------------------------- clue generators
const CLASS_NAME = { n: "kata benda", v: "kata kerja", a: "kata sifat", adv: "kata keterangan", num: "kata bilangan", interj: "kata seru", konj: "kata sambung", prep: "kata depan" };

function extractSynonym(def, word) {
  if (!def) return null;
  for (const p of def.split(";")) {
    const seg = p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!seg || !/^[a-z·]{2,16}$/.test(seg)) continue;
    const clean = seg.replace(/·/g, "");
    if (clean === word || /\d/.test(clean)) continue;
    return clean;
  }
  // pola "sama dengan X" / "= X"
  const m = def.match(/(?:sama dengan|=\s*)\s*([a-z·]+)/i);
  if (m) {
    const clean = m[1].replace(/·/g, "");
    if (/^[a-z]{2,16}$/.test(clean) && clean !== word) return clean;
  }
  return null;
}

// Antonym: find "lawan kata", "lawan", "antonim", "kebalikan" patterns in a def
function extractAntonym(def, word) {
  if (!def) return null;
  const m = def.match(/(?:lawan kata|lawan|antonim|kebalikan(?:\s+dari)?)\s*[:=]?\s*([a-z·]+(?:\s+[a-z·]+){0,2})/i);
  if (!m) return null;
  const seg = m[1].trim().toLowerCase();
  if (!/^[a-z·]{2,16}$/.test(seg) || seg === word) return null;
  return seg.replace(/·/g, "");
}

// Peta sinonim lintas entri: def satu kata → pasangan sinonim.
const synonymPairs = new Map(); // word -> set of synonyms
const reverseSyn = new Map(); // synonym -> [words]
for (const c of candidates) {
  for (const h of c.homographs) {
    const s = extractSynonym(h.def, c.word);
    if (s && s !== c.word) {
      if (!synonymPairs.has(c.word)) synonymPairs.set(c.word, new Set());
      synonymPairs.get(c.word).add(s);
      if (!reverseSyn.has(s)) reverseSyn.set(s, new Set());
      reverseSyn.get(s).add(c.word);
    }
  }
}

function allSynonymCandidates(c) {
  const out = [];
  for (const h of c.homographs) {
    const s = extractSynonym(h.def, c.word);
    if (s && !out.includes(s)) out.push(s);
    for (const sen of h.senses) {
      const s2 = extractSynonym(sen, c.word);
      if (s2 && !out.includes(s2)) out.push(s2);
    }
  }
  return out;
}

function allAntonymCandidates(c) {
  const out = [];
  for (const h of c.homographs) {
    const a = extractAntonym(h.def, c.word);
    if (a && !out.includes(a)) out.push(a);
    for (const sen of h.senses) {
      const a2 = extractAntonym(sen, c.word);
      if (a2 && !out.includes(a2)) out.push(a2);
    }
  }
  return out;
}

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

function makeClue2(c) {
  const { word, def } = c;
  // 1) different homograph (e.g. dan: konjungsi vs dan² tingkatan beladiri)
  for (const h of c.homographs) {
    if (!same(h.def, word) && !same(h.def, def)) return h.def;
  }
  // 2) numbered sense dari SEMUA entri (bukan cuma entri pertama)
  for (const h of c.homographs) {
    for (const sen of h.senses) {
      if (!same(sen, word) && !same(sen, def)) return sen;
    }
  }
  // 3) kalimat contoh pemakaian
  if (c.example && !same(c.example, word) && c.example.length >= 6) {
    return `Contoh: ${c.example}`;
  }
  // 4) sinonim sebagai penjelasan alternatif
  const syn = allSynonymCandidates(c)[0] ?? synonymPairs.get(word)?.values().next().value;
  if (syn && !same(syn, def)) return `Bermakna sama dengan ${syn}`;
  // 5) petunjuk kelas kata (jarang)
  const cls = c.klass ? CLASS_NAME[c.klass] : null;
  if (cls) return `Merupakan ${cls}`;
  return `Kata berawalan ${word[0].toUpperCase()} (${word.length} huruf)`;
}

function makeClue3(c) {
  const { word, def } = c;
  // 1) antonym with marker (user: only mention "Antonim", never "Sinonim")
  const ants = allAntonymCandidates(c);
  if (ants.length) return `Antonim: ${ants[0]}`;
  // 2) synonym from any homograph/sense
  const syns = allSynonymCandidates(c);
  if (syns.length) return syns[0];
  // 3) reverse synonym map (X didefinisikan sebagai sinonim kata lain) — hanya kata yang cukup dikenal
  const rev = reverseSyn.get(word);
  if (rev) {
    const pick = [...rev].find((s) => !same(s, def) && s !== word && (freq.get(s) ?? 0) > 0);
    if (pick) return pick;
  }
  // 4) petunjuk kelas kata (jarang)
  const cls = c.klass ? CLASS_NAME[c.klass] : null;
  if (cls) return `Merupakan ${cls}`;
  return `Kata berawalan ${word[0].toUpperCase()} (${word.length} huruf)`;
}

// Pastikan clue_2 & clue_3 tidak meniru clue_1 / satu sama lain (termasuk duplikat akibat pemotongan 90 karakter).
function guardClues(word, clue1, clue2, clue3) {
  const letterHint = `Kata berawalan ${word[0].toUpperCase()} (${word.length} huruf)`;
  const letterHint2 = `${word.length} huruf, huruf terakhir ${word[word.length - 1].toUpperCase()}`;
  const nearSame = (a, b) => a.length >= 20 && (a.startsWith(b) || b.startsWith(a) || a.slice(0, 60) === b.slice(0, 60));
  let c2 = clue2, c3 = clue3;
  if (same(c2, clue1) || nearSame(c2, clue1)) c2 = letterHint;
  if (same(c3, clue1) || nearSame(c3, clue1) || same(c3, c2) || nearSame(c3, c2)) c3 = letterHint2;
  if (same(c2, c3)) c2 = letterHint;
  return [c2, c3];
}

// ---------------------------------------------------------------- import curated tier-1
const curatedPath = join(ROOT, "src", "data", "vocabulary", "tier1.ts");
const curatedSrc = readFileSync(curatedPath, "utf8");
// Bootstrap: tier1.ts di-regenerate tiap run — hanya 100 baris PERTAMA adalah blok kurasi.
const curatedTuples = [...curatedSrc.matchAll(/^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm)].slice(0, 100).map(m => [m[1], m[2], m[3], m[4]]);
const curatedWords = new Set(curatedTuples.map(t => t[0]));

// ---------------------------------------------------------------- tier buckets (skip curated words)
const byLen = new Map();
for (const c of candidates) {
  if (curatedWords.has(c.word)) continue;
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
  [1, take(len3_4, 900)],  // 100 curated + 900 auto = 1000
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
const allWords = new Set(curatedWords);
const errors = [];
for (const [tier, words] of tiers) {
  if (words.length < (tier === 1 ? 900 : 1000)) {
    errors.push(`tier${tier}: cuma ${words.length} kata (butuh ${tier === 1 ? 900 : 1000})`);
  }
  for (const w of words) {
    if (allWords.has(w.word)) errors.push(`duplikat: ${w.word} di tier ${tier}`);
    allWords.add(w.word);
  }
}
if (errors.length) {
  console.error("VALIDASI GAGAL:");
  errors.slice(0, 30).forEach(e => console.error("  -", e));
  process.exit(1);
}

// ---------------------------------------------------------------- emit
const esc = (s) => s.replace(/"/g, '\\"');
mkdirSync(outDir, { recursive: true });

// Tier 1: prepend curated
const t1Auto = tiers[0][1].map(c => {
  const [c2, c3] = guardClues(c.word, c.def, makeClue2(c), makeClue3(c));
  return [c.word, c.def, c2, c3];
});
const t1All = [...curatedTuples.map(t => [t[0], t[1], t[2], t[3]]), ...t1Auto].slice(0, 1000);

const allTierData = { 1: t1All };
for (let i = 1; i < tiers.length; i++) {
  const [tier, words] = tiers[i];
  allTierData[tier] = words.map(c => {
    const [c2, c3] = guardClues(c.word, c.def, makeClue2(c), makeClue3(c));
    return [c.word, c.def, c2, c3];
  });
}

for (const [tier, data] of Object.entries(allTierData)) {
  const rows = data.map(([word, clue1, clue2, clue3]) =>
    `  ["${word}", "${esc(clue1)}", "${esc(clue2)}", "${esc(clue3)}"],`
  ).join("\n");
  const header = tier === "1"
    ? `// Tier 1 — 100 soal TERKURASI + 900 auto dari KBBI, urut berdasarkan frekuensi.`
    : `// Tier ${tier} — 1000 kata asli KBBI (Kamus Besar Bahasa Indonesia), urut berdasarkan frekuensi.`;
  const out = `${header}
// Format: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].
export const TIER_${tier}_WORDS: [string, string, string, string][] = [
${rows}
];
`;
  writeFileSync(join(outDir, `tier${tier}.ts`), out);
}

console.log("OK — 10.000 kata (1000/tier) → src/data/vocabulary/tier1..10.ts");
console.log("Per tier (kata pertama):", Object.entries(allTierData).map(([t, ws]) => `t${t}:${ws[0]?.[0]}`).join(" | "));
console.log("Sample t1[0]:", JSON.stringify(allTierData["1"][0]));
console.log("Sample t2[0]:", JSON.stringify(allTierData["2"][0]));
console.log("Sample t5[0]:", JSON.stringify(allTierData["5"][0]));
console.log("Sample t10[0]:", JSON.stringify(allTierData["10"][0]));
