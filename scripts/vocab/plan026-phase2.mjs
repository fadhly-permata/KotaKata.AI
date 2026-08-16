// ============================================================
// PLAN-026 FASE 2 — selesaikan re-seed tier 1-2 & rapikan semua tier.
//   1) Tier 2: ganti kata tugas/abstrak (tidak, harus, sudah, ...) dengan
//      kata konkret mudah dari pool bebas.
//   2) Semua tier 2-9: ganti kata yang BENTROK dengan tier lebih rendah
//      dengan kata dari pool bebas, supaya tiap tier tetap 1000 kata unik
//      dan dedup global SQL tidak memangkas tier lain.
//   3) Validasi akhir: 1000/tier, 0 bentrok antar tier, audit bersih.
//
// Pool prioritas:
//   A. Sisa kandidat PART1 yang belum terpakai (kata mudah TERKURASI).
//   B. Kata tier1 versi lama yang bebas — HANYA panjang >= 4, bukan kata
//      tugas/noise/asing/agama, dan clue tidak bocor.
// Tier 2 TIDAK menerima kata 3 huruf (terlalu sulit ditebak).
//
// Usage: node scripts/vocab/plan026-phase2.mjs [--dry-run]
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FREE_POOL } from "./plan026-free-pool.mjs";
import { PART1 } from "./plan026-part1.mjs";

const DRY = process.argv.includes("--dry-run");
const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

const TUPLE_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/;
const esc = (s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const fmtTuple = (t) => `  [${t.map(esc).join(", ")}],`;

const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier\d+(?:[ab]|-part\d+)?\.ts$/.test(f))
  .sort((a, b) => {
    const k = (f) => {
      const m = f.match(/^tier(\d+)(?:([ab])|-part(\d+))?\.ts$/);
      return [Number(m[1]), m[2] ? 1 : m[3] ? 2 : 0, m[2] ? (m[2] === "a" ? 1 : 2) : m[3] ? Number(m[3]) : 0];
    };
    const ka = k(a), kb = k(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });

const parseTuples = (src) => {
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(TUPLE_RE);
    if (m) out.push({ line, word: m[1], tuple: [m[1], m[2], m[3], m[4]] });
  }
  return out;
};

const allWordsByTier = () => {
  const map = new Map();
  for (const f of tierFiles) {
    const tier = Number(f.match(/^tier(\d+)/)[1]);
    const ws = parseTuples(readFileSync(join(vocabDir, f), "utf8")).map((e) => e.word);
    map.set(tier, [...(map.get(tier) ?? []), ...ws]);
  }
  return map;
};

