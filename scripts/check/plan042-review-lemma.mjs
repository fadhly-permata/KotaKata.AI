// ============================================================
// PLAN-042 — Review soal tier 2–10: cek lemma KBBI & keanehan.
//
// Tiap kata jawaban tier 2–10 dicek ke dump KBBI (/tmp/kbbi.json):
//   - TIDAK ADA di KBBI sama sekali (kemungkinan kata absurd/asing/
//     non-baku/bukan lemma) → flag merah, wajib ditinjau manual.
//   - ADA di KBBI tapi hanya sebagai entri TURUNAN (ber-/me-/ter-/
//     di-/ke-/-an/-kan/-i/-nya/-lah/-kah/-pun) → flag kuning (bentuk
//     turunan, bukan lemma dasar yang enak ditebak TTS).
//   - Lemma dasar normal → aman.
//
// Catatan format dump KBBI: kolom `arti` memakai entity HTML ter-escape
// (&lt;b&gt; dst) dan bentuk turunan muncul sebagai sub-entri <b>…</b>
// di dalam arti lemma dasarnya (mis. "ber·ju·ang" di dalam entri "juang").
//
// Plus scan konteks clue: clue yang memuat kata jawaban (bocor),
// clue sangat pendek, clue yang terlihat template (placeholder),
// dan duplikat kata lintas tier (jawaban sama di >1 tier).
//
// Usage: node scripts/check/plan042-review-lemma.mjs [--json]
// ============================================================
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");
const AS_JSON = process.argv.includes("--json");

const WORD_RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;

// ── Muat dump KBBI ───────────────────────────────────────────
const kbbi = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = kbbi.dictionary ?? kbbi;

const unescapeHtml = (s) =>
  String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

// Normalisasi: huruf kecil, buang titik tengah KBBI (·) & spasi.
const norm = (s) => String(s).toLowerCase().replace(/[·\s]/g, "");

const kbbiLemmas = new Set();
const kbbiDerived = new Set();
for (const e of entries) {
  const w = norm(e.word ?? "");
  if (!w) continue;
  kbbiLemmas.add(w);
  const arti = unescapeHtml(e.arti ?? "");
  // Bentuk turunan muncul sebagai sub-entri <b>…</b> di dalam arti.
  for (const m of arti.matchAll(/<b>([^<]+)<\/b>/g)) {
    const t = norm(m[1]);
    if (t && t.length > 1) kbbiDerived.add(t);
  }
}

// ── Muat vocabulary ──────────────────────────────────────────
const tierFiles = readdirSync(vocabDir)
  .filter((f) => /^tier\d.*\.ts$/.test(f))
  .sort((a, b) => {
    const k = (f) => Number(f.match(/^tier(\d+)/)[1]);
    return k(a) - k(b);
  });

const entries2 = [];
for (const f of tierFiles) {
  const src = readFileSync(join(vocabDir, f), "utf8");
  let m;
  while ((m = WORD_RE.exec(src))) {
    entries2.push({ file: f, tier: Number(f.match(/^tier(\d+)/)[1]), word: m[1], c1: m[2], c2: m[3], c3: m[4] });
  }
}

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");

// ── 1. Kategori KBBI ─────────────────────────────────────────
const notInKbbi = [];
const derivedOnly = [];
for (const e of entries2) {
  if (e.tier < 2) continue;
  const w = norm(e.word);
  if (kbbiLemmas.has(w)) continue;
  if (kbbiDerived.has(w)) derivedOnly.push(e);
  else notInKbbi.push(e);
}

// ── 2. Kata yang muncul di >1 tier (duplikat lintas tier) ────
const byWord = new Map();
for (const e of entries2) {
  const w = e.word.toLowerCase();
  if (!byWord.has(w)) byWord.set(w, []);
  byWord.get(w).push(e.tier);
}
const dupAcrossTiers = [...byWord.entries()]
  .filter(([, tiers]) => new Set(tiers).size > 1)
  .map(([w, tiers]) => ({ word: w, tiers: [...new Set(tiers)].sort() }));

// ── 3. Clue bermasalah (bocor / placeholder) ─────────────────
const clueIssues = [];
for (const e of entries2) {
  if (e.tier < 2) continue;
  const w = e.word.toLowerCase();
  for (const [name, c] of [["c1", e.c1], ["c2", e.c2], ["c3", e.c3]]) {
    if (!c) continue;
    if (wordRe(w).test(c)) clueIssues.push({ ...e, why: `${name} bocor jawaban`, clue: c });
    if (/^merupakan kata/i.test(c)) clueIssues.push({ ...e, why: `${name} placeholder`, clue: c });
  }
}

// ── 4. Kata jawaban yang aneh secara morfologis ──────────────
const suspiciousSuffix = [];
for (const e of entries2) {
  if (e.tier < 2) continue;
  const w = e.word.toLowerCase();
  // akhiran klitik/non-lemma yang hampir pasti bukan lemma dasar
  if (/(nya|kah|lah|pun|ku|mu)$/.test(w) && !["punya", "hanya", "tanya", "nyonya", "bertanya"].includes(w)) {
    suspiciousSuffix.push(e);
  }
}

// ── Output ───────────────────────────────────────────────────
if (AS_JSON) {
  console.log(JSON.stringify({ notInKbbi, derivedOnly, dupAcrossTiers, clueIssues, suspiciousSuffix }, null, 2));
  process.exit(0);
}

console.log(`TOTAL entri: ${entries2.length} (tier 1–10)`);
console.log(`\n=== TIDAK ADA DI KBBI (tier 2–10) — ${notInKbbi.length} ===`);
for (const e of notInKbbi) {
  console.log(`  t${e.tier} [${e.word}] c1: "${e.c1.slice(0, 80)}"`);
}
console.log(`\n=== HANYA BENTUK TURUNAN di KBBI (tier 2–10) — ${derivedOnly.length} ===`);
for (const e of derivedOnly) {
  console.log(`  t${e.tier} [${e.word}] c1: "${e.c1.slice(0, 80)}"`);
}
console.log(`\n=== DUPLIKAT LINTAS TIER — ${dupAcrossTiers.length} ===`);
for (const d of dupAcrossTiers) {
  console.log(`  ${d.word}: tier ${d.tiers.join(", ")}`);
}
console.log(`\n=== CLUE BERMASALAH — ${clueIssues.length} ===`);
for (const e of clueIssues) {
  console.log(`  t${e.tier} [${e.word}] ${e.why}: "${e.clue.slice(0, 80)}"`);
}
console.log(`\n=== AKHIRAN KLITIK (-nya/-kah/-lah/-pun/-ku/-mu) — ${suspiciousSuffix.length} ===`);
for (const e of suspiciousSuffix) {
  console.log(`  t${e.tier} [${e.word}] c1: "${e.c1.slice(0, 80)}"`);
}
