// ============================================================
// AUDIT KOSAKATA — flag kata & clue bermasalah di SEMUA tier.
// Dipakai untuk memetakan & memperbaiki kualitas soal
// (PLAN-026: tier 1-2 terlalu sulit, kata absurd seperti
// "airan"/"airnya", clue tak nyambung).
//
// Kategori yang di-flag:
//   1) -nya adverb (bukan lemma): rasanya, tadinya, agaknya, ...
//   2) pasif di-*: dimakan, dibakar, diuji, dijual, ...
//   3) kata tugas / partikel: dan, akan, tak, kan, para, per, lah, ...
//   4) noise 2-4 huruf (tier 1-2): akronim, kata asing, nama, dll.
//   5) clue bocor (memuat jawaban) / placeholder / c1==c2 / kosong.
//   6) kata yang mengandung kata lain secara menyeluruh (flag info).
//
// Usage: node scripts/check/audit-vocab.mjs [--json]
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");
const AS_JSON = process.argv.includes("--json");

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier\d.*\.ts$/.test(f))
  .sort((a, b) => {
    const k = (f) => {
      const m = f.match(/^tier(\d+)/);
      return Number(m[1]);
    };
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

// ---- Kategori 1: -nya non-lemma ----
// Lemma KBBI yang sah berakhiran -nya (whitelist) — selain ini dianggap turunan.
const NYA_LEMMA = new Set(["hanya", "punya", "tanya", "nyonya", "bertanya"]);

// ---- Kategori 2: pasif di-* (bentuk turunan, bukan lemma yang enak ditebak) ----
const DI_PASSIVE = new Set([
  "diuji", "dijual", "dimakan", "dibakar", "dikejar", "ditanam",
  "dimaksud", "dikandung", "dipanggang",
]);

// ---- Kategori 3: kata tugas / partikel (jawaban TTS yang buruk) ----
const FUNCTION_WORDS = new Set([
  "dan", "atau", "akan", "tak", "kan", "para", "per", "lah", "nak", "mau",
  "pada", "juga", "lagi", "saja", "pun", "ini", "itu", "yang", "di", "ke",
  "dari", "untuk", "dengan", "agar", "supaya", "kalau", "jika", "bila",
  "maka", "sebab", "karena", "sambil", "meski", "walau", "anda", "kami",
  "kita", "dia", "ia", "kamu", "engkau", "apa", "siapa", "mana", "kapan",
  "mengapa", "kenapa", "bahwa", "yakni", "ialah", "adalah", "yakni",
  "sehingga", "melainkan", "tetapi", "namun", "sedangkan", "serta", "pun",
]);

// ---- Kategori 4: noise 2-4 huruf (kurasi untuk tier 1-2) ----
const NOISE_WORDS = new Set([
  // partikel & penanda gramatikal
  "lah", "kah", "pun", "tah", "kan", "tak", "nak", "per", "para", "dan", "atau",
  // nama huruf abjad
  "alif", "ba", "ta", "tsa", "jim", "ha", "kha", "dal", "dzal", "ra", "zai",
  "sin", "syin", "shad", "dad", "tha", "zha", "ain", "ghain", "fa", "qaf",
  "kaf", "lam", "mim", "nun", "waw", "ha", "hamzah", "ya", "tau", "kim", "lam",
  // nama diri / geografi / agama / zodiak / planet
  "ali", "adam", "roma", "cina", "mei", "juni", "juli", "mars", "leo", "sun",
  "loki", "nova", "rama", "arya", "hana", "mina", "mina", "lala", "gaga",
  "mimi", "baba", "babe", "papi", "mama", "papa", "kak", "pak", "bung",
  "nona", "tuan", "sir", "bos", "budi", "bapa", "sara", "tian", "kane",
  "mika", "mira", "rani", "dara", "rina", "hani", "isis", "zulu", "ibrahim",
  "nabi", "allah", "yesus", "kristus", "hindu", "islam", "nazi", "sing",
  // kata asing / Inggris (bukan KBBI utama)
  "were", "his", "hit", "cut", "top", "ram", "gun", "net", "gol", "had",
  "mode", "pro", "zero", "plus", "rel", "wan", "nan", "his", "are", "mil",
  "over", "tan", "stan", "skor", "ton", "helm", "dek", "atom", "were",
  // akronim / singkatan / satuan aneh
  "kim", "mil", "are", "pon", "rim", "leng", "tian", "wig", "polo", "step",
  "demo", "uni", "kung", "laki", "duk", "bet", "oli", "vila", "babu", "das",
  "cuka", "bias", "germo", "tian", "jun", "jung", "bong", "kang", "ken",
  "long", "los", "sok", "wang", "mark", "man", "are", "sel", "not", "set",
  "sin", "bis", "sen", "kru", "lab", "dok", "pos", "pas", "min", "got",
  "kok", "kim", "jim", "tau", "dad", "tank", "jet", "ban", "tipe", "trik",
  "real", "nol", "leg", "sofa", "pop", "bar", "blok", "not", "lab",
  "area", "are", "mil", "sel", "pas", "pos", "dok", "got", "min", "kok",
  "wang", "los", "sok", "jung", "bong", "kang", "ken", "jun", "long",
]);

// ---- Kategori 5: clue bermasalah (word-boundary, sejalan dgn check-clue-quality) ----
const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
const flagClue = (e) => {
  const issues = [];
  const w = e.word.toLowerCase();
  if (!e.c1 || e.c1.trim().length < 3) issues.push("clue_1 kosong/terlalu pendek");
  if (e.c1 && wordRe(w).test(e.c1)) issues.push("clue_1 memuat jawaban");
  if (e.c2 && wordRe(w).test(e.c2)) issues.push("clue_2 memuat jawaban");
  if (e.c3 && wordRe(w).test(e.c3)) issues.push("clue_3 memuat jawaban");
  if (e.c1 && e.c2 && e.c1 === e.c2) issues.push("clue_1 == clue_2");
  if (e.c1 && e.c1.includes("Merupakan kata")) issues.push("placeholder 'Merupakan kata'");
  return issues;
};

// ---- Kumpulkan hasil ----
const report = { byCategory: {}, byTier: {}, total: entries.length };
const push = (cat, e, why) => {
  (report.byCategory[cat] ??= []).push({ tier: e.tier, word: e.word, file: e.file, why });
};

for (const e of entries) {
  // 1) -nya non-lemma
  if (e.word.endsWith("nya") && !NYA_LEMMA.has(e.word)) push("1_nya_non_lemma", e, "akhiran -nya bukan lemma KBBI");
  // 2) pasif di-
  if (DI_PASSIVE.has(e.word)) push("2_pasif_di", e, "bentuk pasif di- (turunan)");
  // 3) kata tugas
  if (FUNCTION_WORDS.has(e.word)) push("3_kata_tugas", e, "kata tugas/partikel — jawaban TTS buruk");
  // 4) noise tier 1-2
  if (NOISE_WORDS.has(e.word)) push("4_noise_pendek", e, "noise 2-4 huruf (akronim/asing/nama)");
  // 4b) tier1: SEMUA kata 2-3 huruf selain whitelist (terlalu pendek utk ditebak)
  if (e.tier === 1 && e.word.length <= 3 && !["air", "api", "ibu", "tua", "muda", "kiri", "atas", "kota", "desa", "buku", "nama", "jam", "cara", "hari", "mata", "batu", "bisa", "ada", "satu", "kayu", "tali", "susu", "emas", "roti", "kopi", "ikan", "ular", "kuda", "buru", "padi", "ubi", "tebu", "sapu", "paku", "gigi", "kaki", "jari", "tangan", "kepala", "beo", "kue", "es", "teh", "jus", "vas", "bus", "dua", "rok", "hiu", "alu", "flu", "ohm"].includes(e.word)) {
    push("5_tier1_terlalu_pendek", e, "tier1: 2-3 huruf non-whitelist");
  }
  // 6) clue bermasalah
  for (const why of flagClue(e)) push("6_clue_bermasalah", e, why);
}

// ---- Ringkasan ----
const summary = {};
for (const [cat, list] of Object.entries(report.byCategory)) summary[cat] = list.length;
for (const e of entries) {
  report.byTier[e.tier] = (report.byTier[e.tier] ?? 0) + 1;
}

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`TOTAL entri: ${report.total}`);
console.log("Per tier:", JSON.stringify(report.byTier));
console.log("\n=== Ringkasan per kategori ===");
for (const [cat, n] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${n}`);
}

console.log("\n=== Detail (maks 80 per kategori) ===");
for (const [cat, list] of Object.entries(report.byCategory).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n-- ${cat} (${list.length}) --`);
  const uniq = [...new Map(list.map((x) => [`${x.word}|${x.tier}`, x])).values()];
  console.log("  " + uniq.slice(0, 80).map((x) => `${x.word}(t${x.tier})`).join(", "));
}
