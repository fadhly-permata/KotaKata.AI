// Koreksi clue tier 6-10 ke format baru (Sinonim:/Antonim:/deskriptif) — konsisten dgn tier 1-5.
// Logika disalin dari build-kbbi-seed.mjs (parseEntry, extractSynonym/Antonym,
// makeClue2/3) supaya hasil identik dengan pipeline tier 1-5, dengan strategi
// multi-kandidat: pilih pasangan (clue_2, clue_3) yang tidak saling bentrok dan
// TIDAK pernah memakai pola huruf yang membocorkan jawaban.
// Usage: node scripts/vocab/fix-tier6-10.mjs [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");
const kbbiPath = "/tmp/kbbi.json";
const freqPath = "/tmp/id_freq.txt";
const MAX_LEN = 10;

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

// ---------------------------------------------------------------- parser (salinan build-kbbi-seed)
const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const FUNCTION_CLASSES = new Set(["p", "pron", "konj", "prep"]);
const FUNCTION_CLASSES_ID = new Set(["partikel", "pronomina", "konjungsi", "preposisi"]);
const AFFIX_RE = /bentuk terikat|singkatan|akronim|kependekan|lambang/i;
const REGIONAL_RE = /\b(Mk|Ar|Sd|Jw|Aceh|Tlk|Plb|Min|Ach|Dr|Kp|kl|ark|cak|hor|ki)\b(?=\s*(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi|\(kata))/i;

const modernize = (s) =>
  s.replace(/\byg\b/g, "yang").replace(/\bdgn\b/g, "dengan").replace(/\bdng\b/g, "dengan").replace(/\btt\b/g, "tentang").replace(/\bkpd\b/g, "kepada").replace(/\bsbg\b/g, "sebagai").replace(/\bdr\b/g, "dari").replace(/\btsb\b/g, "tersebut").replace(/\bspt\b/g, "seperti").replace(/\bud\b/g, "untuk").replace(/\bdll\b/g, "dan lain-lain").replace(/\bdsb\b/g, "dan sebagainya");

function cleanDef(raw) {
  let d = decode(raw).replace(/<i>.*?<\/i>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^\?/.test(d)) return "";
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  d = d.split(/:\s*(?=[a-z;]|$)/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "").replace(/;\s*\(\d+|;\s*\d+\)/i, "");
  d = d.replace(/^Berasal dari bahasa [A-Za-z]+\s*/i, ""); // penanda kata serapan KBBI
  d = d.replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  if (!d || d.length < 2) return "";
  return modernize(d);
}

function parseEntry(e) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word) || word.length < 3 || word.length > MAX_LEN) return null;
  const arti = decode(e.arti ?? "");
  if (!arti || arti.includes(" ? ")) return null;

  if (arti.includes("<b>")) {
    const m = arti.match(/^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*(?:\/[^/]*\/)?\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s);
    if (!m) return null;
    const classMatch = m[1].match(/<i>([^<]*)<\/i>/);
    const klass = classMatch ? classMatch[1].trim() : "";
    if (/(^|\s)(Ar|Mk|Sd|Jw|Aceh|kl|cak|ark|hor|ki)(\s|$)/i.test(klass)) return null;
    if (AFFIX_RE.test(klass)) return null;
    const klassTokens = klass.split(/\s+/);
    const posCode = klassTokens[klassTokens.length - 1];
    if (FUNCTION_CLASSES.has(posCode)) return null;
    const defMatch = m[2].match(/^(.*?)(?=<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : m[2]);
    if (!def || def.toLowerCase() === word) return null;
    if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
    const senses = arti.split(/<b>\d+<\/b>/).slice(1).map(p => cleanDef(p)).filter(Boolean);
    const exMatch = m[2].match(/<i>([^<]*)<\/i>/);
    const example = exMatch ? modernize(exMatch[1].replace(/\s+/g, " ").trim()) : null;
    const klassCode = klass.split(/\s+/)[0] ?? "";
    return { word, def, senses, example, arti, klass: klassCode };
  }

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
    if (FUNCTION_CLASSES.has(klass) || FUNCTION_CLASSES_ID.has(klass)) return null;
    def = meaning.slice(lm.index + lm[0].length);
  } else {
    const bm = meaning.match(/^\[(pron|partikel|konjungsi|preposisi|interjeksi)(?:\s+[^\]]*)?\]\s*/i);
    if (bm) return null;
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
  const colIdx = meaning.indexOf(":");
  let example = null;
  if (colIdx > -1) {
    example = modernize(meaning.slice(colIdx + 1).replace(/\s+/g, " ").trim());
    if (example.length < 5) example = null;
  }
  return { word, def, senses, example, arti, klass };
}

