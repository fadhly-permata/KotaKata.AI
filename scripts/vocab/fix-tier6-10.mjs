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
  d = d.split(/:\s+(?=[a-zA-Z(])/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "");
  // Entri KBBI multi-makna: potong di penanda sense berikutnya ((2), (3), ...) —
  // clue_1 memakai sense PERTAMA saja. Dulu hanya penanda pertama yang dibuang,
  // makna lanjutan & penanda asal bahasa nyangkut di clue (mis. "pangkalan",
  // "mendingin") — potong mulai penanda sense ke-2 sampai akhir.
  d = d.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "");
  d = d.replace(/;\s*Berasal dari bahasa\s+[A-Za-z]+.*$/i, ""); // penanda serapan di tengah/akhir
  d = d.replace(/^Berasal dari bahasa [A-Za-z]+\s*/i, ""); // penanda kata serapan KBBI di awal
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
    // Def = teks sebelum tag <i> pertama (contoh pemakaian), sebelum <b>/<br>.
    // Kalau contoh menempel di definisi ("...; contoh: <i>..."), c1 tidak boleh
    // memuat contoh (dan "--") — pisahkan, contoh dipakai untuk clue_2.
    const defMatch = m[2].match(/^(.*?)(?=<i>|<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : m[2]);
    if (!def || def.toLowerCase() === word) return null;
    if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
    const senses = arti.split(/<b>\d+<\/b>/).slice(1).map(p => cleanDef(p)).filter(Boolean);
    // Contoh pemakaian = tag <i> pertama yang PANJANG (>= 3 karakter). Tag <i>
    // pendek ("n", "v", "a", "Geo", "Kim") adalah kelas kata homograf berikutnya,
    // bukan contoh — contoh sejati adalah kalimat. KBBI format lama sering
    // menulis <i>contoh tanpa penutup </i> — regex toleran terhadap itu.
    const exMatch = m[2].match(/<i>([^<]{3,})(?:<\/i>|$)/);
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
    // Contoh pemakaian sense pertama saja — sisa sense berikutnya ((2)/(3)) dipotong
    // (mis. "penyedot", "tambalan" yang contohnya menyambung ke makna lain).
    example = example.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "").trim();
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

/** Cocokkan kata jawaban sebagai KATA UTUH (bukan substring). Kata seperti
 *  "elektronik" tidak boleh dianggap bocor oleh definisi yang menyebut
 *  "elektronika" (kata berbeda) — hanya kata utuh yang bocor. */
const wb = (w) => new RegExp(`\\b${w}\\b`, "i");

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
    if (hasTail(t)) return; // sisa pola "... dan sebagainya ..." di mana pun posisinya
    out.push(t);
  };
  for (const part of String(def).split(/[;,(]|\s+dan\s+|\s+atau\s+|\s+serta\s+/i)) {
    push(part);
  }
  return out;
}
// Tolak fragment yang masih memuat sisa pola KBBI "... dan sebagainya ..." —
// fragment seperti itu tidak pernah jadi clue yang baik dan mudah bentrok
// (mis. "sebagainya ke tempat lain" vs "beralih beranjak dan sebagainya ke
// tempat lain"). Fragmen yang bersih tetap lolos.
const hasTail = (t) => /\b(sebagainya|dsb|dll|dst|lain-lain|lainnya)\b/i.test(t);
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

/** Ganti kata jawaban dalam contoh pemakaian dengan "…" (hindari bocor jawaban).
 *  Mengembalikan null jika hasilnya hancur (terlalu pendek). */
const redactExample = (ex, word) => {
  if (!ex) return null;
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let red = ex.replace(re, "…").replace(/\s+/g, " ").trim();
  // Penanda KBBI "--" dalam kalimat contoh (gaya lama: kata yg diilustrasikan
  // ditulis "--") dianggap bocor oleh checker → ganti dengan "…".
  red = red.replace(/--/g, "…").trim();
  if (red === ex.replace(/--/g, "…").trim()) return red; // tidak memuat kata → aman
  if (red.length < 6) return null;
  return red;
};

/** Infer kelas kata dari morfologi (fallback bila KBBI tidak menyebut kelas). */
const inferKlass = (word) => {
  if (/^(me|mem|men|meng|meny|ber|di|ter)[a-z]/.test(word)) return "verba";
  if (/^(ke|pe|per)[a-z].*an$/.test(word)) return "nomina";
  if (/[a-z]+(wan|wati|isme|itas|asi|men|er|or)$/.test(word)) return "nomina";
  if (/^se[a-z].*an$/.test(word)) return null;
  if (/-an$/.test(word)) return "nomina";
  return null;
};

