// ============================================================
// KotaKata AI — Riset web + KBBI untuk memperbaiki clue kata yang
// lemah/absurd (parafrasa fallback, tautologi, fragmen rusak, dsb).
//
// Untuk SETIAP kata target:
//   1. Riset online: Google Search → Bing → KBBI web.id (ajax_submit),
//      ambil definisi dari HTML/JSON hasil pencarian.
//   2. Fallback offline: dump KBBI lokal (/tmp/kbbi.json) — sumber
//      otoritatif yang dipakai build-kbbi-seed.mjs (parser sama).
//   3. Generate kandidat clue_1/clue_2/clue_3 mengikuti aturan QA
//      proyek: tanpa "Merupakan kata X", tanpa bocor jawaban, tanpa
//      duplikat/substring antar kolom, c1 bukan Sinonim/Antonim/Contoh,
//      contoh pemakaian di-redact (kata → "…").
//   4. Override manual (clue-overrides.mjs) menang bila ada.
//
// Hasil: report JSON. Dengan --apply, perbaikan ditulis balik ke file
// tier + (opsional --sql) regenerate supabase/data/vocabulary.sql.
//
// Usage:
//   node scripts/vocab/research-clues.mjs                     # kata lemah, tier 10→1
//   node scripts/vocab/research-clues.mjs --tier=10           # satu tier
//   node scripts/vocab/research-clues.mjs --tiers=8,9,10      # beberapa tier
//   node scripts/vocab/research-clues.mjs --all               # SEMUA kata (10k)
//   node scripts/vocab/research-clues.mjs --words=a,b,c       # kata spesifik
//   node scripts/vocab/research-clues.mjs --limit=25          # batas per run
//   node scripts/vocab/research-clues.mjs --apply             # tulis balik ke tier
//   node scripts/vocab/research-clues.mjs --apply --sql       # + regenerate SQL
//   node scripts/vocab/research-clues.mjs --offline           # tanpa network
//   node scripts/vocab/research-clues.mjs --force             # abaikan cache
//   node scripts/vocab/research-clues.mjs --delay=1200        # jeda antar request
//   node scripts/vocab/research-clues.mjs --out=report.json   # path report
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CLUE_OVERRIDES } from "./clue-overrides.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------- args
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
};
const flag = (name) => process.argv.includes(`--${name}`);
const DELAY = Number(arg("delay", "1000"));
const TIMEOUT_MS = Number(arg("timeout", "12000"));
const KBBI_PATH = arg("kbbi", "/tmp/kbbi.json");
const CACHE_DIR = arg("cache", "/tmp/kotakata-research-cache");
const OUT_PATH = arg("out", join(ROOT, "scripts", "vocab", "research-report.json"));
const ONLY_WEAK =
  flag("weak") || (!flag("all") && !arg("tier", "") && !arg("tiers", "") && !arg("words", ""));
const OFFLINE = flag("offline");
const FORCE = flag("force");
const APPLY = flag("apply");
const WITH_SQL = flag("sql");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------- row regex
const ROW_RE = /^  \[\"([^\"]+)\",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

// ---------------------------------------------------------------- weak patterns
const WEAK_RES = [
  /^merupakan kata/i,
  /^hal yang berkaitan dengan/i,
  /^berkaitan dengan adanya/i,
  /^berkaitan dengan kegiatan/i,
  /^perihal [a-z·]{2,16}$/i,
  /^bersifat [a-z·]{2,16}$/i,
  /^kegiatan [a-z·]/i,
  /^melakukan [a-z·]/i,
];

const ABBREV_RE = /\b(pd|dl|krn|dgn|yg|sbg|dr|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk)\b/i;

/** Target yang butuh perbaikan: parafrasa lemah, fragmen rusak, kurung gantung,
 *  singkatan kuno (pd/dl/krn), atau c1 berformat Sinonim/Antonim. */
const needsRepair = (c1, c2, c3) => {
  const cols = [c1, c2, c3];
  if (cols.some((c) => WEAK_RES.some((re) => re.test(c ?? "")))) return true;
  if (cols.some((c) => isJunk(c))) return true;
  if (cols.some((c) => hasUnbalancedParen(c))) return true;
  if (cols.some((c) => ABBREV_RE.test(c ?? ""))) return true;
  if (/^(sinonim|antonim)\s*[:—–-]/i.test(c1 ?? "")) return true;
  // Duplikat gaya QA (sama persis / substring memuat) juga wajib diperbaiki.
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      if (qaDup(cols[i], cols[j])) return true;
  return false;
};

const isWeak = (c1, c2, c3) => [c1, c2, c3].some((c) => WEAK_RES.some((re) => re.test(c ?? "")));

// ---------------------------------------------------------------- KBBI dump (parser sama dgn build-kbbi-seed / fill-placeholders)
const MAX_LEN = 10;
const FUNCTION_CLASSES = new Set(["p", "pron", "konj", "prep"]);
const FUNCTION_CLASSES_ID = new Set(["partikel", "pronomina", "konjungsi", "preposisi"]);
const AFFIX_RE = /bentuk terikat|singkatan|akronim|kependekan|lambang/i;
const REGIONAL_RE = /\b(Mk|Ar|Sd|Jw|Aceh|Tlk|Plb|Min|Ach|Dr|Kp|kl|ark|cak|hor|ki)\b(?=\s*(?:Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi|\(kata))/i;

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
    .replace(/\butk\b/g, "untuk")
    .replace(/\bpd\b/g, "pada")
    .replace(/\bkrn\b/g, "karena")
    .replace(/\bmsl\b/g, "misalnya")
    .replace(/\bdl\b/g, "dalam")
    .replace(/\bsdh\b/g, "sudah")
    .replace(/\bthd\b/g, "terhadap")
    .replace(/\bdll\b/g, "dan lain-lain")
    .replace(/\bdsb\b/g, "dan sebagainya");

/** Bersihkan contoh pemakaian: strip tag, modernize, buang marker kelas kata
 *  nyasar & placeholder "--"/" - ", rapi spasi. */
function cleanExample(raw) {
  let d = decode(raw).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  d = d.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "");
  d = d.replace(/\s+(?:Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\(\s*kata\s+[^)]*\)|\s+kata\s+[a-z]+)\s*/gi, " ");
  d = d.replace(/\s--\s/g, " … ").replace(/\s-\s/g, " … ").replace(/\s+/g, " ").trim();
  return modernize(d);
}

