// PLAN-048: scan kata asing di seed lokal + DB Supabase.
// Kata asing mentah (mis. "START"), akronim asing tak lazim, nama diri/merek.
// Serapan lazim yang sudah ber-Indonesianisasi (kolektif, ideologi, dll) TIDAK
// di-flag — itu sudah bahasa Indonesia.
// Usage: node scripts/db/scan-foreign-words.mjs [--db-only]
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// ---------------------------------------------------------------
// Heuristik kata asing / tidak-wajar sebagai JAWABAN:
// 1) Huruf kapital penuh (akronim asing mentah: START, OK, TV, CD, ...)
// 2) Pola huruf asing: q/x/z/w di posisi tidak umum untuk kata Indonesia
//    (catatan: beberapa serapan lazim punya q/x — whitelist di bawah)
// 3) Kombinasi huruf tak lazim: f/v/b ganda dll — cukup daftar manual.
// 4) Daftar manual kata asing mentah / merek / nama diri.
// ---------------------------------------------------------------
const ALL_CAPS_RE = /^[A-Z]{2,}$/; // START, OK, TV...
const HAS_WEIRD_LETTERS = /[qxz]/; // trigger flag, tapi whitelist di bawah
const STARTS_WITH_WEIRD = /^(x|z)/; // xilofon? (xilofon = serapan lazim)

// Kata yang MUNGKIN ter-flag tapi sebenarnya serapan lazim / wajar.
// Kunci: huruf kecil — perbandingan case-insensitive.
const WHITELIST = new Set([
  "xilofon", "xenofobia", "xilem", "zaman", "zebra", "zakat", "zat", "zenith",
  "zodiak", "zona", "zoo", "zoologi", "kuota", "kuorum", "kuadrat", "kualitas",
  "kuantitas", "kuartal", "kuartet", "kuasa", "quasar", "quorum", "salat",
  "zaman", "ekspor", "ekspresi", "ekstra", "ekstrem", "kontra", "kompleks",
  "refleks", "fleksibel", "konteks", "teks", "kompleksitas", "eksekusi",
  "eksklusif", "eksperimen", "eksotis", "eksplorasi", "eksploitasi", "faks",
  "fokus", "fonem", "fosil", "foto", "fotokopi", "frekuensi", "frustrasi",
  "fusi", "futuristik", "fakultas", "fasilitas", "fase", "fatal", "favorit",
  "fenomena", "figur", "filosofi", "final", "fisik", "fisika", "flora",
  "formula", "formulir", "forum", "fragment", "frase", "vitamin", "video",
  "viral", "visa", "visi", "visual", "vital", "vitamin", "vokal", "volume",
  "vonis", "vulkan", "volt", "valuta", "variabel", "variasi", "vektor",
  "vendeta", "ventilasi", "versi", "vertikal", "veteran", "veteriner",
  "valid", "valas", "velcro", "varietas", "wagon", "wasit", "warta", "wisata",
  "wibawa", "wihara", "xenon", "xilografi", "zen", "zigzag", "zina", "zirafah",
]);

const MANUAL_FOREIGN = new Set([
  "start", "stop", "ok", "okay", "yes", "no", "go", "on", "off", "up", "down",
  "left", "right", "open", "close", "save", "load", "new", "old", "hot", "cold",
  "fast", "slow", "big", "small", "high", "low", "true", "false", "play",
  "pause", "exit", "back", "next", "prev", "home", "menu", "file", "edit",
  "view", "help", "about", "login", "logout", "sign", "user", "pass", "mail",
  "post", "send", "receive", "read", "write", "print", "copy", "paste", "cut",
  "undo", "redo", "find", "replace", "select", "insert", "delete", "update",
  "create", "delete", "clear", "close", "open", "start", "finish", "end",
  "begin", "stop", "continue", "wait", "sleep", "wake", "run", "walk", "jump",
  "fly", "swim", "drive", "ride", "turn", "push", "pull", "throw", "catch",
  "hit", "kick", "punch", "grab", "hold", "release", "break", "fix", "build",
  "make", "do", "have", "get", "put", "take", "give", "find", "lose", "win",
  "lose", "beat", "kill", "die", "live", "love", "hate", "like", "dislike",
  "want", "need", "must", "should", "can", "could", "will", "would", "may",
  "might", "shall", "come", "go", "leave", "arrive", "depart", "travel",
  "book", "room", "door", "window", "floor", "wall", "roof", "ceiling",
  "table", "chair", "bed", "lamp", "phone", "computer", "screen", "keyboard",
  "mouse", "printer", "scanner", "speaker", "camera", "video", "audio",
  "music", "song", "dance", "sing", "play", "game", "score", "level", "stage",
  "world", "earth", "moon", "sun", "star", "sky", "cloud", "rain", "snow",
  "wind", "storm", "fire", "water", "earth", "air", "space", "time", "day",
  "night", "morning", "evening", "noon", "midnight", "week", "month", "year",
  "today", "tomorrow", "yesterday", "now", "then", "later", "soon", "early",
  "late", "first", "last", "next", "previous", "begin", "start", "end",
  "red", "blue", "green", "yellow", "black", "white", "gray", "grey",
  "orange", "purple", "pink", "brown", "gold", "silver", "bronze",
]);

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;

function isForeign(word) {
  const w = word.toLowerCase();
  if (WHITELIST.has(w)) return false;
  if (MANUAL_FOREIGN.has(w)) return true;
  if (ALL_CAPS_RE.test(word)) return true; // START, OK, TV
  if (STARTS_WITH_WEIRD.test(w)) return true; // x/y/z di awal
  return false;
}

// ---- Scan seed lokal ----
const seedHits = [];
for (const f of readdirSync(vocabDir).filter((f) => /^tier\d.*\.ts$/.test(f))) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    if (isForeign(m[1])) seedHits.push({ file: f, word: m[1], c1: m[2].slice(0, 50) });
  }
}
console.log("=== SEED LOKAL ===");
console.log(`Kata asing terdeteksi: ${seedHits.length}`);
seedHits.forEach((h) => console.log(`  [${h.file}] "${h.word}" — ${h.c1}`));

// ---- Scan DB Supabase ----
const DB_ONLY = process.argv.includes("--db-only");
if (!DB_ONLY) {
  const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";
  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token && existsSync(".env.local")) {
    const env = readFileSync(".env.local", "utf8");
    const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
    if (m) token = m[1].trim().replace(/^["']|["']$/g, "");
  }
  if (token) {
    // Cari tabel yang mungkin memuat kosakata
    const tablesQuery = `select table_name from information_schema.tables where table_schema='public' and (table_name ilike '%vocab%' or table_name ilike '%word%' or table_name ilike '%ai%') order by 1;`;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: tablesQuery }),
    });
    const tables = await res.json();
    console.log("\n=== TABEL DB (vocab/word/ai) ===");
    console.log(JSON.stringify(tables));

    // Scan tiap tabel yang punya kolom word/word_text
    for (const t of tables ?? []) {
      const name = t.table_name;
      if (!name) continue;
      const q = `select word from ${name} where word is not null;`;
      const r2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const rows = await r2.json();
      if (!Array.isArray(rows)) continue;
      const hits = rows.filter((r) => r.word && isForeign(r.word)).map((r) => r.word);
      if (hits.length) {
        console.log(`\n[${name}] kata asing: ${hits.length}`);
        console.log("  " + hits.join(", "));
      }
    }
  } else {
    console.log("\nSKIP DB: SUPABASE_ACCESS_TOKEN tidak tersedia");
  }
}