// ---------------------------------------------------------------- collect homographs
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
const CLASS_NAME = { n: "kata benda", v: "kata kerja", a: "kata sifat", adv: "kata keterangan", num: "kata bilangan", interj: "kata seru", konj: "kata sambung", prep: "kata depan", nomina: "kata benda", verba: "kata kerja", adjektiva: "kata sifat", adverbia: "kata keterangan", numeralia: "kata bilangan", interjeksi: "kata seru", konjungsi: "kata sambung", preposisi: "kata depan", pronomina: "kata ganti", partikel: "partikel" };

function extractSynonym(def, word) {
  if (!def) return null;
  for (const p of def.split(";")) {
    const seg = p.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    if (!seg || !/^[a-z·]{2,16}$/.test(seg)) continue;
    const clean = seg.replace(/·/g, "");
    if (clean === word || /\d/.test(clean)) continue;
    return clean;
  }
  const m = def.match(/(?:sama dengan|=\s*)\s*([a-z·]+)/i);
  if (m) {
    const clean = m[1].replace(/·/g, "");
    if (/^[a-z]{2,16}$/.test(clean) && clean !== word) return clean;
  }
  return null;
}

function extractAntonym(def, word) {
  if (!def) return null;
  const m = def.match(/(?:lawan kata|lawan|antonim|kebalikan(?:\s+dari)?)\s*[:=]?\s*([a-z·]+(?:\s+[a-z·]+){0,2})/i);
  if (!m) return null;
  const seg = m[1].trim().toLowerCase();
  if (!/^[a-z·]{2,16}$/.test(seg) || seg === word) return null;
  return seg.replace(/·/g, "");
}

const synonymPairs = new Map();
const reverseSyn = new Map();
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

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Pecah definisi menjadi fragmen-fragmen pendek yang sah untuk clue_2/clue_3.
 *  Bisa dipakai kata hubung ("dan", "atau", "serta") supaya kata berdefinisi
 *  satu kalimat tetap punya bahan clue kedua (gaya tier 1: "jim => huruf Arab...").
 */
