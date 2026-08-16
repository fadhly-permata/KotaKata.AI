// ============================================================
// DAFTAR KATA VULGAR — KotaKata aman anak (PLAN-041)
// ============================================================
// Data daftar kata vulgar/kasar/sensitif + scanner yang memindai
// SEMUA file kosakata (jawaban + clue c1/c2/c3).
//
// Tiga kelompok:
//   1. VULGAR_WORDS — kata yang SENDIRINYA vulgar (makian, alat kelamin,
//      tindakan seksual, pelecehan, hinaan, diskriminatif, narkoba).
//      Muncul di jawaban ATAU clue → WAJIB dihapus/diganti.
//   2. ANSWER_ONLY_WORDS — kata yang TIDAK LAYAK jadi JAWABAN soal anak
//      (istilah medis seksual, narkoba, organ intim), tapi kata dasarnya
//      boleh muncul di clue berkonotasi netral (mis. "jenis kelamin").
//      Flag HANYA kalau posisinya sebagai jawaban.
//   3. CONTEXTUAL_WORDS — kata berkonotasi ganda (hewan, sifat, bagian
//      tubuh) yang normal di KBBI; dihapus HANYA kalau konteks
//      clue/jawabannya jelas kasar/melecehkan (tinjau manual tiap hit).
//
// Scanner memakai word-boundary (bukan substring) agar tidak kena
// false positive seperti "memekik"/"partai"/"berakit" — tapi tiap hit
// tetap dicetak lengkap dengan konteks untuk ditinjau pemilik.
//
// Usage:
//   node scripts/vocab/vulgar-words.mjs            # scan jawaban + clue
//   node scripts/vocab/vulgar-words.mjs --json     # output JSON
// ============================================================

// ── 1. Kata vulgar (hapus selalu, jawaban & clue) ──────────────
// Format: [kata, variasi ejaan umum (opsional), ...]
export const VULGAR_WORDS = [
  // Makian & umpatan kasar
  ["bajingan"], ["bangsat", "bgst"], ["brengsek"], ["keparat"], ["kampret"],
  ["jancuk", "jancok", "cuk"], ["sialan"], ["kentut"], ["bacot"], ["mampus"],
  ["bejat"], ["jahanam"], ["ngentot"], ["ngewe"], ["cocot"], ["asu"],
  ["kunyuk"], ["keparat"],
  // Alat kelamin / kata seksual vulgar
  ["kontol"], ["memek", "meki", "pepek"], ["tempik"], ["jembut"], ["peler"],
  ["pelir"], ["titit"], ["burit"], ["senggama"], ["bersetubuh"], ["coli"],
  ["masturbasi"], ["onani"], ["cabul"], ["mesum"], ["porno"], ["pornografi"],
  ["bugil"], ["sundal"], ["lonte"], ["pelacur"], ["jablay"], ["mucikari"],
  ["germo"], ["zina"], ["berzina"], ["meniduri"],
  // Hinaan & pelecehan
  ["goblok"], ["tolol"], ["bego"], ["dungu"], ["idiot"], ["sinting"],
  ["banci"], ["bencong"], ["homo"], ["lesbi", "lesbian"], ["gay"],
  ["kafir"], ["cungkring"],
  // Narkoba (tidak layak jadi soal anak)
  ["ganja"], ["sabu", "shabu"], ["ekstasi"], ["kokain"], ["heroin"],
  ["morfin"], ["psikotropika"], ["narkotika"],
  // Kotoran / tindakan tubuh kasar
  ["berak"], ["tahi"], ["eek"],
];

// ── 2. Kata tidak layak jadi JAWABAN (flag hanya posisi jawaban) ──
export const ANSWER_ONLY_WORDS = [
  "anus", "dubur", "vagina", "penis", "zakar", "testis", "klitoris",
  "kelamin", "kemaluan", "ereksi", "mani", "opium", "narkotik", "seks",
  "perselingkuhan", "selingkuh",
];