function cleanDef(raw) {
  let d = decode(raw).replace(/<i>.*?<\/i>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^\?/.test(d)) return "";
  d = d.replace(/^\(\s*\d+\s*\)\s*/, "").replace(/^\d+\s*\)?\s*/, "");
  d = d.split(/:\s+(?=[a-zA-Z(])/)[0];
  d = d.replace(/;\s*\S*·.*$/i, "");
  d = d.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "");
  d = d.replace(/;\s*Berasal dari bahasa\s+[A-Za-z]+.*$/i, "");
  d = d.replace(/^Berasal dari bahasa [A-Za-z]+\s*/i, "");
  // Kualifikasi di awal definisi yang menempel ("(kaki, tangan, dan sebagainya) bertekan…")
  // → pindahkan ke belakang / buang bila sisa kalimat tetap utuh.
  d = d.replace(/^\([^)]*\)\s+(?=[a-z])/, "");
  d = d.replace(/^Istilah\s+\w+\s+(?=[a-z]{4,})/i, "");
  // Awalan kategori/kelas: "[Mil]", "[Kim]", "n (1)", "v (2)", "(Olr)" dsb.
  d = d.replace(/^\[\wà-ÿÀ-ÿ]+\]\s*/i, "");
  d = d.replace(/^\(\w{2,4}\)\s*/i, "");
  d = d.replace(/^(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\s*\(\s*\d+\s*\)\s*/i, "");
  d = d.replace(/^(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\s+\d+\s*/i, "");
  // Sense bocor di tengah: "…kantor : 2 tingkatan pengadilan" → potong.
  d = d.replace(/\s*:\s*\d+\s*[a-z].*$/i, "");
  // Penanda kelas kata nyasar di TENGAH kalimat: "berjalan Verba (kata kerja) (1) berlari"
  // → hapus marker + nomor sense yang menempel.
  d = d.replace(/\s+(?:Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\(\s*kata\s+[^)]*\)|\s+kata\s+[a-z]+)\s*/gi, " ");
  d = d.replace(/\s*\(\s*\d+\s*\)\s*/g, " ");
  // Placeholder kata KBBI ("--" atau " - " sebagai pengganti kata dasar) → "…".
  d = d.replace(/\s--\s/g, " … ").replace(/\s-\s/g, " … ").replace(/--\s*$/, "").replace(/:$/, "").replace(/[;,:,.…]+\s*$/g, "").trim();
  // Contoh nyasar setelah "…; " ("orang banyak; masyarakat: -- ramai …") → potong contoh.
  d = d.replace(/;\s+[^;]*: --?\s+.*$/i, "").replace(/;\s+[^;]*: --?\s*$/, "").trim();
  if (!d || d.length < 2) return "";
  return modernize(d);
}

/** Perbaikan mekanik satu kolom clue: modernize, tutup kurung gantung
 *  ("(kaki, tangan," → "(kaki, tangan, dan sebagainya)"), buang placeholder. */
function minimalRepair(t, plain = false) {
  if (!t) return "";
  let s = modernize(decode(t).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  // Awalan penanda kelas/istilah nyasar: "[Mil] 1 …", "Istilah pertanian …", "n (1) …".
  s = s.replace(/^\[\wà-ÿÀ-ÿ]+\]\s*/i, "").replace(/^Istilah\s+\w+\s+(?=[a-z]{4,})/i, "");
  s = s.replace(/^(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\s*(?:\(\s*\d+\s*\)|\d+)\s*/i, "");
  // Penanda kelas kata di AKHIR kalimat: "…tenaga kerja Nomina", "…kata benda" → buang.
  s = s.replace(/\s+(?:Verba|Nomina|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)(?:\s*\(?\s*kata\s+[a-z]+\s*\)?)?\s*$/i, "");
  s = s.replace(/\s--\s/g, " … ").replace(/\s-\s/g, " … ").replace(/--\s*$/, "").trim();
  // Fragmen sisa pemisahan KBBI: "sebagainya yang diberikan …" → buang awalan
  // ("sebagainya"/"dan sebagainya" murni di awal tetap dianggap fragmen rusak).
  const mSe = s.match(/^(?:dan\s+)?sebagainya\s+(?:yang\s+)?(.{6,})$/i);
  if (mSe) s = mSe[1];
  // Kurung gantung di akhir: tutup dengan "dan sebagainya)" bila ada "(" yang belum tertutup.
  if (hasUnbalancedParen(s)) {
    let depth = 0;
    let lastOpen = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") { depth++; lastOpen = i; }
      else if (s[i] === ")") depth--;
    }
    if (depth > 0 && lastOpen > -1) {
      const head = s.slice(0, lastOpen + 1);
      const tail = s.slice(lastOpen + 1).replace(/[,;:\s]+$/, "");
      s = plain
        ? `${head}${tail})`
        : /(?:dan sebagainya|dll|dsb)$/i.test(tail)
          ? `${head}${tail})`
          : `${head}${tail}, dan sebagainya)`;
    } else {
      s = s.replace(/\)+\s*$/, "").replace(/,+\s*$/, "").trim();
    }
  }
  s = s.replace(/[;,:,.…]+\s*$/g, "").trim();
  return s.length >= 3 ? s : "";
}