function defFragments(def) {
  const out = [];
  const push = (s) => {
    const t = cleanCand(s);
    if (!t || t.length < 8) return;
    if (/^(dan|atau|serta|yang|dengan|sebagai)\b/i.test(t)) return;
    if (/[():]/.test(t)) return; // fragmen masih punya kurung/titik dua = belum bersih
    out.push(t);
  };
  for (const part of String(def).split(/[;,(]|\s+dan\s+|\s+atau\s+|\s+serta\s+/i)) {
    push(part);
  }
  return out;
}
// Pola clue yang MEMBOCORKAN jawaban (huruf awal/panjang) — harus 0 di hasil akhir.
// CATATAN: "berjumlah" TANPA angka (mis. "yang berjumlah tiga") adalah definisi sah,
// bukan kebocoran — hanya "berjumlah <digit>" yang menandakan pola panjang huruf.
const LEAK_RE = /Kata berawalan|Berawalan huruf|berakhir huruf|huruf terakhir|berjumlah\s*\d+\s*huruf|\b\d+\s*huruf\b/i;
const cleanCand = (t) => t.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
const nearSame = (a, b) => {
  if (!a || !b) return false;
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x === y || (x.length >= 12 && y.length >= 12 && (x.startsWith(y) || y.startsWith(x) || x.slice(0, 40) === y.slice(0, 40)));
};

/** Apakah a terlalu mirip b (duplikat) utk c2/c3 vs c1/def? Fragmen pendek yang
 *  jadi awalan definisi (mis. "perihal salah" vs "perihal salah; kekeliruan...")
 *  TIDAK dianggap duplikat — itu masih petunjuk sah, hanya butuh overlap proporsional.
 */
const tooClose = (a, b) => {
  if (!a || !b) return false;
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  if (s.length < 12) return false;
  return (l.startsWith(s) || s.startsWith(l)) && s.length / l.length > 0.6;
};

/**
 * Kandidat clue_3 yang VALID (tidak bocor jawaban, bukan duplikat clue_1).
 * Dibedakan: SINONIM (kata tunggal — nanti dapat prefix "Sinonim:") vs
 * DESKRIPTIF (frasa pendek — dipakai polos, gaya tier 1 "kubah => atap...").
 */
function clue3Candidates(c, clue1) {
  const { word, def } = c;
  const out = { sinonims: [], descriptives: [] };
  const isWord = (t) => /^[a-z·]{2,16}$/.test(t);
  const pushWord = (x) => {
    if (!x) return;
    const t = cleanCand(String(x)).replace(/·/g, "");
    if (!isWord(t)) return;
    if (same(t, word) || same(t, def) || same(t, clue1)) return;
    if (out.sinonims.includes(t)) return;
    out.sinonims.push(t);
  };
  const pushPhrase = (x) => {
    if (!x) return;
    const t = cleanCand(String(x));
    if (!t || t.length < 4 || t.length > 140) return;
    if (LEAK_RE.test(t)) return;
    if (/^(Bermakna sama|Merupakan|Kata |Verba|Nomina|Adjektiva|Adverbia)/i.test(t)) return;
    if (/\b(Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b/i.test(t)) return;
    if (isWord(t)) return; // kata tunggal masuk jalur sinonim
    if (same(t, word) || same(t, def) || same(t, clue1)) return;
    if (tooClose(t, def) || tooClose(t, clue1)) return;
    if (t.toLowerCase().includes(word)) return; // frasa memuat kata jawaban = bocor
    if (out.descriptives.includes(t)) return;
    out.descriptives.push(t);
  };
  // 1) antonim eksplisit → selalu didahulukan
  for (const h of c.homographs) {
    const a1 = extractAntonym(h.def, word);
    if (a1) pushWord("Antonim:" + a1);
    for (const sen of h.senses) {
      const a2 = extractAntonym(sen, word);
      if (a2) pushWord("Antonim:" + a2);
    }
  }
  // 2) sinonim eksplisit dari definisi/sense (kata tunggal)
  for (const h of c.homographs) {
    pushWord(extractSynonym(h.def, word));
    for (const sen of h.senses) pushWord(extractSynonym(sen, word));
  }
  // 3) synonymPairs
  const pairs = synonymPairs.get(word);
  if (pairs) for (const s of pairs) pushWord(s);
  // 4) reverseSyn (hanya kata cukup dikenal)
  const rev = reverseSyn.get(word);
  if (rev) {
    for (const s of rev) {
      if ((freq.get(s) ?? 0) > 0) pushWord(s);
    }
  }
  // 5) sense/parafrasa pendek → deskriptif polos
  // 5) sense/parafrasa pendek → deskriptif polos (buang kelas kata "Verba kata kerja...")
  for (const h of c.homographs) {
    for (const sen of h.senses) {
      const t = cleanCand(sen).replace(/^(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b[^a-z]*/i, "");
      if (t.length >= 4 && t.length <= 90 && !t.includes(";")) pushPhrase(t);
    }
  }
  // 6) fragmen-fragmen definisi utama → deskriptif polos (pecah koma/kata hubung)
  for (const t of defFragments(def)) {
    pushPhrase(t);
  }
  return out;
}

/** Semua kandidat clue_2 yang VALID. */
function clue2Candidates(c, clue1) {
  const { word, def, klass } = c;
  const out = [];
  const push = (x) => {
    if (!x) return;
    const t = cleanCand(String(x));
    if (!t || t.length < 2) return;
    if (same(t, word) || same(t, def) || same(t, clue1)) return;
    if (out.includes(t)) return;
    out.push(t);
  };
  const stripKlass = (s) => cleanCand(s).replace(/^(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b[^a-z]*/i, "");
  const pushNoLeak = (s) => {
    if (s && s.toLowerCase().includes(word)) return; // frasa memuat kata jawaban = bocor
    push(s);
  };
  for (const h of c.homographs) {
    if (!same(h.def, word) && !same(h.def, def)) pushNoLeak(stripKlass(h.def));
  }
  for (const h of c.homographs) {
    for (const sen of h.senses) {
      if (!same(sen, word) && !same(sen, def)) pushNoLeak(stripKlass(sen));
    }
  }
  // Kalimat contoh pemakaian (boleh memuat kata jawaban — contoh memang memakai kata itu,
  // sesuai makeClue2 pipeline tier 1-5 dan data asli tier 6).
  // Fragmen definisi (kata hubung/koma) DIDAHULUKAN — bahan clue_2 terbaik
  // adalah deskriptif asli, bukan kelas kata ("Merupakan ...").
  for (const t of defFragments(def)) {
    if (t.length <= 140 && !/^(Bermakna sama|Merupakan|Contoh:)/i.test(t)) push(t);
  }
  if (c.example && c.example.length >= 6) push(`Contoh: ${c.example}`);
  const syn = clue3Candidates(c, clue1).sinonims[0];
  if (syn && !same(syn, def)) push(`Bermakna sama dengan ${syn}`);
  if (klass && CLASS_NAME[klass]) push(`Merupakan ${CLASS_NAME[klass]}`);
  return out;
}

/** Pilih pasangan (c2, c3) yang tidak bentrok & tidak bocor. */
function pickPair(c, clue1) {
  const { word, def, klass, homographs } = c;
  const c2s = clue2Candidates(c, clue1);
  const cands = clue3Candidates(c, clue1);
  const cls = klass ? CLASS_NAME[klass] : null;
  const containsWord = (a, b) => a.toLowerCase().includes(b.toLowerCase());
  const pickC2 = (c3) => {
    // c2 harus beda dari c3: tidak sama, tidak near-same, tidak mengandung c3.
    // Kalimat contoh ("Contoh: ...") dikecualikan — contoh memang memuat kata yang
    // diilustrasikan (standar makeClue2 pipeline tier 1-5 & data asli tier 6).
    const plain = c3.replace(/^(Sinonim|Antonim):\s*/i, "");
    const usable = c2s.filter(
      (c2) => !same(c2, c3) && !nearSame(c2, c3) && (c2.startsWith("Contoh:") || !containsWord(c2, plain)),
    );
    return usable[0] ?? null;
  };
  // Prioritas c3: antonim → sinonim → deskriptif
  const fallbackC2 = cls ? `Merupakan ${cls}` : (c.example ? `Contoh: ${c.example}` : `Merupakan kata`);
  const ant = cands.sinonims.find((s) => s.startsWith("Antonim:"));
  if (ant) return [pickC2(ant) ?? fallbackC2, ant];
  if (cands.sinonims.length) {
    const syn = cands.sinonims[0];
    return [pickC2(syn) ?? fallbackC2, syn];
  }
  for (const d of cands.descriptives) {
    const c2 = pickC2(d);
    if (c2 && !same(c2, d) && !same(d, clue1) && !tooClose(d, clue1)) return [c2, d];
  }
  // Fallback terakhir: homograf lain / parafrasa pendek definisi — TIDAK pernah
  // memakai pola huruf (bocor). Pastikan c2 != c3, c3 != clue1, dan tidak bocor.
  const notLeak = (t) => !!t && !LEAK_RE.test(t) && !same(t, word) && !/\b(Verba|Nomina|Adjektiva|Adverbia)\b/i.test(t);
  const stripKlassFb = (s) => cleanCand(s).replace(/^(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b[^a-z]*/i, "");
  const altDef = homographs.map((h) => stripKlassFb(h.def)).find((d) => notLeak(d) && !same(d, def) && !same(d, clue1) && !tooClose(d, clue1));
  const defParts = defFragments(def).map(stripKlassFb).filter(notLeak);
  const shortDef = defParts.find((d) => d.length >= 4 && d.length <= 140 && !same(d, clue1) && !tooClose(d, clue1));
  const cls3 = cls ? `Merupakan ${cls}` : null;
  const c3 = altDef ?? shortDef ?? cls3;
  if (!c3) {
    // sangat langka: semua sumber bocor/duplikat clue_1 — pakai kelas kata atau
    // contoh pemakaian (tidak pernah bocor), jangan pernah duplikat clue_1.
    const ex = c.example ? `Contoh: ${c.example}` : null;
    const c3b = cls3 ?? (ex && !tooClose(ex, clue1) ? ex : `Merupakan kata`);
    // c2 HARUS berbeda dari c3 (jangan duplikat) dan berbeda dari clue_1.
    const c2b = c2s.find((x) => !same(x, c3b) && !nearSame(x, c3b) && !same(x, clue1) && !tooClose(x, clue1))
      ?? (ex && !nearSame(ex, c3b) && !tooClose(ex, clue1) ? ex : null)
      ?? (c3b === "Merupakan kata" ? "Merupakan kata benda" : "Merupakan kata");
    return [c2b, c3b];
  }
  // c2 HARUS berbeda dari c3 (jangan duplikat "Merupakan kata benda" di keduanya)
  const c2 = c2s.find((x) => !same(x, c3) && !nearSame(x, c3) && !x.toLowerCase().includes(c3.toLowerCase()))
    ?? cands.descriptives.find((d) => !same(d, c3))
    ?? (cls ? `Merupakan ${cls}` : (defParts.find((d) => !same(d, c3)) ?? (c.example ? `Contoh: ${c.example}` : `Merupakan kata`)));
  // c2 tidak boleh sama dengan clue_1 (standar tier 1-5: c1/c2/c3 selalu berbeda)
  const c2ok = same(c2, clue1) || tooClose(c2, clue1) ? `Merupakan kata` : c2;
  return same(c2ok, c3) ? [`Merupakan kata`, c3] : [c2ok, c3];
}

// ---------------------------------------------------------------- fix tier 6-10 (pertahankan kata & clue_1)
const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const byWordLookup = new Map(candidates.map(c => [c.word, c]));

/** Deteksi clue_1 rusak dari data lama (mulai tanda baca / suku kata bertitik). */
const isBrokenC1 = (c1) => {
  if (!c1 || c1.length < 4) return true;
  if (/^[\s,;:)]/.test(c1)) return true;
  if (/^Berasal dari bahasa\b/i.test(c1)) return true; // penanda kata serapan KBBI
  if (/[a-z]\.[a-z]/.test(c1)) return true; // "mem.bom.bar.dir" dsb.
  return false;
};

const stats = { sinonim: 0, antonim: 0, deskriptif: 0, bocor: 0, contoh2: 0, total: 0, takAda: 0, c2MengandungSinonim: 0, c2SamaC3: 0, c1SamaC3: 0 };
const bocorSamples = [];
const dupSamples = [];

for (let tier = 6; tier <= 10; tier++) {
  const path = `src/data/vocabulary/tier${tier}.ts`;
  const src = readFileSync(path, "utf8");
  const rows = [...src.matchAll(WORD_RE)].map(m => [m[1], m[2], m[3], m[4]]);
  const fixed = rows.map(([word, c1, c2, c3]) => {
    stats.total++;
    const cand = byWordLookup.get(word);
    if (!cand) {
      stats.takAda++;
      return [word, c1, c2, c3];
    }
    // Perbaiki clue_1 yang rusak dari data lama: (1) sisa penanda KBBI seperti
    // ") Nomina (kata benda)" / ") Berasal dari bahasa X" yang nyangkut di akhir
    // kalimat, (2) pola rusak lain → pakai definisi bersih dari KBBI.
    let c1Use = c1;
    const kbbiMark = /\)\s*(Berasal dari bahasa|Verba|Nomina|Adjektiva|Adverbia|Numeralia)\b/i;
    if (kbbiMark.test(c1Use)) {
      c1Use = cleanCand(c1Use.replace(kbbiMark, ""));
    }
    if (isBrokenC1(c1Use) && cand.def && cand.def.length >= 4 && !LEAK_RE.test(cand.def)) c1Use = cand.def;
    let [n2, n3] = pickPair(cand, c1Use);
    if (word === "kesalahan" && process.env.TRACE) {
      console.log(`[TRACE kesalahan] pickPair=> n2="${n2}" n3="${n3}"`);
    }
    // Jaring pengaman: clue_3 tidak boleh sama/hampir sama dengan clue_1
    // (standar tier 1-5: c1/c2/c3 selalu berbeda).
    if (same(n3, c1Use) || tooClose(n3, c1Use)) {
      n3 = cand.klass && CLASS_NAME[cand.klass] ? `Merupakan ${CLASS_NAME[cand.klass]}` : `Merupakan kata`;
      stats.c1SamaC3++;
    }
    // Beri prefix konsisten: antonim eksplisit tetap; kata tunggal → "Sinonim:";
    // frasa deskriptif tetap polos (gaya tier 1: "kubah => atap melengkung...").
    if (/^Antonim\s*:/i.test(n3)) {
      stats.antonim++;
    } else if (/^[a-z·]{2,16}$/.test(n3.replace(/·/g, ""))) {
      n3 = `Sinonim: ${n3}`;
      stats.sinonim++;
    } else {
      stats.deskriptif++;
    }
    if (/^Contoh:/.test(n2)) stats.contoh2++;
    if (LEAK_RE.test(n3)) {
      stats.bocor++;
      if (bocorSamples.length < 10) bocorSamples.push(`${word} => "${n3}"`);
    }
    // cek duplikat: c2 mengandung kata sinonim / sama dengan c3 (sebelum perbaikan)
    const synW = n3.replace(/^(Sinonim|Antonim):\s*/i, "").toLowerCase();
    if (same(n2, n3) || (synW.length >= 2 && n2.toLowerCase().includes(synW))) {
      // ganti c2 dengan alternatif yang tidak mengandung kata sinonim:
      // 1) contoh pemakaian → 2) kelas kata → 3) clue_2 lama (jika tidak bocor)
      // → 4) deskriptif lain yang tidak mengandung sinonim
      // Kalimat contoh ("Contoh: ...") dikecualikan dari cek kata-jawaban & kata-sinonim
      // — contoh memang memuat kata yang diilustrasikan (standar makeClue2 tier 1-5).
      const okAlt = (a) => !!a && !same(a, n3) && !LEAK_RE.test(a) &&
        (a.startsWith("Contoh:") || (!a.toLowerCase().includes(synW) && !a.toLowerCase().includes(word)));
      let alt;
      // 1) kalimat contoh pemakaian
      if (cand && cand.example && cand.example.length >= 6) alt = `Contoh: ${cand.example}`;
      // 2) c2 lama dari file tier (jika tidak bocor; contoh diperbolehkan walau memuat kata)
      if (!okAlt(alt) && c2 && !LEAK_RE.test(c2) && (c2.startsWith("Contoh:") || !c2.toLowerCase().includes(word))) alt = c2;
      // 3) deskriptif lain dari kandidat clue_3
      if (!okAlt(alt) && cand) {
        const descs = clue3Candidates(cand, c1).descriptives;
        alt = descs.find((d) => !d.toLowerCase().includes(synW) && !same(d, n3));
      }
      // 4) kelas kata (hanya jika ada)
      if (!okAlt(alt) && cand && cand.klass && CLASS_NAME[cand.klass]) alt = `Merupakan ${CLASS_NAME[cand.klass]}`;
      // 5) jaminan terakhir: placeholder non-duplikat (kata tanpa data lain apa pun)
      //    — TIDAK memakai clue_1 (biar c1 != c2, standar tier 1-5)
      if (!okAlt(alt)) alt = `Merupakan kata`;
      if (okAlt(alt)) n2 = alt;
    }
    // verifikasi AKHIR (setelah perbaikan): hitung hanya kasus yang benar-benar tersisa
    // (kalimat "Contoh: ..." dikecualikan — contoh memang memuat kata yang diilustrasikan)
    const synW2 = n3.replace(/^(Sinonim|Antonim):\s*/i, "").toLowerCase();
    const dupReal = n2.startsWith("Contoh:")
      ? same(n2, n3)
      : (same(n2, n3) || (synW2.length >= 2 && n2.toLowerCase().includes(synW2) && !/^merupakan kata/.test(n2.toLowerCase())));
    if (dupReal) {
      stats.c2MengandungSinonim++;
      if (dupSamples.length < 8) dupSamples.push(`${word} => c2="${n2}" c3="${n3}"`);
    }
    // PASI KAN AKHIR (deterministik): c1/c2/c3 harus semuanya berbeda dan tidak bocor.
    // Untuk kata yang data KBBI-nya benar-benar satu kalimat, placeholder generik
    // dipakai agar tidak ada duplikat clue.
    if (same(n2, c1Use) || tooClose(n2, c1Use)) n2 = n3 === `Merupakan kata` ? `Merupakan kata benda` : `Merupakan kata`;
    if (same(n3, c1Use) || tooClose(n3, c1Use)) n3 = n2 === `Merupakan kata` ? `Merupakan kata benda` : `Merupakan kata`;
    if (same(n2, n3) || nearSame(n2, n3)) {
      if (n3.startsWith(`Merupakan kata`)) n2 = n3 === `Merupakan kata benda` ? `Merupakan kata` : `Merupakan kata benda`;
      else n2 = n3.startsWith("Sinonim:") ? `Merupakan kata` : `Merupakan kata`;
    }
    if (word === "kesalahan" && process.env.TRACE) {
      console.log(`[TRACE kesalahan] FINAL=> c1="${c1Use.slice(0, 30)}" c2="${n2}" c3="${n3}"`);
    }
    return [word, c1Use, n2, n3];
  });
  if (DRY) {
    console.log(`tier${tier}: ${rows.length} kata (dry-run, tidak ditulis)`);
    console.log("  sample:", fixed.slice(0, 4).map(([w, c1, c2, c3]) => `"${w}" c2="${c2}" c3="${c3}"`).join("\n  "));
  } else {
    // escape backslash dulu, baru quote — supaya `"` yang sudah ada di data lama
    // (dari KBBI) jadi `\\"` (valid TS) dan tetap terbaca ulang oleh WORD_RE.
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const rowsOut = fixed.map(([word, c1, c2, c3]) =>
      `  ["${word}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`,
    ).join("\n");
    const out = `// Tier ${tier} — 1000 kata asli KBBI (Kamus Besar Bahasa Indonesia), urut berdasarkan frekuensi.\n// Format: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].\nexport const TIER_${tier}_WORDS: [string, string, string, string][] = [\n${rowsOut}\n];\n`;
    writeFileSync(path, out);
    console.log(`tier${tier}: ${fixed.length} kata ditulis ulang`);
  }
}

console.log("\n=== STATISTIK ===\n", JSON.stringify(stats, null, 2));
if (bocorSamples.length) console.log("\ncontoh bocor (perlu review manual):\n" + bocorSamples.join("\n"));
if (dupSamples.length) console.log("\ncontoh c2 mengandung kata sinonim c3:\n" + dupSamples.join("\n"));
