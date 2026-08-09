import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;
const kbbiByWord = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (!kbbiByWord.has(w)) kbbiByWord.set(w, []);
  kbbiByWord.get(w).push(e);
}

const vocabDir = "src/data/vocabulary";
const WORD_RE = /^  \["([^"]+)"/gm;
const words = new Set();
for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) words.add(m[1]);
}

const REGIONAL = {
  Jw: "Jawa",
  Sd: "Sunda",
  Mk: "Minangkabau",
  Min: "Minangkabau",
  Ban: "Banjar",
  Ac: "Aceh",
  Ach: "Aceh",
  Bg: "Bugis",
  Mak: "Makassar",
  Tlk: "Melayu Tolaki",
  Plb: "Melayu Palembang",
  Klm: "Melayu Kalimantan",
  Mdr: "Madura",
  Sas: "Sasak",
  Bjr: "Banjar",
  Day: "Dayak",
  Gor: "Gorontalo",
  Bat: "Batak",
  Nia: "Nias",
  Mnd: "Mandar",
  Tob: "Toba",
  Ang: "Angkola",
  Krw: "Kerinci",
  Snd: "Sunda",
  Mly: "Melayu",
  Bet: "Betawi",
  Sng: "Sangir",
};

const hits = [];
for (const w of words) {
  const es = kbbiByWord.get(w);
  if (!es) continue;
  // Ambil entri utama: cari entri yang headword-nya PERSIS kata (tanpa superscript
  // homograf). Entri KBBI menaruh homograf di <sup>N</sup> di awal headword.
  let best = null;
  for (const e of es) {
    const arti = String(e.arti ?? "");
    const hw = arti.match(/&lt;b&gt;\s*(?:&lt;sup&gt;\d+&lt;\/sup&gt;)?\s*([^&<]+?)&lt;\/b&gt;/);
    if (hw) {
      const hwClean = hw[1].replace(/[·\s]/g, "").toLowerCase();
      if (hwClean === w.replace(/[·\s]/g, "")) {
        best = arti;
        break;
      }
    }
  }
  if (!best) continue;

  // Hanya <i>KODE</i> yang muncul TEPAT setelah headword pertama (definisi utama).
  // Anchor ^ supaya homograf sekunder di tengah string tidak dihitung.
  const m = best.match(/^&lt;b&gt;\s*(?:&lt;sup&gt;\d+&lt;\/sup&gt;)?\s*([^&<]+?)&lt;\/b&gt;\s*&lt;i&gt;\s*([A-Za-z]{2,4})\s+[a-z]+/);
  if (m) {
    const code = m[2];
    if (REGIONAL[code]) {
      hits.push({ w, lang: REGIONAL[code], arti: best.slice(0, 110) });
    }
  }
}

console.log(`kata vocab: ${words.size}`);
console.log(`kata dengan penanda bahasa daerah DI DEFINISI UTAMA: ${hits.length}`);
const byLang = {};
for (const h of hits) byLang[h.lang] = (byLang[h.lang] || 0) + 1;
console.log("Per bahasa:", JSON.stringify(byLang, null, 1));
console.log("\nDaftar:");
hits.forEach((h) => console.log(`  ${h.w} [${h.lang}] :: ${h.arti.replace(/\s+/g, " ")}`));