/** Deteksi kurung tidak seimbang / menggantung ("(kaki, tangan,", "dalam kalimat)"). */
function hasUnbalancedParen(t) {
  if (!t) return false;
  let depth = 0;
  for (const ch of t) {
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth < 0) return true;
    }
  }
  return depth !== 0;
}

function parseEntry(artiRaw) {
  const arti = decode(artiRaw ?? "");
  if (!arti || arti.includes(" ? ")) return null;
  const word = null; // parseEntry di sini dipakai per-arti (word sudah diketahui pemanggil)
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
    const defMatch = m[2].match(/^(.*?)(?=<i>|<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : m[2]);
    if (!def) return null;
    if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
    // Sense hanya dari bagian lema (sebelum <br> yang memisahkan turunan: men·te·ram·kan dsb)
    const lemmaPart = (m[2] ?? "").split(/<br\s*\/?>/i)[0];
    const senses = lemmaPart
      .split(/<b>\d+<\/b>/)
      .slice(1)
      .map((p) => cleanDef(p))
      .filter(Boolean);
    const exMatch = m[2].match(/<i>([^<]{3,})(?:<\/i>|$)/);
    const example = exMatch ? cleanExample(exMatch[1]) : null;
    const klassCode = klass.split(/\s+/)[0] ?? "";
    return { def, senses, example, arti, klass: klassCode };
  }
  const lines = arti.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
  if (!def) return null;
  if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
  const senses = [];
  for (const line of lines.slice(lines.length >= 2 && /^[a-z·.]+$/.test(lines[0]) ? 1 : 0)) {
    const nm = line.match(/^\(?(\d+)\)?\s*(.*)$/);
    if (nm) {
      const d = cleanDef(nm[2]);
      if (d && d.length >= 4) senses.push(d);
    }
  }
  // Sense bernomor di TENGAH baris
  const numSenseRe = /;\s*\(\s*(\d+)\s*\)\s*/gi;
  let ms;
  while ((ms = numSenseRe.exec(def)) !== null) {
    const after = def.slice(ms.index + ms[0].length).split(/;\s*\(\s*\d+\s*\)\s*/i)[0];
    const d = cleanDef(after);
    if (d && d.length >= 6 && !senses.includes(d)) senses.push(d);
  }
  const colIdx = meaning.indexOf(":");
  let example = null;
  if (colIdx > -1) {
    example = cleanExample(meaning.slice(colIdx + 1));
    if (example.length < 5) example = null;
  }
  return { def, senses, example, arti, klass };
}

let KBBI_BY_WORD = null;
function loadKbbi() {
  if (KBBI_BY_WORD) return KBBI_BY_WORD;
  const m = new Map();
  if (!existsSync(KBBI_PATH)) return m;
  try {
    const j = JSON.parse(readFileSync(KBBI_PATH, "utf8"));
    const entries = j.dictionary ?? j;
    for (const e of entries) {
      const w = (e.word ?? "").trim().toLowerCase();
      if (w && /^[a-z]+$/.test(w)) {
        const p = parseEntry(e.arti ?? "");
        if (p && p.def) {
          if (!m.has(w)) m.set(w, []);
          const arr = m.get(w);
          if (arr.length < 8) arr.push(p);
        }
      }
    }
  } catch (err) {
    console.error(`[warn] KBBI dump gagal dibaca (${err.message}) — lanjut tanpa KBBI.`);
  }
  KBBI_BY_WORD = m;
  return m;
}