// ---- Kata tugas / noise yang TIDAK boleh dipakai sebagai pengganti ----
const BAD_FOR_REPLACEMENT = new Set([
  // kata tugas & partikel
  "dan", "atau", "akan", "tak", "kan", "para", "per", "lah", "kah", "pun", "tah", "nak", "mau", "pada",
  "juga", "lagi", "saja", "ini", "itu", "yang", "di", "ke", "dari", "untuk", "dengan", "agar", "supaya",
  "kalau", "jika", "bila", "maka", "sebab", "karena", "sambil", "meski", "walau", "anda", "kami", "kita",
  "dia", "ia", "kamu", "engkau", "apa", "siapa", "mana", "kapan", "mengapa", "kenapa", "bahwa", "yakni",
  "ialah", "adalah", "sehingga", "melainkan", "tetapi", "namun", "sedangkan", "serta", "tidak", "harus",
  "sudah", "hanya", "semua", "bukan", "punya", "lebih", "telah", "masih", "dapat", "perlu", "pasti",
  "belum", "tentu", "cukup", "tetap", "mulai", "boleh", "butuh", "yakin", "ingin", "pikir", "ingat",
  "antar", "usaha", "biasa", "betul", "tepat", "paham", "sangat", "selalu", "hampir", "kira", "jadi",
  "hal", "saat", "lain", "mana", "lalu", "sama", "kali", "cara", "luar", "diri", "siap", "tuan", "rasa",
  "bawa", "bagi", "ikut", "masa", "aneh", "tadi", "cuma", "agak", "awal", "tiba", "usah", "amat", "tanpa",
  "terus", "karena", "sejak", "hingga", "sampai", "ketika", "setelah", "sebelum", "selama", "demi",
  "bagi", "terhadap", "tentang", "melalui", "antara", "sekali", "sungguh", "nanti", "doa",
  // nama huruf abjad & partikel pendek
  "alif", "ba", "ta", "tsa", "jim", "ha", "kha", "dal", "dzal", "ra", "zai", "sin", "syin", "shad",
  "dad", "tha", "zha", "ain", "ghain", "fa", "qaf", "kaf", "lam", "mim", "nun", "waw", "hamzah", "ya",
  "tau", "kim", "bis", "sen",
  // nama diri / agama / geografi / zodiak / planet
  "ali", "adam", "roma", "cina", "mei", "juni", "juli", "mars", "leo", "sun", "loki", "nova", "rama",
  "arya", "hana", "mina", "lala", "gaga", "mimi", "baba", "babe", "papi", "mama", "papa", "kak", "pak",
  "bung", "nona", "sir", "bos", "budi", "bapa", "sara", "tian", "kane", "mika", "mira", "rani", "dara",
  "rina", "hani", "isis", "zulu", "ibrahim", "nabi", "allah", "yesus", "kristus", "hindu", "islam",
  "nazi", "sing", "tuhan", "natal", "maria", "yoga", "nabi", "imam", "kristen", "buddha", "konghucu",
  // kata asing / Inggris & akronim & istilah aneh
  "were", "his", "hit", "cut", "top", "ram", "gun", "net", "gol", "had", "mode", "pro", "zero", "plus",
  "rel", "wan", "nan", "are", "mil", "over", "tan", "stan", "skor", "ton", "helm", "dek", "atom",
  "pon", "rim", "leng", "wig", "polo", "step", "demo", "uni", "kung", "laki", "duk", "bet", "oli",
  "vila", "babu", "das", "cuka", "bias", "germo", "jun", "jung", "bong", "kang", "ken", "long", "los",
  "sok", "wang", "mark", "man", "sel", "not", "set", "kru", "lab", "dok", "pos", "pas", "min", "got",
  "kok", "tank", "jet", "ban", "tipe", "trik", "real", "nol", "leg", "sofa", "pop", "bar", "blok",
  "area", "klik", "akun", "klub", "klan", "grup", "tim", "rekor", "statistik", "kuis", "stok", "kupon",
  // 3 huruf aneh/obskur (tidak untuk tier2)
  "aib", "aki", "ala", "anu", "ape", "ara", "ari", "asa", "aur", "cik", "bab", "bah", "cop", "bon",
  "bak", "bam", "bao", "bas", "bit", "bea", "bel", "cup", "dai", "dam", "dar", "dik", "bot", "din",
  "cam", "abu", "cek", "bor", "dik", "eki", "gel", "gus", "gus", "jel", "kid", "lek", "mob", "nun",
  "odu", "pam", "pat", "pil", "qaf", "ram", "san", "tan", "tok", "um", "vir", "wad", "yak", "zur",
  // kata kasar/negatif/tidak cocok tier mudah
  "seks", "homo", "gila", "sial", "maut", "judi", "bius", "punk", "keji", "naif", "seok", "lana",
  "kara", "tang", "aria", "lila", "trek", "gaib", "tara", "pers", "kamp", "mual", "tipu", "suap",
  "tahi", "bangsat", "bego", "tolol", "jahanam", "setan", "iblis", "neraka", "bunuh", "tikus", "kusta",
  // nama diri/geografi/hari yang tersisa
  "bang", "arab", "solo", "rabu", "liat", "cina", "jawa", "sunda", "batak", "melayu", "india", "amerika",
]);

// ---- Tier 2: kata abstrak/tugas yang diganti dengan kata konkret mudah ----
const TIER2_FUNCTION_WORDS = [
  "tidak", "harus", "sudah", "hanya", "semua", "bukan", "punya", "lebih", "telah", "kasih", "masih",
  "dapat", "perlu", "pasti", "belum", "tentu", "cukup", "tetap", "mulai", "boleh", "butuh", "yakin",
  "ingin", "pikir", "ingat", "antar", "biasa", "betul", "tepat", "paham", "usaha", "tanpa", "terus",
  "nanti", "doa", "ada", "agak", "awal", "tiba", "hampir", "kira", "sungguh", "sekali",
];

// ============================================================
// 0) Kumpulkan state
// ============================================================
const tierWords = allWordsByTier();
const usedAll = new Set();
for (const ws of tierWords.values()) for (const w of ws) usedAll.add(w);

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
const clueOk = (t) => {
  const [w, c1, c2, c3] = t;
  if (!c1 || c1.trim().length < 3) return false;
  if ([c1, c2, c3].some((c) => c && wordRe(w.toLowerCase()).test(c))) return false;
  if (c1 && c2 && c1 === c2) return false;
  if (c1 && c1.includes("Merupakan kata")) return false;
  return true;
};

// Pool A: sisa kandidat PART1 yang bebas (kata mudah TERKURASI)
const poolA = [];
const seenA = new Set();
for (const t of PART1) {
  const [w] = t;
  if (usedAll.has(w)) continue;
  if (BAD_FOR_REPLACEMENT.has(w)) continue;
  if (seenA.has(w)) continue;
  if (!clueOk(t)) continue;
  seenA.add(w);
  poolA.push(t);
}