/** Buang trailer "; <kata tunggal>" dari sebuah kalimat (sinonim bawaan KBBI). */
const trimSynTrail = (s) => {
  if (!s) return s;
  const m = s.match(/;\s*[a-z·]{2,16}\s*$/i);
  if (!m) return s;
  const head = s.slice(0, m.index).replace(/[;,:]+\s*$/, "").trim();
  return head.length >= 8 ? head : s;
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
    if (/^(sebagainya|dsb|dll|dst|dan\s+lain)$/.test(t)) return; // sisa pola "dan sebagainya"
    if (t.includes(word) || word.includes(t)) return; // turunan/akar (mengupingi, bercekikikan)
    if (clue1.toLowerCase().includes(t)) return; // sinonim tidak boleh muncul di clue_1
    if (!byWordLookup.has(t)) return; // harus kata KBBI asli (tolak "pause", "kasip")
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
    if (wb(word).test(t)) return; // frasa memuat kata jawaban (utuh) = bocor
    if (clue1.toLowerCase().includes(t)) return; // deskriptif tidak boleh subset clue_1
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
  // 2) sinonim eksplisit dari definisi/sense (kata tunggal).
  //    Sense: ambil seg pertama sebelum ";" — kalau kata tunggal itu sinonim,
  //    sedangkan seg akhir frasa panjang (mis. "spidometer") bukan sinonim.
  for (const h of c.homographs) {
    pushWord(extractSynonym(h.def, word));
    for (const sen of h.senses) {
      const seg = String(sen).split(";")[0].trim();
      if (seg) pushWord(extractSynonym(seg, word));
    }
  }
  // 3) synonymPairs
  const pairs = synonymPairs.get(word);
  if (pairs) for (const s of pairs) pushWord(s);
  // 4) reverseSyn (kata yang mendefinisikan word sebagai sinonimnya — sudah pasti
  //    sinonim dua arah dari KBBI, tidak perlu filter frekuensi)
  const rev = reverseSyn.get(word);
  if (rev) {
    for (const s of rev) {
      pushWord(s);
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
    if (s && wb(word).test(s)) return; // frasa memuat kata jawaban (utuh) = bocor
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
  if (c.example && c.example.length >= 6) {
    const red = redactExample(c.example, word);
    if (red) push(`Contoh: ${red}`);
  }
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
      (c2) =>
        !same(c2, c3) && !nearSame(c2, c3) &&
        (c2.startsWith("Contoh:") || !containsWord(c2, plain)) &&
        !same(c2, clue1) && !tooClose(c2, clue1) &&
        // c2 tidak boleh substring c1 (hindari issue "c1 memuat c2")
        (c2.startsWith("Contoh:") || c2.length < 6 || !clue1.toLowerCase().includes(c2.toLowerCase())),
    );
    return usable[0] ?? null;
  };
  // Prioritas c3: antonim → sinonim → deskriptif
  const exRed = c.example ? redactExample(c.example, word) : null;
  const fallbackC2 = cls ? `Merupakan ${cls}` : (exRed ? `Contoh: ${exRed}` : `Merupakan kata`);
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
  const notLeak = (t) => !!t && !LEAK_RE.test(t) && !same(t, word) && !wb(word).test(t) && !/\b(Verba|Nomina|Adjektiva|Adverbia)\b/i.test(t) && !/^(sebagainya|dsb|dll|dst|lainnya|semuanya|dan\s+lain)$/i.test(t);
  const stripKlassFb = (s) => cleanCand(s).replace(/^(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b[^a-z]*/i, "");
  // Cek dua arah: d tidak boleh memuat ATAU termuat oleh clue_1 (hindari
  // issue "c1 memuat c3" dan "c3 memuat c1" — mis. jurnalisme di mana
  // parafrasa penuh definisi dipilih sebagai clue_3).
  const notSubOfC1 = (d) => !clue1.toLowerCase().includes(d.toLowerCase()) && !d.toLowerCase().includes(clue1.toLowerCase());
  const altDef = homographs.map((h) => stripKlassFb(h.def)).find((d) => notLeak(d) && !same(d, def) && !same(d, clue1) && !tooClose(d, clue1) && notSubOfC1(d));
  const defParts = defFragments(def).map(stripKlassFb).filter(notLeak);
  const shortDef = defParts.find((d) => d.length >= 4 && d.length <= 140 && !same(d, clue1) && !tooClose(d, clue1) && notSubOfC1(d));
  const cls3 = cls ? `Merupakan ${cls}` : null;
  const c3 = altDef ?? shortDef ?? cls3;
  if (!c3) {
    // sangat langka: semua sumber bocor/duplikat clue_1 — pakai kelas kata atau
    // contoh pemakaian ter-redaksi (tidak pernah bocor), jangan pernah duplikat clue_1.
    const ex = exRed ? `Contoh: ${exRed}` : null;
    const c3b = cls3 ?? (ex && !tooClose(ex, clue1) ? ex : `Merupakan kata`);
    // c2 HARUS berbeda dari c3 (jangan duplikat) dan berbeda dari clue_1.
    const c2b = c2s.find((x) => !same(x, c3b) && !nearSame(x, c3b) && !same(x, clue1) && !tooClose(x, clue1) &&
      (x.startsWith("Contoh:") || x.length < 6 || !clue1.toLowerCase().includes(x.toLowerCase())))
      ?? (ex && !nearSame(ex, c3b) && !tooClose(ex, clue1) ? ex : null)
      ?? (c3b === "Merupakan kata" ? "Merupakan kata benda" : "Merupakan kata");
    return [c2b, c3b];
  }
  // c2 HARUS berbeda dari c3 (jangan duplikat "Merupakan kata benda" di keduanya)
  // DAN tidak boleh memuat/termuat oleh clue_1 (cegah issue "c1 memuat c2").
  // Kalimat contoh dikecualikan dari cek saling-memuat (contoh memang memakai
  // kata yang diilustrasikan).
  const notInC1 = (x) => !clue1.toLowerCase().includes(x.toLowerCase()) && !x.toLowerCase().includes(clue1.toLowerCase());
  const notMut = (x) => x.startsWith("Contoh:") ||
    (!x.toLowerCase().includes(c3.toLowerCase()) && !c3.toLowerCase().includes(x.toLowerCase()));
  const c2 = c2s.find((x) => !same(x, c3) && !nearSame(x, c3) && notMut(x) && notInC1(x))
    ?? cands.descriptives.find((d) => !same(d, c3) && notMut(d) && notInC1(d))
    ?? (cls ? `Merupakan ${cls}` : (defParts.find((d) => !same(d, c3) && notMut(d) && notInC1(d)) ?? (exRed && notInC1(`Contoh: ${exRed}`) && !c3.toLowerCase().includes(`Contoh: ${exRed}`.toLowerCase()) ? `Contoh: ${exRed}` : `Merupakan kata`)));
  // c2 tidak boleh sama dengan clue_1 (standar tier 1-5: c1/c2/c3 selalu berbeda)
  const c2ok = same(c2, clue1) || tooClose(c2, clue1) ? `Merupakan kata` : c2;
  return same(c2ok, c3) ? [`Merupakan kata`, c3] : [c2ok, c3];
}

// ---------------------------------------------------------------- fix tier 6-10 (pertahankan kata & clue_1)
// Override manual c2/c3 untuk kata yang pipeline-nya jatuh ke placeholder ganda
// (definisi KBBI satu kalimat tanpa sense kedua/sinonim). clue_1 tetap pipeline.
import { MANUAL_C2C3 } from "./manual-tier6-c2c3.mjs";
const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const byWordLookup = new Map(candidates.map(c => [c.word, c]));

// Override manual untuk entri KBBI yang RUSAK TOTAL di sumber data (tidak bisa
// diperbaiki lewat pipeline): clue ditulis tangan, tidak menyebut jawaban, dan
// c1/c2/c3 saling berbeda.
const MANUAL = {
  istirahat: {
    // KBBI dump: "Verba (kata kerja) , istirahat singkat istirahat dua hari..."
    // — definisi terpotong, diawali koma, dan memuat kata jawaban.
    c1: "berhenti sebentar untuk melepaskan lelah; mengaso",
    c2: "mengaso sejenak untuk memulihkan tenaga",
    c3: "Sinonim: rehat",
  },
  // Entri KBBI yang definisinya bocor memuat kata jawaban / terlalu pendek /
  // tidak bisa diproses pipeline (parseEntry menolak), sehingga data lama yang
  // placeholder tetap tertinggal. Clue ditulis tangan — tidak menyebut jawaban.
  bersenang: {
    // KBBI: "bersenang diri; bersenang-senang" — memuat kata jawaban.
    c1: "bersukaria; bergembira ria",
    c2: "mencari kesenangan dengan bersantai atau bersuka ria",
    c3: "Sinonim: bergembira",
  },
  terhingga: {
    // KBBI: "ada batasnya; terbatas: bilangan tidak terhingga..." — contoh
    // memuat kata jawaban (terhingga) yang tidak bisa di-redact pipeline.
    c1: "ada batasnya; terbatas",
    c2: "mempunyai batas akhir; dapat dihitung sampai habis",
    c3: "Sinonim: berhingga",
  },
  segalanya: {
    // KBBI: "semuanya" — definisi terlalu pendek, pipeline jatuh ke placeholder.
    c1: "semuanya; semua yang ada",
    c2: "tidak ada yang tertinggal; seluruh hal",
    c3: "Sinonim: seluruhnya",
  },
  mendingin: {
    // c3 lama "menjadi dingin" menduplikat c1 "menjadi dingin; terasa dingin".
    c1: "menjadi dingin; terasa dingin",
    c2: "berangsur turun suhunya hingga tidak panas",
    c3: "Antonim: memanas",
  },
};

/** Deteksi clue_1 rusak dari data lama (mulai tanda baca / suku kata bertitik). */
const isBrokenC1 = (c1) => {
  if (!c1 || c1.length < 4) return true;
  if (/^[\s,;:)]/.test(c1)) return true;
  if (/^Berasal dari bahasa\b/i.test(c1)) return true; // penanda kata serapan KBBI
  if (/[a-z]\.[a-z]/.test(c1)) return true; // "mem.bom.bar.dir" dsb.
  return false;
};