// ---------------------------------------------------------------- web fetch
async function fetchText(url, timeoutMs = TIMEOUT_MS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: {
        "User-Agent": UA,
        "Accept-Language": "id-ID,id;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/json",
      },
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------- Google
async function searchGoogle(word) {
  const q = encodeURIComponent(`"${word}" artinya definisi`);
  const url = `https://www.google.com/search?q=${q}&hl=id&gl=id&num=5`;
  const html = await fetchText(url);
  return { url, html };
}

function extractGoogle(html, word) {
  const out = [];
  const push = (t) => {
    const c = cleanDef(t);
    if (c.length >= 8 && !out.includes(c)) out.push(c);
  };
  for (const m of html.matchAll(/<div[^>]*data-attrid="(?:definition|kac)"[^>]*>([\s\S]*?)<\/div>/gi)) push(m[1]);
  for (const m of html.matchAll(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) push(m[1]);
  for (const m of html.matchAll(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) {
    const t = decode(m[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (t.length >= 20) {
      const frag = t.split(/[.!?]\s/)[0].replace(/[;,:,.…]+$/g, "").trim();
      if (frag.length >= 8) push(frag);
    }
  }
  return out.slice(0, 6);
}

// ---------------------------------------------------------------- Bing
async function searchBing(word) {
  const q = encodeURIComponent(`"${word}" artinya definisi`);
  const url = `https://www.bing.com/search?q=${q}&setlang=id&cc=ID&count=8`;
  const html = await fetchText(url);
  return { url, html };
}

function extractBing(html, word) {
  const out = [];
  const push = (t) => {
    const c = cleanDef(t);
    if (c.length >= 8 && !out.includes(c)) out.push(c);
  };
  for (const m of html.matchAll(/<div[^>]*class="[^"]*defText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) push(m[1]);
  for (const m of html.matchAll(/<div[^>]*class="[^"]*defHead[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) push(m[1]);
  for (const m of html.matchAll(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)) push(m[1]);
  for (const m of html.matchAll(/<div[^>]*class="[^"]*b_snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) push(m[1]);
  return out.slice(0, 8);
}

// ---------------------------------------------------------------- KBBI web.id (ajax_submit — pola getWordDescription)
async function searchKbbiWeb(word) {
  const randomId = Math.floor(Math.random() * 1e9) + Date.now() % 1000000;
  const url = `https://kbbi.web.id/${encodeURIComponent(word)}/ajax_submit${randomId}`;
  const body = await fetchText(url, TIMEOUT_MS);
  return { url, body };
}

function extractKbbiWeb(body, word) {
  const out = [];
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return out; /* bukan JSON — abaikan */
  }
  if (!Array.isArray(data)) return out;
  const normLemma = (s) => s.replace(/[·.\s]/g, "").toLowerCase();
  for (const e of data) {
    const d = String(e?.d ?? "");
    if (!d) continue;
    // kbbi.web.id mengembalikan juga entri TERKAIT (mis. "lingga" untuk
    // prasasti) — hanya pakai entri yang lema-nya sama dengan kata target.
    const lm = d.match(/^<b>(?:<sup>\d+<\/sup>)?([^<]*)<\/b>/);
    if (lm && normLemma(decode(lm[1])) !== normLemma(word)) continue;
    const p = parseEntry(d);
    if (!p) continue;
    if (p.def && !out.includes(p.def)) out.push(p.def);
    for (const s of p.senses ?? []) if (!out.includes(s)) out.push(s);
    if (p.example && p.example.length >= 6 && !out.includes(p.example)) out.push(p.example);
  }
  return out.slice(0, 8);
}

// ---------------------------------------------------------------- online def gates
const EN_WORDS =
  /\b(the|and|you|your|with|this|that|these|those|from|for|not|are|was|were|have|has|will|would|about|here|there|their|they|them|what|when|where|which|who|how|why|to|of|in|it|is|be|as|by|at|videos|video|music|watch|share|subscribe|views|comments|news|calendar|meeting|posted|regular|scheduled|open|allow|show|description|site|home|page|menu|search|sign|login|account|email|password|click|read|more|latest|update|january|february|march|april|june|september|october|november|december|july|august|upload|original|content|friends|family|world|youtube|facebook|twitter|instagram|wikipedia|thank|please|hello|welcome)\b/gi;
const IDN_WORDS =
  /\b(yang|dengan|untuk|pada|dalam|adalah|atau|dari|ke|tidak|kata|perihal|hal|sifat|keadaan|orang|sesuatu|suatu|sebagai|menjadi|bagian|tempat|benda|proses|alat|hasil|disebut|berupa|biasanya|merupakan|yaitu|ialah|karena|sehingga|kepada|terhadap|tentang|antara|seperti|adanya|pemakaian|contoh|makna|kamus|istilah|serta|bukan|tanpa|juga|akan|telah|lebih|sebuah|sekitar|berbagai|tersebut|lainnya|mempunyai|memiliki|selain|kecuali|sama|umum|khusus|utama)\b/gi;
const JUNK_HTML_RE = /We would like to show you a description here|site won'?t allow us|View All News|enjoy the videos|Olivia Rodrigo/i;

/** Saringan teks Inggris / boilerplate / bahasa asing hasil pencarian —
 *  hanya terima definisi yang didominasi Bahasa Indonesia. */
function isPlausibleDef(t) {
  if (!t || t.length < 12) return false;
  if (JUNK_HTML_RE.test(t)) return false;
  // Teks bahasa asing (Turki/Portugis/Jerman dsb) sarat huruf non-ASCII;
  // definisi Indonesia hampir selalu ASCII murni.
  const nonAscii = (t.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii >= 3 && nonAscii > t.length * 0.04) return false;
  const en = (t.match(EN_WORDS) ?? []).length;
  const idn = (t.match(IDN_WORDS) ?? []).length;
  if (idn === 0) return false;
  if (en > idn) return false;
  return true;
}

// ---------------------------------------------------------------- clue quality gates
const same = (a, b) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
const wb = (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

function leaksAnswer(clue, word) {
  if (!clue) return false;
  return wb(word).test(clue);
}

/** Normalisasi untuk perbandingan: huruf kecil + buang semua non-alfanumerik
 *  (sehingga "tumbukan (mobil" vs "tumbukan mobil" dianggap sama). */
const normForCompare = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/gi, "");

function containsOverlap(a, b) {
  if (!a || !b) return false;
  const na = normForCompare(a);
  const nb = normForCompare(b);
  if (na === nb) return true;
  if (na.length >= 12 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function nearSame(a, b) {
  if (!a || !b) return false;
  const x = normForCompare(a);
  const y = normForCompare(b);
  return x === y || (x.length >= 12 && y.length >= 12 && (x.startsWith(y) || y.startsWith(x)));
}

const BAD_PREFIX = /^(merupakan kata|sinonim|antonim|contoh|kiasan\s+(?:merupakan|kata))/i;
const LEAK_RE = /Kata berawalan|Berawalan huruf|berakhir huruf|huruf terakhir|berjumlah\s*\d+\s*huruf|\b\d+\s*huruf\b/i;
const FALLBACK_COL_RE = /^(hal yang berkaitan dengan|berkaitan dengan|kegiatan|melakukan|perihal|merupakan kata)/i;
const TAUTOLOGY_RE = /^(bersifat|keadaan yang) [a-z·]{2,16}$/i;
const SCI_NAME_RE = /^[A-Z][a-z]{2,}\s[a-z]{3,}(?:\s[a-z]{3,})?$/; // binomial Latin
const BROKEN_FRAG_RE = /^[a-z·]{1,16}[),;:]$/i; // "kata benda)", "Verba (kata kerja)", "(kaki, tangan," dsb

function isJunk(t) {
  if (!t) return true;
  const s = t.trim();
  if (s.length < 4) return true;
  if (BROKEN_FRAG_RE.test(s)) return true;
  if (hasUnbalancedParen(s)) return true;
  // "perihal" TIDAK dianggap junk: KBBI memakai "perihal X" sebagai awalan
  // definisi nomina yang sah ("perihal peka; perihal mudah bergerak …").
  // Posisi c2/c3 tetap dijaga oleh FALLBACK_COL_RE di isGood.
  if (/^(kata kerja|kata benda|kata sifat|kata keterangan|sebagainya|dan sebagainya|dan lain|verba|nomina|adjektiva|adverbia)\b/i.test(s)) return true;
  if (/^(hal yang berkaitan dengan|berkaitan dengan adanya|berkaitan dengan kegiatan|perihal yang berkaitan dengan)\b/i.test(s)) return true;
  if (/^[a-z·]{2,16}\s*\)/.test(s)) return true; // "kata benda)" dsb
  if (/^(?:v|n|a|adv)(?=[A-ZÀ-Ý])/.test(s)) return true; // "vKiasan", "nPerihal" dsb (huruf kelas + kata capital)
  if (/\s-{1,2}\s/.test(s)) return true; // placeholder kata KBBI ("-- ramai", " - melihat", "tersenyum - melihat")
  return false;
}

function okClue(v, word, used) {
  if (!v || !v.trim()) return false;
  const t = v.trim();
  if (t.length < 4 || t.length > 200) return false;
  if (BAD_PREFIX.test(t)) return false;
  if (LEAK_RE.test(t)) return false;
  if (isJunk(t)) return false;
  if (used.has(t.toLowerCase())) return false;
  if (leaksAnswer(t, word)) return false;
  return true;
}

function validateSet(word, c1, c2, c3) {
  const cols = [c1, c2, c3];
  if (cols.some((c) => !c || !c.trim())) return "ada kolom kosong";
  if (cols.some((c) => leaksAnswer(c, word))) return "bocor jawaban";
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      if (same(cols[i], cols[j])) return `c${i + 1} == c${j + 1}`;
      if (containsOverlap(cols[i], cols[j])) return `c${i + 1} memuat c${j + 1}`;
      if (nearSame(cols[i], cols[j])) return `c${i + 1} mirip c${j + 1}`;
    }
  if (/^(sinonim|antonim)\s*[:—–-]/i.test(c1)) return "c1 berformat Sinonim/Antonim";
  if (cols.some((c) => /^merupakan kata/i.test(c))) return "masih placeholder";
  return null;
}

/** Deteksi duplikat dengan SEMANTIK QA (mirror check-clue-quality.mjs):
 *  sama persis, atau substring memuat antar kolom (gate panjang pada argumen
 *  pertama >= 12 huruf). Dipakai gate akhir attempt + fallback per-kolom
 *  supaya jumlah Issue QA tetap 0. */
function qaDup(a, b) {
  if (!a || !b) return false;
  const A = a.trim();
  const B = b.trim();
  if (A === B) return true;
  // Mirror check-clue-quality.mjs: "memuat" hanya dihitung bila KEDUANYA
  // >= 12 huruf (frasa), bukan kata tunggal yang wajar muncul di definisi.
  if (A.length >= 12 && B.length >= 12 && (A.includes(B) || B.includes(A))) return true;
  return false;
}

/** Pasangan kolom yang bertabrakan (overlap / nyaris sama) — dipakai fallback
 *  minimal repair: tabrakan yang SUDAH ADA di data lama ditoleransi (perbaikan
 *  mekanik tidak memperburuknya), tabrakan yang BARU diciptakan ditolak. */
function overlapPairs(cols) {
  const p = [];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      if (containsOverlap(cols[i], cols[j]) || nearSame(cols[i], cols[j])) p.push(`${i}${j}`);
    }
  return p;
}

function redactExample(ex, word) {
  if (!ex) return null;
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const red = ex.replace(re, "…").replace(/--/g, "…").replace(/\s-\s/g, " … ").replace(/\s+/g, " ").trim();
  if (red.length < 6) return null;
  return red;
}

function goodExample(ex, word) {
  if (!ex) return false;
  const t = ex.trim();
  if (t.length < 6) return false;
  if (SCI_NAME_RE.test(t)) return false;
  if (/^[a-z·]{2,16}$/i.test(t)) return false;
  return true;
}

function pickFragments(def, word, used, c1) {
  const out = [];
  for (const part of String(def).split(/[;,(]|\s+dan\s+|\s+atau\s+|\s+serta\s+/i)) {
    let t = cleanDef(part);
    // Fragmen sisa pemisahan KBBI: "sebagainya) yang diberikan …" →
    // buang awalan "sebagainya"/"yang" supaya jadi fragmen sah.
    const mSe = t?.match(/^(?:dan\s+)?sebagainya\s*(?:\)\s*)?(?:yang\s+)?(.{6,})$/i);
    if (mSe) t = mSe[1];
    if (!t || t.length < 8) continue;
    if (/^(dan|atau|serta|yang|dengan|sebagai|perihal|tentang|pada|dalam|untuk|kepada|msl|misalnya|yaitu|ialah|adalah)\b/i.test(t)) continue;
    if (isJunk(t)) continue;
    if (okClue(t, word, used) && !nearSame(t, c1) && !containsOverlap(t, c1)) out.push(t);
  }
  return out;
}

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

function pickSinonimAntonim(texts, word) {
  for (const t of texts) {
    const ant = extractAntonym(t, word);
    if (ant && !wb(word).test(ant)) return `Antonim: ${ant}`;
  }
  for (const t of texts) {
    const syn = extractSynonym(t, word);
    if (syn && !wb(word).test(syn)) return `Sinonim: ${syn}`;
  }
  return null;
}

// ---------------------------------------------------------------- research
async function researchWord(word) {
  const cacheFile = join(CACHE_DIR, `${word}.json`);
  if (!FORCE && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
      // Cache yang sudah pernah diriset ONLINE (atau saat ini offline) bisa
      // dipakai apa adanya; cache offline-only dipakai saat offline, tapi
      // saat online harus di-refetch supaya dapat bahan dari web.
      if (cached.online || OFFLINE) return cached;
    } catch {
      /* korup → riset ulang */
    }
  }

  const result = { word, sources: [], definitions: [], urls: [], kbbi: null, error: null, online: !OFFLINE };

  if (!OFFLINE) {
    for (const [name, fn, extract] of [
      ["bing", searchBing, extractBing],
      ["google", searchGoogle, extractGoogle],
      ["kbbiweb", searchKbbiWeb, extractKbbiWeb],
    ]) {
      try {
        const res = await fn(word);
        result.urls.push(res.url);
        const defs = extract(res.html ?? res.body ?? "", word);
        if (defs.length) {
          result.sources.push(name);
          result.definitions.push(...defs);
        }
        if (result.definitions.length >= 3) break;
      } catch (err) {
        result.error = `${name}: ${err.message}`;
      }
      await sleep(DELAY);
    }
  }

  const kbbi = loadKbbi().get(word) ?? [];
  if (kbbi.length) {
    result.kbbi = kbbi[0];
    if (!result.definitions.length) {
      result.sources.push("kbbi");
      result.definitions.push(kbbi[0].def, ...kbbi[0].senses);
    }
  }

  const seen = new Set();
  result.definitions = result.definitions
    .map((d) => cleanDef(d))
    .filter((d) => d.length >= 8 && !wb(word).test(d) && !isJunk(d) && isPlausibleDef(d) && !seen.has(d.toLowerCase()) && seen.add(d.toLowerCase()));

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  return result;
}

// ---------------------------------------------------------------- clue generation
function generateClues(word, research, oldClues) {
  const kbbi = research.kbbi;
  const defs = [...(kbbi ? [kbbi.def, ...(kbbi.senses ?? [])] : []), ...research.definitions]
    .map((t) => cleanDef(typeof t === "string" ? t : ""))
    .filter((t) => t.length >= 8);

  /** force=true → jangan pertahankan kolom lama sama sekali (dipakai saat
   *  set pertama gagal validasi karena kolom lama bertabrakan dgn kolom baru). */
  const attempt = (force) => {
    const used = new Set();
    const isGood = (c, idx, others) => {
      if (!c || !c.trim()) return false;
      if (/^merupakan kata/i.test(c)) return false;
      if (leaksAnswer(c, word)) return false;
      if (idx === 0 && /^(sinonim|antonim)\s*[:—–-]/i.test(c)) return false;
      if (isJunk(c)) return false;
      if (idx > 0 && (FALLBACK_COL_RE.test(c) || TAUTOLOGY_RE.test(c))) return false;
      if (/^Contoh: /.test(c)) {
        const ex = c.replace(/^Contoh: /, "");
        if (!goodExample(ex, word)) return false;
      }
      for (const o of others) {
        if (o && containsOverlap(c, o)) return false;
      }
      return true;
    };

    // ---- c1
    let c1 = force ? null : minimalRepair(oldClues[0]);
    if (!c1 || !isGood(c1, 0, [])) {
      c1 = null;
      for (const d of defs) {
        if (okClue(d, word, used) && !/^Kata serapan dari bahasa/i.test(d)) {
          c1 = d;
          break;
        }
      }
    }
    if (!c1) return null;
    used.add(c1.toLowerCase());

    // ---- c2
    let c2 = force ? null : minimalRepair(oldClues[1]);
    if (!c2 || !isGood(c2, 1, [c1])) {
      c2 = null;
      if (kbbi?.senses?.length) {
        for (const s of kbbi.senses) {
          if (okClue(s, word, used) && !nearSame(s, c1) && !containsOverlap(s, c1)) {
            c2 = s;
            break;
          }
        }
      }
      if (!c2) {
        const frags = pickFragments(kbbi?.def ?? "", word, used, c1);
        if (frags.length) c2 = frags[0];
      }
      // Contoh pemakaian sebagai c2 (mis. "Contoh: dua buah … di pendapa…")
      if (!c2 && kbbi?.example && goodExample(kbbi.example, word)) {
        const ex = redactExample(kbbi.example, word);
        if (ex) {
          const cand = `Contoh: ${ex}`;
          if (isGood(cand, 1, [c1])) c2 = cand;
        }
      }
      if (!c2) {
        for (const d of defs) {
          if (okClue(d, word, used) && !nearSame(d, c1) && !containsOverlap(d, c1)) {
            c2 = d;
            break;
          }
        }
      }
    }
    if (!c2) return null;
    used.add(c2.toLowerCase());

    // ---- c3
    let c3 = force ? null : minimalRepair(oldClues[2]);
    if (!c3 || !isGood(c3, 2, [c1, c2])) {
      c3 = null;
      const synAnt = pickSinonimAntonim([...(kbbi ? [kbbi.def] : []), ...research.definitions], word);
      if (synAnt && okClue(synAnt, word, used) && !containsOverlap(synAnt, c1) && !containsOverlap(synAnt, c2)) {
        c3 = synAnt;
      } else if (kbbi?.example && goodExample(kbbi.example, word)) {
        const ex = redactExample(kbbi.example, word);
        if (ex) {
          const cand = `Contoh: ${ex}`;
          if (!used.has(cand.toLowerCase()) && isGood(cand, 2, [c1, c2])) c3 = cand;
        }
      }
      if (!c3) {
        const frags = pickFragments(kbbi?.def ?? "", word, used, c1).filter((f) => !containsOverlap(f, c2));
        if (frags.length) c3 = frags[0];
      }
      if (!c3) {
        for (const d of defs) {
          if (okClue(d, word, used) && !containsOverlap(d, c1) && !containsOverlap(d, c2)) {
            c3 = d;
            break;
          }
        }
      }
    }
    if (!c3) return null;

    c1 = modernize(c1);
    c2 = modernize(c2);
    c3 = modernize(c3);
    if (hasUnbalancedParen(c1) || hasUnbalancedParen(c2) || hasUnbalancedParen(c3)) return { err: "kurung tidak seimbang" };

    const err = validateSet(word, c1, c2, c3);
    if (err) return { err };
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        if (qaDup([c1, c2, c3][i], [c1, c2, c3][j])) return { err: "duplikat QA" };
    return { c1, c2, c3 };
  };

  let result = attempt(false);
  if (!result || result.err) result = attempt(true);
  if (!result || result.err) {
    // Fallback per-kolom: perbaikan mekanik tiap kolom secara INDEPENDEN
    // (modernize abbrev "pd"/"dl", tutup kurung gantung, buang penanda
    // "Istilah …"/"[Mil]", buang placeholder "--"). Kolom yang perbaikannya
    // lolos gate dipakai; yang gagal tetap memakai nilai lama. Gate akhir
    // memakai SEMANTIK QA yang sama dengan check-clue-quality.mjs (sama persis
    // atau substring memuat >= 12 huruf) supaya jumlah Issue QA tetap 0.
    const repairCol = (t, plain) => {
      const r = minimalRepair(t ?? "", plain);
      if (!r || r.trim().length < 4 || isJunk(r) || leaksAnswer(r, word) || hasUnbalancedParen(r)) return t ?? "";
      return r;
    };
    let parts = oldClues.map((t) => repairCol(t, false));
    // Kolom yang perbaikannya menciptakan duplikat QA (mis. kurung gantung
    // ditutup ", dan sebagainya)" yang memuat fragmen "sebagainya" di kolom
    // lain) dicoba ulang dengan tutup kurung polos ">" — tetap lebih baik
    // daripada nilai lama; bila tetap bentrok, kolom dikembalikan ke lama.
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < 3; i++) {
        let bad = false;
        for (let j = 0; j < 3; j++) if (i !== j && qaDup(parts[i], parts[j])) bad = true;
        if (!bad) continue;
        // Kandidat alternatif untuk kolom i (diperbaiki ataupun tidak):
        // (1) tutup kurung polos, (2) buang ", dan sebagainya)" dari kurung
        // yang sudah tertutup — diterima bila lolos gate & menghilangkan
        // duplikat QA. Kolom lain tidak diubah di sini.
        const cands = [];
        const plain = repairCol(oldClues[i], true);
        if (plain !== oldClues[i]) cands.push(plain);
        const trim = oldClues[i].replace(/,\s*dan sebagainya\)\s*$/, ")");
        if (trim !== oldClues[i] && trim.trim().length >= 4 && !isJunk(trim) && !leaksAnswer(trim, word) && !hasUnbalancedParen(trim)) cands.push(trim);
        for (const cand of cands) {
          let ok = true;
          for (let j = 0; j < 3; j++) if (i !== j && qaDup(cand, parts[j])) ok = false;
          if (ok) {
            parts[i] = cand;
            improved = true;
            break;
          }
        }
      }
    }
    // Kolom placeholder ("Merupakan kata X") diisi bahan nyata dari riset
    // (senses → contoh pemakaian → fragmen definisi → sinonim), selalu dengan
    // gate anti-duplikat QA terhadap kolom lain.
    const fillCandidates = (idx) => {
      const others = parts.map((p, k) => (k === idx ? null : p));
      const used = new Set(others.filter(Boolean).map((p) => p.toLowerCase()));
      const cands = [];
      for (const s of kbbi?.senses ?? []) {
        const t = cleanDef(typeof s === "string" ? s : "");
        if (t && t.length >= 8) cands.push(t);
      }
      if (kbbi?.example && goodExample(kbbi.example, word)) {
        const ex = redactExample(kbbi.example, word);
        if (ex) cands.push(`Contoh: ${ex}`);
      }
      cands.push(...pickFragments(kbbi?.def ?? "", word, used, parts[0] ?? ""));
      const syn = pickSinonimAntonim([...(kbbi ? [kbbi.def] : []), ...research.definitions], word);
      if (syn) cands.push(syn);
      for (const c of cands) {
        const t = c.trim();
        if (t.length < 4 || isJunk(t) || leaksAnswer(t, word) || hasUnbalancedParen(t)) continue;
        if (idx === 0 && /^(sinonim|antonim)\s*[:—–-]/i.test(t)) continue;
        if (idx > 0 && /^contoh\b/i.test(t) && !/^Contoh: /.test(t)) continue;
        if (used.has(t.toLowerCase())) continue;
        if (others.some((o) => o && (qaDup(t, o) || qaDup(o, t)))) continue;
        return t;
      }
      return null;
    };
    for (let i = 0; i < 3; i++) {
      if (/^merupakan kata/i.test(parts[i] ?? "")) {
        const fill = fillCandidates(i);
        if (fill) parts[i] = fill;
      }
    }
    // Kolom yang masih menciptakan duplikat QA dikembalikan ke nilai lama.
    for (let i = 0; i < 3; i++) {
      let bad = false;
      for (let j = 0; j < 3; j++) if (i !== j && qaDup(parts[i], parts[j])) bad = true;
      if (bad) parts[i] = oldClues[i];
    }
    // Tolak hanya bila masih ada duplikat QA BARU antara dua kolom yang
    // KEDUANYA berubah di pass ini.
    let rejected = false;
    for (let i = 0; i < 3 && !rejected; i++)
      for (let j = i + 1; j < 3; j++)
        if (qaDup(parts[i], parts[j]) && !qaDup(oldClues[i], oldClues[j]) && parts[i] !== oldClues[i] && parts[j] !== oldClues[j]) rejected = true;
    if (!rejected && !/^(sinonim|antonim|contoh)\b/i.test(parts[0] ?? "")) {
      result = { c1: parts[0], c2: parts[1], c3: parts[2] };
    } else {
      return result ?? null;
    }
  }

  const changed = result.c1 !== oldClues[0] || result.c2 !== oldClues[1] || result.c3 !== oldClues[2];
  return { ...result, changed, sources: research.sources, urls: research.urls };
}