// Pool B: kata tier1 lama yang bebas — >= 4 huruf, bukan kata tugas/noise
const poolB = [];
const seenB = new Set();
for (const t of FREE_POOL) {
  const [w] = t;
  if (usedAll.has(w)) continue;
  if (BAD_FOR_REPLACEMENT.has(w)) continue;
  if (w.length < 4) continue;
  if (seenB.has(w)) continue;
  if (!clueOk(t)) continue;
  seenB.add(w);
  poolB.push(t);
}
console.log(`pool A (PART1 kurasi): ${poolA.length} | pool B (tier1 lama >=4): ${poolB.length}`);

// ============================================================
// 1) Tentukan kebutuhan penggantian per tier
// ============================================================
const plan = [];
for (let tier = 2; tier <= 9; tier++) {
  const earlier = new Set();
  for (let t = 1; t < tier; t++) for (const w of tierWords.get(t) ?? []) earlier.add(w);
  const mine = tierWords.get(tier) ?? [];
  const mineSet = new Set(mine);
  if (tier === 2) {
    for (const w of TIER2_FUNCTION_WORDS) {
      if (mineSet.has(w) && !earlier.has(w)) plan.push({ tier, word: w, reason: "kata tugas abstrak tier2" });
    }
  }
  for (const w of [...mineSet]) {
    if (earlier.has(w)) plan.push({ tier, word: w, reason: `bentrok dgn tier < ${tier}` });
  }
}
console.log(`kebutuhan penggantian: ${plan.length} kata`);
for (const t of [2, 3, 4, 5, 6, 7, 8, 9]) {
  console.log(`  tier${t}: ${plan.filter((p) => p.tier === t).length} kata`);
}

// ============================================================
// 2) Alokasikan pengganti — tier2 pakai pool B (kata mudah tier1 lama)
//    DULU, lalu A (sisa kandidat PART1 yang lebih sulit); tier>=3 sebaliknya.
// ============================================================
const poolQueueA = [...poolA].sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]));
const poolQueueB = [...poolB].sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]));
const usedReplacement = new Set();
const assignment = new Map();
let fail = false;

const alloc = (queue) => {
  for (let i = 0; i < queue.length; i++) {
    const w = queue[i][0];
    if (usedReplacement.has(w)) continue;
    const [t] = queue.splice(i, 1);
    usedReplacement.add(w);
    return t;
  }
  return null;
};

for (const p of plan) {
  let rep;
  if (p.tier === 2) {
    rep = alloc(poolQueueB) ?? alloc(poolQueueA);
  } else {
    rep = alloc(poolQueueA) ?? alloc(poolQueueB);
  }
  if (!rep) {
    console.error(`GAGAL: pool habis untuk ${p.word}|${p.tier}`);
    fail = true;
    break;
  }
  assignment.set(`${p.word}|${p.tier}`, rep);
}
if (fail) process.exit(1);

// ============================================================
// 3) Terapkan ke file
// ============================================================
let applied = 0;
for (const f of tierFiles) {
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  if (tier < 2 || tier > 9) continue;
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  const seenWord = new Set();
  const out = [];
  let changed = 0;
  for (const line of src.split("\n")) {
    const m = line.match(TUPLE_RE);
    if (!m) { out.push(line); continue; }
    const word = m[1];
    const rep = assignment.get(`${word}|${tier}`);
    if (rep) {
      if (seenWord.has(word)) { console.warn(`SKIP duplikat ${word} di ${f}`); out.push(line); continue; }
      out.push(fmtTuple(rep));
      seenWord.add(word);
      changed++;
      continue;
    }
    out.push(line);
  }
  if (changed) {
    if (!DRY) writeFileSync(path, out.join("\n"));
    console.log(`${f}: ganti ${changed} kata`);
    applied += changed;
  }
}
console.log(`total diterapkan: ${applied} kata${DRY ? " (dry-run)" : ""}`);

// ============================================================
// 4) Validasi akhir
// ============================================================
{
  const tw = allWordsByTier();
  for (const [t, ws] of [...tw.entries()].sort((a, b) => a[0] - b[0])) {
    const uniq = new Set(ws);
    console.log(`  t${t}: ${ws.length} entri, ${uniq.size} unik, ${ws.length - uniq.size} duplikat-internal`);
  }
  const global = new Map();
  for (const [t, ws] of tw) for (const w of new Set(ws)) {
    if (global.has(w)) global.get(w).push(t); else global.set(w, [t]);
  }
  const collisions = [...global.entries()].filter(([, ts]) => ts.length > 1);
  console.log(collisions.length ? `BENTROK antar tier: ${collisions.length} kata → ${collisions.slice(0, 15).map(([w, ts]) => `${w}(${ts.join(",")})`).join(", ")}` : "BENTROK antar tier: 0 ✅");
  const leaky = [...assignment.values()].filter((t) => !clueOk(t));
  console.log(`clue pengganti bocor jawaban: ${leaky.length}`);
}