const stats = { sinonim: 0, antonim: 0, deskriptif: 0, bocor: 0, contoh2: 0, total: 0, takAda: 0, c2MengandungSinonim: 0, c2SamaC3: 0, c1SamaC3: 0, placeholder: 0, c1Bocor: 0 };
const bocorSamples = [];
const dupSamples = [];

const tierArg = process.argv.find((a) => /^--tier=\d+$/.test(a));
const ONLY_TIER = tierArg ? Number(tierArg.split("=")[1]) : null;
const dumpArg = process.argv.find((a) => a.startsWith("--dump="));
const DUMP_PATH = dumpArg ? dumpArg.split("=")[1] : null;
for (let tier = 6; tier <= 10; tier++) {
  if (ONLY_TIER && tier !== ONLY_TIER) continue;
  const path = `src/data/vocabulary/tier${tier}.ts`;
  const src = readFileSync(path, "utf8");
  const rows = [...src.matchAll(WORD_RE)].map(m => [m[1], m[2], m[3], m[4]]);
  const fixed = rows.map(([word, c1, c2, c3]) => {
    stats.total++;
    const manual = MANUAL[word];
    if (manual) return [word, manual.c1, manual.c2, manual.c3];
    const cand = byWordLookup.get(word);
    if (!cand) {
      stats.takAda++;
      // Kata tidak ada di lookup KBBI → data asli dipertahankan, TAPI tetap
      // dibersihkan minimal: c2/c3 tidak boleh saling memuat, tidak boleh sama
      // dengan c1, tidak boleh bocor kata jawaban, dan "--" → "…". Kalau rusak,
      // ganti dengan placeholder non-duplikat (bukan bocor/duplikat).
      const cleanT = (t) => (t ? t.replace(/--/g, "…").replace(/\s+/g, " ").trim() : t);
      let r1 = cleanT(c1), r2 = cleanT(c2), r3 = cleanT(c3);
      const wbW = (t) => !!t && !t.startsWith("Contoh:") && new RegExp(`\\b${word}\\b`, "i").test(t);
      if (wbW(r1)) r1 = `Merupakan kata`;
      if (wbW(r2)) r2 = `Merupakan kata`;
      if (wbW(r3)) r3 = `Merupakan kata`;
      if (r2 === r1) r2 = `Merupakan kata`;
      if (r3 === r1 || r3 === r2) r3 = `Merupakan kata`;
      const low2 = (r2 ?? "").toLowerCase(), low3 = (r3 ?? "").toLowerCase();
      if (low2.length >= 6 && low3.length >= 4 && (low2.includes(low3) || low3.includes(low2))) {
        r2 = `Merupakan kata`;
      }
      if (r2.startsWith("Merupakan kata") || r3.startsWith("Merupakan kata")) stats.placeholder++;
      return [word, r1, r2, r3];
    }
    // Kata tanpa kelas kata eksplisit di KBBI → infer dari morfologi
    // (memangkas placeholder "Merupakan kata" yang membingungkan).
    if (!cand.klass) cand.klass = inferKlass(word);
    // clue_1 SELALU dari definisi bersih KBBI — data lama tier6 banyak yang rusak
    // (contoh pemakaian nyangkut, penanda KBBI, atau memuat kata jawaban).
    const defOk = (s) => s && s.length >= 4 && !LEAK_RE.test(s) && !/^[\s,;:)]/.test(s) && !wb(word).test(s);
    let c1Use = defOk(cand.def) ? trimSynTrail(cand.def) : null;
    if (!c1Use) {
      // definisi utama tidak layak → cari homograf/sense lain yang bersih
      c1Use = [cand, ...cand.homographs].flatMap(h => [h.def, ...(h.senses ?? [])])
        .map(s => trimSynTrail(s ?? ""))
        .find(s => s && s.length >= 8 && !/^[\s,;:)]/.test(s) && !wb(word).test(s)) ?? null;
    }
    if (!c1Use) {
      stats.c1Bocor++;
      c1Use = `Merupakan ${cand.klass && CLASS_NAME[cand.klass] ? CLASS_NAME[cand.klass] : "kata"}`;
    }
    // Buang trailer "; <kata tunggal>" dari c1 (sinonim bawaan KBBI) supaya
    // tidak duplikat dengan clue_3 / tidak memuat jawaban (mis. "; menggendong").
    c1Use = trimSynTrail(c1Use);
    // Def multi-fragment: c1 ambil 2 segmen pertama saja (batas ";" ke-2).
    // Segmen sisanya TIDAK boleh menjadi subset c1 — kalau semua fragment definisi
    // termuat di c1, pipeline tidak punya bahan c2/c3 dan jatuh ke placeholder
    // ganda ("Merupakan kata X" + "Merupakan kata Y"). Kalau tidak ada ";",
    // potong di koma ke-2 / " dan " pertama — pola "proses, cara, perbuatan X"
    // dan "ilmu tentang A dan B" (ikonografi, seismologi) menyisakan bahan untuk
    // clue_2/clue_3 ("perbuatan membelah", "teknik membuat arca").
    const cutC1 = (s) => {
      if (!s) return s;
      if (s.split(";").length > 2) {
        const h = s.split(";").slice(0, 2).join(";").trim();
        if (h.length >= 14) return h;
      }
      const commaParts = s.split(",");
      if (commaParts.length >= 3) {
        const h = commaParts.slice(0, 2).join(",").trim();
        if (h.length >= 14 && commaParts.slice(2).join(",").trim().length >= 8) return h;
      } else if (commaParts.length === 2) {
        const h = commaParts[0].trim();
        if (h.length >= 14 && commaParts[1].trim().length >= 8) return h;
      }
      const danIdx = s.indexOf(" dan ");
      if (danIdx > 0) {
        const h = s.slice(0, danIdx).trim();
        if (h.length >= 14 && s.slice(danIdx + 5).trim().length >= 8) return h;
      }
      return s;
    };
    c1Use = cutC1(c1Use);
    if (wb(word).test(c1Use)) {
      stats.c1Bocor++;
      const alt = [cand, ...cand.homographs].flatMap(h => [h.def, ...(h.senses ?? [])])
        .map(s => trimSynTrail(s ?? ""))
        .find(s => s && s.length >= 8 && !wb(word).test(s));
      c1Use = alt ?? `Merupakan ${cand.klass && CLASS_NAME[cand.klass] ? CLASS_NAME[cand.klass] : "kata"}`;
    }
    let [n2, n3] = pickPair(cand, c1Use);
    // Jaring pengaman bocor: clue TIDAK boleh memuat kata jawaban
    // (sinonim turunan, definisi yang menyebut kata, dll).
    const bocorClue = (t) => !!t && !t.startsWith("Contoh:") && wb(word).test(t);
    // JANGAN pakai fallback "Kata yang bermakna <c1>" — frasa itu memuat
    // seluruh clue_1 (check-clue-quality melaporkannya sebagai "c1 memuat c2").
    // Pakai kelas kata bila ada; sisanya placeholder generik (lebih baik daripada
    // clue yang memuat jawaban).
    if (bocorClue(n2)) n2 = cand.klass && CLASS_NAME[cand.klass] ? `Merupakan ${CLASS_NAME[cand.klass]}` : `Merupakan kata`;
    if (bocorClue(n3)) n3 = cand.klass && CLASS_NAME[cand.klass] ? `Merupakan ${CLASS_NAME[cand.klass]}` : `Merupakan kata`;
    if (word === "kesalahan" && process.env.TRACE) {
      console.log(`[TRACE kesalahan] pickPair=> n2="${n2}" n3="${n3}"`);
    }
    // Jaring pengaman: clue_3 tidak boleh sama/hampir sama dengan clue_1
    // (standar tier 1-5: c1/c2/c3 selalu berbeda), dan clue_3 tidak boleh
    // menjadi substring clue_1 (issue "c1 memuat c3").
    if (same(n3, c1Use) || tooClose(n3, c1Use) || c1Use.toLowerCase().includes(n3.toLowerCase())) {
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
      if (!okAlt(alt) && c2 && !LEAK_RE.test(c2) && (c2.startsWith("Contoh:") || !wb(word).test(c2))) alt = c2;
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
    // dipakai agar tidak ada duplikat clue. Pengganti TIDAK boleh sama dengan
    // c1Use (yang bisa juga placeholder, mis. "Merupakan kata benda").
    const phOther = (cur, other) =>
      ["kata benda", "kata kerja", "kata sifat", "kata keterangan", "kata bilangan"]
        .find((c) => `Merupakan ${c}` !== cur && `Merupakan ${c}` !== other && `Merupakan ${c}` !== c1Use.toLowerCase())
        ?? (cur.startsWith("Merupakan ") ? `Merupakan kata` : `Merupakan kata`);
    if (same(n2, c1Use) || tooClose(n2, c1Use) || c1Use.toLowerCase().includes(n2.toLowerCase())) n2 = phOther(n2, n3);
    if (same(n3, c1Use) || tooClose(n3, c1Use) || c1Use.toLowerCase().includes(n3.toLowerCase())) n3 = phOther(n3, n2);
    if (same(n2, n3) || nearSame(n2, n3)) {
      if (n3.startsWith(`Merupakan kata`)) n2 = n3 === `Merupakan kata benda` ? `Merupakan kata` : `Merupakan kata benda`;
      else n2 = n3.startsWith("Sinonim:") ? `Merupakan kata` : `Merupakan kata`;
    }
    if ((word === "kesalahan" || word === "menerapkan" || word === "peranggang" || word === "bersungut" || word === "jurnalisme" || word === "tempatan" || word === "manajerial" || word === "seismologi" || word === "ikonografi") && process.env.TRACE) {
      const c2sT = (cand ? clue2Candidates(cand, c1Use) : []).slice(0, 6);
      const c3sT = cand ? clue3Candidates(cand, c1Use) : null;
      console.log(`[TRACE ${word}] FINAL=> c1="${c1Use.slice(0, 50)}" c2="${n2}" c3="${n3}" | c2s=${JSON.stringify(c2sT)} | c3sin=${JSON.stringify((c3sT?.sinonims ?? []).slice(0, 4))} c3desc=${JSON.stringify((c3sT?.descriptives ?? []).slice(0, 4))} | example=${JSON.stringify(cand?.example ?? null)}`);
    }
    // Placeholder polos "Merupakan kata" tidak boleh muncul — ganti dengan frasa
    // bermakna yang tidak menyebut jawaban (definisi terbalik). Bila clue_1 sendiri
    // sudah "Merupakan X" (fallback tanpa definisi bersih), pakai kelas lawan.
    const fill = (t) => {
      if (t !== "Merupakan kata") return t;
      if (c1Use.startsWith("Merupakan ")) {
        return c1Use === "Merupakan kata benda" ? "Merupakan kata kerja" : "Merupakan kata benda";
      }
      // Jangan pernah membungkus seluruh c1 ("Kata yang bermakna <c1>") — itu
      // membuat clue_2 memuat clue_1 penuh (issue "c1 memuat c2" di checker).
      if (cand && cand.klass && CLASS_NAME[cand.klass]) return `Merupakan ${CLASS_NAME[cand.klass]}`;
      const exR = cand && cand.example ? redactExample(cand.example, cand.word) : null;
      if (exR && exR.length >= 6 && !c1Use.toLowerCase().includes(exR.toLowerCase())) return `Contoh: ${exR}`;
      return `Merupakan kata`;
    };
    n2 = fill(n2);
    n3 = fill(n3);
    // Jaring AKHIR (deterministik): c2/c3 harus saling berbeda dan TIDAK boleh
    // menjadi substring clue_1 (issue "c1 memuat c2/c3"). Kalimat Contoh:
    // dikecualikan — contoh memang memakai kata yang diilustrasikan. Pengganti
    // memakai "Merupakan kata" polos (generik, tidak salah kelas) supaya tidak
    // pernah menghasilkan kelas kata yang keliru.
    const subOf = (a, b) =>
      !a.startsWith("Contoh:") &&
      (b.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(b.toLowerCase()));
    if (same(n2, n3)) n3 = n2.startsWith("Merupakan ") ? "Merupakan kata" : "Merupakan kata benda";
    if (subOf(n2, c1Use)) n2 = n3 === "Merupakan kata" ? "Merupakan kata benda" : "Merupakan kata";
    if (subOf(n3, c1Use)) n3 = n2 === "Merupakan kata" ? "Merupakan kata benda" : "Merupakan kata";
    if (same(n2, n3)) n3 = n2 === "Merupakan kata" ? "Merupakan kata benda" : "Merupakan kata";
    // Pasangan placeholder TIDAK boleh saling memuat (checker: "a memuat b").
    // "Merupakan kata" adalah substring semua bentuk; "Merupakan kata X" vs
    // "Merupakan kata Y" (X≠Y) tidak saling memuat. Ganti bentuk yang lebih
    // pendek dengan kelas lain yang tidak nested, atau dengan contoh pemakaian.
    if (n2.startsWith("Merupakan ") && n3.startsWith("Merupakan ") &&
        (n2.includes(n3) || n3.includes(n2))) {
      const exR2 = cand && cand.example ? redactExample(cand.example, cand.word) : null;
      if (exR2 && exR2.length >= 6 && !c1Use.toLowerCase().includes(exR2.toLowerCase()) && !n3.includes(`Contoh: ${exR2}`)) {
        n2 = `Contoh: ${exR2}`;
      } else {
        const clsAlt = ["kata benda", "kata kerja", "kata sifat", "kata keterangan", "kata bilangan"]
          .find((c) => `Merupakan ${c}` !== n2 && `Merupakan ${c}` !== n3 &&
            !n2.includes(`Merupakan ${c}`) && !n3.includes(`Merupakan ${c}`) &&
            `Merupakan ${c}` !== c1Use.toLowerCase());
        if (clsAlt) {
          if (n2.length <= n3.length) n2 = `Merupakan ${clsAlt}`;
          else n3 = `Merupakan ${clsAlt}`;
        }
      }
    }
    // Contoh placeholder "--" (gaya lama) → "…" supaya tidak dianggap bocor.
    if (n2.startsWith("Contoh:")) n2 = n2.replace(/--/g, "…");
    if (n3.startsWith("Contoh:")) n3 = n3.replace(/--/g, "…");
    // Placeholder polos "Merupakan kata" (tanpa kelas) — coba angkat kelas asli
    // bila diketahui (dari KBBI/morfologi) supaya clue tetap informatif.
    if (n2 === "Merupakan kata" && cand && cand.klass && CLASS_NAME[cand.klass]) n2 = `Merupakan ${CLASS_NAME[cand.klass]}`;
    if (n3 === "Merupakan kata" && cand && cand.klass && CLASS_NAME[cand.klass]) n3 = `Merupakan ${CLASS_NAME[cand.klass]}`;
    // ===== ISI PLACEHOLDER DENGAN CONTOH PEMAKAIAN (sebelum merge asli) =====
    // Banyak kata berdefinisi satu kalimat pendek tidak punya sinonim/sense
    // kedua, tapi KBBI menyediakan kalimat contoh pemakaian — bahan clue_2
    // terbaik yang tidak pernah duplikat c1. Placeholder apa pun ("Merupakan
    // kata X") yang masih tersisa dan contoh tersedia diganti di sini.
    const exR2 = cand && cand.example ? redactExample(cand.example, cand.word) : null;
    const exText2 = exR2 && exR2.length >= 6 ? `Contoh: ${exR2}` : null;
    const notDupEx = (t) =>
      !!exText2 &&
      !c1Use.toLowerCase().includes(exText2.toLowerCase()) &&
      t !== exText2 && !t.includes(exText2) && !exText2.includes(t);
    if (n2.startsWith("Merupakan ") && notDupEx(n3)) n2 = exText2;
    else if (n3.startsWith("Merupakan ") && notDupEx(n2)) n3 = exText2;
    // Pasangan placeholder yang TERSISA (tanpa contoh) — jangan biarkan saling
    // memuat (checker: "a memuat b"). Ganti yang lebih pendek dengan kelas lain
    // yang tidak nested, atau biarkan kelas asli yang sudah benar.
    if (n2.startsWith("Merupakan ") && n3.startsWith("Merupakan ") &&
        (n2.includes(n3) || n3.includes(n2))) {
      const clsAlt = ["kata benda", "kata kerja", "kata sifat", "kata keterangan", "kata bilangan"]
        .find((c) => `Merupakan ${c}` !== n2 && `Merupakan ${c}` !== n3 &&
          !n2.includes(`Merupakan ${c}`) && !n3.includes(`Merupakan ${c}`) &&
          `Merupakan ${c}` !== c1Use.toLowerCase());
      if (clsAlt) {
        if (n2.length <= n3.length) n2 = `Merupakan ${clsAlt}`;
        else n3 = `Merupakan ${clsAlt}`;
      }
    }
    // ===== MERGE AKHIR: pertahankan c2/c3 ASLI yang VALID terhadap c1 final. =====
    // Jaring pengaman di atas bisa menimpa pasangan yang sudah baik dengan
    // placeholder (karena c1Use baru lebih pendek → c2/c3 asli jadi subset).
    // Di sini (paling akhir) data asli yang lolos semua validasi dipakai lagi,
    // sehingga baris yang sudah bagus tidak dirusak pipeline. Merge hanya
    // menimpa bila pasangan asli LEBIH BAIK (tidak placeholder) daripada
    // hasil pipeline yang placeholder.
    const bothPhNow = n2.startsWith("Merupakan ") && n3.startsWith("Merupakan ");
    const origPairValid = (o2, o3, c1) => {
      const ok = (t) => {
        if (!t || t.trim().length < 4) return false;
        const tc = t.toLowerCase();
        if (/^Merupakan kata/i.test(t)) return false;
        if (/^Kata yang bermakna/i.test(t)) return false;
        if (/^Istilah\b/i.test(t)) return false; // "Istilah kedokteran 1 ..." (sense bernomor)
        if (/--/.test(t)) return false; // placeholder contoh "--"
        if (/\b\d+\b/.test(t)) return false; // penanda sense bernomor / data rusak
        if (hasTail(t)) return false;
        // c2/c3 tidak boleh memuat ATAU termuat oleh c1 (cek dua arah)
        if (c1.toLowerCase().includes(tc) || tc.includes(c1.toLowerCase())) return false;
        return true;
      };
      if (!ok(o2) || !ok(o3)) return false;
      if (same(o2, o3) || nearSame(o2, o3)) return false;
      const l2 = o2.toLowerCase(), l3 = o3.toLowerCase();
      if (l2.includes(l3) || l3.includes(l2)) return false;
      // Contoh pemakaian boleh memuat kata jawaban (kalimat diilustrasikan),
      // tapi deskriptif/sinonim tidak boleh bocor.
      if (!o2.startsWith("Contoh:") && l2.includes(word)) return false;
      if (!o3.startsWith("Contoh:") && l3.includes(word)) return false;
      return true;
    };
    if (origPairValid(c2, c3, c1Use) &&
        (bothPhNow || n2.startsWith("Merupakan ") || n3.startsWith("Merupakan "))) {
      n2 = c2;
      n3 = c3;
    }
    // ===== OVERRIDE MANUAL c2/c3 (data terkurasi, menang atas semuanya) =====
    // Untuk kata yang pipeline-nya tetap placeholder ganda. Divalidasi ulang di
    // sini: manual ditolak bila memuat kata jawaban, subset c1, atau bentrok
    // satu sama lain (cek dua arah). Kalau ditolak, hasil pipeline dipertahankan.
    const manual23 = MANUAL_C2C3[word];
    if (manual23) {
      const m2 = manual23.c2, m3 = manual23.c3;
      const l1 = c1Use.toLowerCase();
      const okM = (t) =>
        !!t && t.trim().length >= 4 &&
        !/^Merupakan /i.test(t) &&
        !hasTail(t) &&
        !l1.includes(t.toLowerCase()) &&
        (t.startsWith("Contoh:") || !t.toLowerCase().includes(word));
      if (okM(m2) && okM(m3)) {
        const lm2 = m2.toLowerCase(), lm3 = m3.toLowerCase();
        if (!same(m2, m3) && !lm2.includes(lm3) && !lm3.includes(lm2)) {
          n2 = m2;
          n3 = m3;
        }
      }
    }
    if (n2 === "Merupakan kata" || n2 === "Merupakan kata benda") stats.placeholder++;
    if (n3 === "Merupakan kata" || n3 === "Merupakan kata benda") stats.placeholder++;
    // ===== JARING TERAKHIR (deterministik, berlaku untuk SEMUA jalur) =====
    // Jaminan mutlak: c1/c2/c3 pairwise berbeda, tidak saling memuat (dua arah),
    // dan tidak bocor. Kalimat "Contoh: ..." dikecualikan dari cek saling-memuat
    // (contoh memang memakai kata yang diilustrasikan).
    const mutOverlap = (a, b) => {
      if (!a || !b) return false;
      if (a.startsWith("Contoh:") || b.startsWith("Contoh:")) return false;
      const la = a.toLowerCase(), lb = b.toLowerCase();
      if (la.length < 6 || lb.length < 4) return false;
      return la.includes(lb) || lb.includes(la);
    };
    const safePh = (other) => {
      const used = [c1Use.toLowerCase(), (other ?? "").toLowerCase()];
      const pick = ["kata benda", "kata kerja", "kata sifat", "kata keterangan", "kata bilangan"]
        .find((c) => {
          const v = `merupakan ${c}`;
          return !used.some((u) => u.includes(v) || v.includes(u));
        });
      return pick ? `Merupakan ${pick}` : `Merupakan kata`;
    };
    if (mutOverlap(n2, n3)) {
      // ganti yang LEBIH PENDEK dengan kelas lain yang aman (tidak memuat/memuati)
      if (n2.length <= n3.length) n2 = safePh(n3);
      else n3 = safePh(n2);
    }
    if (mutOverlap(n2, c1Use)) n2 = safePh(n3);
    if (mutOverlap(n3, c1Use)) n3 = safePh(n2);
    if (same(n2, c1Use) || same(n3, c1Use)) {
      if (same(n2, c1Use)) n2 = safePh(n3);
      if (same(n3, c1Use)) n3 = safePh(n2);
    }
    if (same(n2, n3)) n3 = safePh(n2);
    if (n2.startsWith("Contoh:")) n2 = n2.replace(/--/g, "…");
    if (n3.startsWith("Contoh:")) n3 = n3.replace(/--/g, "…");
    return [word, c1Use, n2, n3];
  });
  if (DRY) {
    console.log(`tier${tier}: ${rows.length} kata (dry-run, tidak ditulis)`);
    console.log("  sample:", fixed.slice(0, 4).map(([w, c1, c2, c3]) => `"${w}" c2="${c2}" c3="${c3}"`).join("\n  "));
    if (DUMP_PATH) {
      // dump hasil dalam format tier untuk dianalisis (tanpa menulis file sumber)
      const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const rowsOut = fixed.map(([word, c1, c2, c3]) =>
        `  ["${word}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`,
      ).join("\n");
      const out = `// DUMP tier${tier}\nexport const TIER_${tier}_WORDS: [string, string, string, string][] = [\n${rowsOut}\n];\n`;
      writeFileSync(DUMP_PATH, out);
      console.log(`tier${tier}: dump ditulis ke ${DUMP_PATH}`);
    }
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