// ---------------------------------------------------------------- read tiers
function readTierFiles() {
  const dir = join(ROOT, "src", "data", "vocabulary");
  const files = readdirSync(dir).filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f));
  const byTier = new Map();
  for (const f of files.sort()) {
    const m = f.match(/^tier(\d+)/);
    const tier = Number(m[1]);
    const src = readFileSync(join(dir, f), "utf8");
    const lines = src.split("\n");
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      const mm = lines[i].match(/^  \[\"([^\"]+)\",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/);
      if (mm) rows.push({ file: f, lineIdx: i, word: mm[1], c1: mm[2], c2: mm[3], c3: mm[4] });
    }
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(...rows);
  }
  return byTier;
}

// ---------------------------------------------------------------- apply
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function applyRows(changes) {
  const byFile = new Map();
  for (const ch of changes) {
    if (!ch.applied) continue;
    if (!byFile.has(ch.file)) byFile.set(ch.file, []);
    byFile.get(ch.file).push(ch);
  }
  for (const [file, list] of byFile) {
    const path = join(ROOT, "src", "data", "vocabulary", file);
    const lines = readFileSync(path, "utf8").split("\n");
    for (const ch of list) {
      const [c1, c2, c3] = ch.new ?? [];
      const newLine = `  ["${esc(ch.word)}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`;
      lines[ch.lineIdx] = newLine;
    }
    writeFileSync(path, lines.join("\n"));
    console.log(`  ✓ ${file}: ${list.length} baris diperbarui`);
  }
}

