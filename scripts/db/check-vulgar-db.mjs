// Verifikasi DB: tidak ada kata vulgar/tidak layak tersisa di tabel
// vocabulary (PLAN-041). Daftar kata sama dengan scripts/vocab/vulgar-words.mjs
// (kelompok VULGAR + ANSWER_ONLY + kata yang sudah diganti).
// Usage: node scripts/db/check-vulgar-db.mjs
import { readFileSync, existsSync } from "node:fs";

const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && existsSync(".env.local")) {
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (m) token = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (env atau .env.local).");
  process.exit(2);
}

const words = [
  // Makian / hinaan
  "bajingan", "bangsat", "brengsek", "keparat", "kampret", "jancuk", "jancok",
  "sialan", "bacot", "mampus", "bejat", "jahanam", "ngentot", "ngewe",
  "goblok", "tolol", "bego", "dungu", "idiot", "sinting", "banci", "bencong",
  "homo", "lesbi", "lesbian", "gay", "kunyuk", "cungkring",
  // Alat kelamin / seksual
  "kontol", "memek", "meki", "pepek", "tempik", "jembut", "peler", "pelir",
  "zakar", "titit", "burit", "anus", "dubur", "vagina", "penis", "testis",
  "klitoris", "kelamin", "kemaluan", "ereksi", "mani", "senggama",
  "bersetubuh", "meniduri", "masturbasi", "onani", "cabul", "mesum",
  "pornografi", "porno", "bugil", "sundal", "lonte", "pelacur", "pelacuran",
  "jablay", "mucikari", "germo", "zina", "berzina", "fornikasi", "gerempang",
  "percabulan", "pencabulan", "selingkuh", "perselingkuhan",
  // Narkoba
  "ganja", "sabu", "shabu", "ekstasi", "kokain", "heroin", "morfin", "opium",
  "narkotik", "narkotika", "psikotropika", "mariyuana", "dadah", "apomorfin",
  // Kotoran / kasar
  "berak", "tahi", "kentut", "eek", "datatamak", "testikel",
];

const inList = words.map((w) => `'${w}'`).join(", ");
const q = `select word, tier_level from vocabulary where lower(word) in (${inList}) order by tier_level, word;`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: q }),
});
const text = await res.text();
console.log("HTTP", res.status);
console.log("Kata vulgar/tidak layak di DB (harus kosong):", text);
const rows = JSON.parse(text);
if (Array.isArray(rows) && rows.length > 0) process.exit(1);
process.exit(res.ok ? 0 : 1);