// ── 3. Kata kontekstual (tinjau manual per hit) ────────────────
export const CONTEXTUAL_WORDS = [
  // Binatang yang juga dipakai sebagai makian (jawaban binatang AMAN;
  // flag hanya kalau clue memakainya sebagai umpatan).
  "anjing", "babi", "monyet", "kadal", "anjir", "anjay", "anying",
  // Bagian tubuh yang bisa diplesetkan kasar
  "pantat", "bokong", "susu", "payudara", "tetek", "toket", "dada",
  // Sifat/keadaan yang bisa jadi hinaan
  "gila", "edan", "sial", "bisu", "tuli", "buta", "cacat",
  // Lain-lain yang netral di KBBI
  "waria", "seksi", "jorok", "setan", "iblis", "dukun",
  "pesugihan", "judi", "rokok",
  // Kata KBBI normal (munafik = suka berpura-pura; kafir = istilah agama)
  // yang TIDAK vulgar — hanya ditinjau bila konteksnya melecehkan.
  "munafik", "kafir",
];

// ── Scanner ─────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");
const AS_JSON = process.argv.includes("--json");

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier\d.*\.ts$/.test(f))
  .sort((a, b) => {
    const k = (f) => Number(f.match(/^tier(\d+)/)[1]);
    return k(a) - k(b);
  });

const entries = [];
for (const f of tierFiles) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    entries.push({ file: f, tier: Number(f.match(/^tier(\d+)/)[1]), word: m[1], c1: m[2], c2: m[3], c3: m[4] });
  }
}

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");

function scanField(text, group) {
  const hits = [];
  for (const w of group) {
    if (wordRe(w).test(text)) hits.push(w);
  }
  return [...new Set(hits)];
}

const results = { vulgar: [], answerOnly: [], contextual: [] };
for (const e of entries) {
  const fields = [
    ["jawaban", e.word],
    ["clue_1", e.c1],
    ["clue_2", e.c2],
    ["clue_3", e.c3],
  ];
  for (const [field, text] of fields) {
    for (const [w, ...variants] of VULGAR_WORDS) {
      for (const cand of [w, ...variants]) {
        if (cand && wordRe(cand).test(text)) {
          results.vulgar.push({ tier: e.tier, word: e.word, field, hit: cand, clue: text, file: e.file });
        }
      }
    }
    if (field === "jawaban") {
      for (const w of scanField(text, ANSWER_ONLY_WORDS)) {
        results.answerOnly.push({ tier: e.tier, word: e.word, field, hit: w, clue: text, file: e.file });
      }
    }
    for (const w of scanField(text, CONTEXTUAL_WORDS)) {
      results.contextual.push({ tier: e.tier, word: e.word, field, hit: w, clue: text, file: e.file });
    }
  }
}

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

console.log(`TOTAL entri: ${entries.length}`);
console.log(`\n=== VULGAR (jawaban & clue wajib dibersihkan) — ${results.vulgar.length} hit ===`);
for (const r of results.vulgar) {
  console.log(`  t${r.tier} [${r.word}] ${r.field}: "${r.clue}"  (hit: ${r.hit})`);
}
console.log(`\n=== ANSWER-ONLY (jawaban diganti) — ${results.answerOnly.length} hit ===`);
for (const r of results.answerOnly) {
  console.log(`  t${r.tier} [${r.word}] ${r.field}: "${r.clue}"  (hit: ${r.hit})`);
}
console.log(`\n=== KONTEKSTUAL (tinjau manual) — ${results.contextual.length} hit ===`);
const seen = new Set();
for (const r of results.contextual) {
  const key = `${r.tier}|${r.word}|${r.field}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  t${r.tier} [${r.word}] ${r.field}: "${r.clue}"  (hit: ${r.hit})`);
}
console.log(`\n(vulgar: ${results.vulgar.length}, answer-only: ${results.answerOnly.length}, kontekstual: ${results.contextual.length} hit perlu ditinjau)`);