// ---------------------------------------------------------------- main
const tierArg = arg("tier", "");
const tiersArg = arg("tiers", "");
const wordsArg = arg("words", "");
const limit = Number(arg("limit", "0"));
const skip = Number(arg("skip", "0"));

const tiers = tierArg ? [Number(tierArg)] : tiersArg ? tiersArg.split(",").map(Number) : null;
const words = wordsArg ? wordsArg.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean) : null;

const byTier = readTierFiles();
const targets = [];
for (const tier of [...byTier.keys()].sort((a, b) => b - a)) {
  const rows = byTier.get(tier);
  for (const r of rows) {
    if (tiers && !tiers.includes(tier)) continue;
    if (words) {
      if (words.includes(r.word)) targets.push({ tier, ...r });
      continue;
    }
    if (ONLY_WEAK && !needsRepair(r.c1, r.c2, r.c3)) continue;
    targets.push({ tier, ...r });
  }
}
if (skip > 0) targets.splice(0, skip);
if (limit > 0) targets.length = Math.min(targets.length, limit);

console.log(`Target: ${targets.length} kata (weak-only=${ONLY_WEAK}, offline=${OFFLINE}, apply=${APPLY})`);
if (!targets.length) {
  console.log("Tidak ada target.");
  process.exit(0);
}

const report = { runAt: new Date().toISOString(), offline: OFFLINE, targets: targets.length, results: [] };
const changes = [];
let ok = 0;
let skipped = 0;

for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  const oldClues = [t.c1, t.c2, t.c3];
  const override = CLUE_OVERRIDES[t.word];
  let result;

  if (override && override.length === 3) {
    const changed = override[0] !== oldClues[0] || override[1] !== oldClues[1] || override[2] !== oldClues[2];
    result = { word: t.word, c1: override[0], c2: override[1], c3: override[2], changed, sources: ["override"], urls: [] };
  } else {
    const research = await researchWord(t.word);
    result = generateClues(t.word, research, oldClues);
    if (!result) {
      skipped++;
      report.results.push({ word: t.word, tier: t.tier, status: "SKIP (tidak ada bahan)", old: oldClues });
      process.stdout.write(`\r${i + 1}/${targets.length} skip=${skipped}`);
      continue;
    }
  }

  if (result.err) {
    skipped++;
    report.results.push({ word: t.word, tier: t.tier, status: `SKIP (${result.err})`, old: oldClues });
    process.stdout.write(`\r${i + 1}/${targets.length} skip=${skipped}`);
    continue;
  }

  const entry = {
    word: t.word,
    tier: t.tier,
    file: t.file,
    lineIdx: t.lineIdx,
    old: oldClues,
    new: [result.c1, result.c2, result.c3],
    changed: result.changed,
    sources: result.sources ?? [],
    urls: result.urls ?? [],
  };
  report.results.push(entry);
  if (result.changed) {
    changes.push({ ...entry, applied: APPLY });
    ok++;
  }
  process.stdout.write(`\r${i + 1}/${targets.length} ok=${ok} skip=${skipped}`);
}
console.log();

if (APPLY && changes.length) applyRows(changes);

// ---- report
const outDir = dirname(OUT_PATH);
mkdirSync(outDir, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
console.log(`\nReport → ${OUT_PATH}`);

// ---- ringkasan
const changedEntries = report.results.filter((r) => r.changed);
const skipEntries = report.results.filter((r) => r.status);
console.log(`\n=== RINGKASAN ===`);
console.log(`Diproses: ${report.results.length}`);
console.log(`Berubah: ${changedEntries.length}`);
console.log(`Skipped: ${skipEntries.length}`);
for (const r of changedEntries.slice(0, 12)) {
  console.log(`  ${r.tier ? `t${r.tier} ` : ""}${r.word}: "${r.old[0].slice(0, 40)}" → "${r.new[0].slice(0, 40)}"`);
}
if (changes.length && !APPLY) {
  console.log(`\nℹ️  ${changes.length} perbaikan SIAP — jalankan dengan --apply untuk menulis balik ke tier.`);
}
if (APPLY && changes.length && !WITH_SQL) {
  console.log(`\nℹ️  Regenerate SQL: node scripts/vocab/gen-vocab-sql.mjs`);
}
