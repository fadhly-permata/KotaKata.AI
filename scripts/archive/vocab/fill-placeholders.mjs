// ============================================================
// KotaKata AI — Hilangkan SEMUA placeholder "Merupakan kata X" (tier 6–10).
// Strategi per baris yang punya placeholder:
//   A. Potong trailer "; <sinonim>" dari c1 → jadikan c3 "Sinonim: X" /
//      "Antonim: X" (c1 jadi lebih pendek, bahan baru muncul).
//   B. Isi c3 dulu (prioritas: antonim → sinonim → contoh → sense →
//      fragmen), lalu c2 dengan sisa bahan.
//   C. Fallback parafrasa berbasis kelas kata KBBI (mis. nomina →
//      "hal yang berhubungan dengan <inti>") — TIDAK memakai pola
//      "Merupakan kata X" sama sekali (user menolak clue kelas-kata).
//   D. Jaring akhir: c1/c2/c3 pairwise berbeda, tidak saling memuat
//      (dua arah), tidak bocor jawaban.
// Usage: node scripts/vocab/fill-placeholders.mjs [--tier=10]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { CLUE_OVERRIDES } from "./clue-overrides.mjs";

const RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;
const MAX_LEN = 10;

const j = JSON.parse(readFileSync("/tmp/kbbi.json", "utf8"));
const entries = j.dictionary ?? j;

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
  d = d.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "");
  d = d.replace(/;\s*Berasal dari bahasa\s+[A-Za-z]+.*$/i, "");
  d = d.replace(/^Berasal dari bahasa [A-Za-z]+\s*/i, "");
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
    const defMatch = m[2].match(/^(.*?)(?=<i>|<b>|<br>|$)/s);
    const def = cleanDef(defMatch ? defMatch[1] : m[2]);
    if (!def || def.toLowerCase() === word) return null;
    if (/^lihat\b/i.test(def) || /^[?]/.test(def)) return null;
    const senses = arti.split(/<b>\d+<\/b>/).slice(1).map(p => cleanDef(p)).filter(Boolean);
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
  // Sense bernomor di TENGAH baris (format "def1; (2) def2; (3) def3") —
  // parser lama hanya menangkap baris yang DIAWALI nomor, sehingga banyak
  // kata kehilangan sense kedua/ketiga (mis. "terhukum").
  const numSenseRe = /;\s*\(\s*(\d+)\s*\)\s*/gi;
  let ms;
  while ((ms = numSenseRe.exec(def)) !== null) {
    const after = def.slice(ms.index + ms[0].length).split(/;\s*\(\s*\d+\s*\)\s*/i)[0];
    const d = cleanDef(after);
    if (d && d.length >= 6 && d.toLowerCase() !== word && !senses.includes(d)) senses.push(d);
  }
  const colIdx = meaning.indexOf(":");
  let example = null;
  if (colIdx > -1) {
    example = modernize(meaning.slice(colIdx + 1).replace(/\s+/g, " ").trim());
    example = example.replace(/;\s*\(\s*\d+\s*\).*$/i, "").replace(/;\s*\d+\s*\).*$/i, "").trim();
    if (example.length < 5) example = null;
  }
  return { word, def, senses, example, arti, klass };
}

const byWord = new Map();
for (const e of entries) {
  const r = parseEntry(e);
  if (r) {
    const cur = byWord.get(r.word);
    if (!cur) byWord.set(r.word, [r]);
    else if (cur.length < 8) cur.push(r);
  }
}

// ---------------- helpers ----------------
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const wb = (w) => new RegExp(`\\b${w}\\b`, "i");
const byWordAll = new Map();
for (const e of entries) {
  const w = (e.word ?? "").trim().toLowerCase();
  if (w && /^[a-z]+$/.test(w)) byWordAll.set(w, true);
}
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

const mutOverlap = (a, b) => {
  if (!a || !b) return false;
  if (a.startsWith("Contoh:") || b.startsWith("Contoh:")) return false;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la.length < 6 || lb.length < 4) return false;
  return la.includes(lb) || lb.includes(la);
};

const nearSame = (a, b) => {
  if (!a || !b) return false;
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x === y || (x.length >= 12 && y.length >= 12 && (x.startsWith(y) || y.startsWith(x)));
};

function redactExample(ex, word) {
  if (!ex) return null;
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let red = ex.replace(re, "…").replace(/\s+/g, " ").trim();
  red = red.replace(/--/g, "…").trim();
  if (red.length < 6) return null;
  return red;
}

/** Ambil trailer "; <kata/frasa>" dari definisi (sinonim implisit KBBI). */
function splitTrail(def) {
  if (!def) return { head: def, trail: null };
  const m = def.match(/;\s*([a-z·]{2,16}(?:\s+[a-z·]+)?)\s*$/i);
  if (!m) return { head: def, trail: null };
  const trail = m[1].replace(/·/g, "").trim();
  const head = def.slice(0, m.index).replace(/[;,:]+\s*$/, "").trim();
  if (!head || head.length < 6 || head.toLowerCase() === trail) return { head: def, trail: null };
  return { head, trail };
}

/** Kumpulkan bahan pengisi (tidak termasuk "Merupakan kata X"). */
function gatherBahan(word, c1, usedSet) {
  const cands = byWord.get(word) ?? [];
  const out = { antonim: [], sinonim: [], contoh: [], sense: [], fragmen: [], parafrasa: [] };
  const push = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };
  for (const c of cands) {
    const ant = extractAntonym(c.def, word);
    if (ant && !usedSet.has(ant.toLowerCase()) && !wb(word).test(ant)) push(out.antonim, `Antonim: ${ant}`);
    const syn = extractSynonym(c.def, word);
    if (syn && byWordAll.has(syn) && !usedSet.has(syn.toLowerCase()) && !wb(word).test(syn)) push(out.sinonim, `Sinonim: ${syn}`);
    for (const s of c.senses) {
      const ant2 = extractAntonym(s, word);
      if (ant2 && !usedSet.has(ant2.toLowerCase()) && !wb(word).test(ant2)) push(out.antonim, `Antonim: ${ant2}`);
      const syn2 = extractSynonym(s, word);
      if (syn2 && byWordAll.has(syn2) && !usedSet.has(syn2.toLowerCase()) && !wb(word).test(syn2)) push(out.sinonim, `Sinonim: ${syn2}`);
      const clean = s.replace(/\s+/g, " ").trim();
      if (clean.length >= 8 && !usedSet.has(clean.toLowerCase()) && !mutOverlap(clean, c1) && !nearSame(clean, c1) && !wb(word).test(clean)) push(out.sense, clean);
    }
    if (c.example) {
      const red = redactExample(c.example, word);
      if (red && red.length >= 8) push(out.contoh, `Contoh: ${red}`);
    }
    for (const part of String(c.def).split(/[;,(]|\s+dan\s+|\s+atau\s+/i)) {
      const t = part.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
      if (t.length >= 8 && !usedSet.has(t.toLowerCase()) && !mutOverlap(t, c1) && !nearSame(t, c1) && !wb(word).test(t)) push(out.fragmen, t);
    }
    // fragmen "def; kata" — bagian setelah ; (sering jadi c2 deskriptif)
    const semiParts = String(c.def).split(";");
    if (semiParts.length >= 2) {
      for (let i = 1; i < semiParts.length; i++) {
        const t = semiParts[i].replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
        if (t.length >= 8 && !usedSet.has(t.toLowerCase()) && !mutOverlap(t, c1) && !nearSame(t, c1) && !wb(word).test(t)) push(out.fragmen, t);
      }
    }
  }
  // parafrasa kelas kata dari inti definisi (bukan "Merupakan kata X")
  const cand0 = cands?.[0];
  if (cand0?.klass && cand0.def) {
    const core = cand0.def.split(";")[0].replace(/^[a-z·]+\s+/i, "").replace(/\s+/g, " ").trim();
    if (core.length >= 4 && !usedSet.has(core.toLowerCase())) {
      const k = cand0.klass;
      const variants = [];
      if (k === "nomina" || k === "n") variants.push(`hal yang berkaitan dengan ${core}`, `perihal ${core}`);
      else if (k === "verba" || k === "v") variants.push(`melakukan ${core.replace(/^(me|ber)\w*$/i, (mm) => mm)}`, `berkaitan dengan kegiatan ${core}`);
      else if (k === "adjektiva" || k === "a") variants.push(`bersifat ${core}`, `keadaan yang ${core}`);
      else if (k === "adverbia" || k === "adv") variants.push(`berkaitan dengan ${core}`);
      for (const v of variants) {
        if (v.length >= 8 && !usedSet.has(v.toLowerCase()) && !mutOverlap(v, c1) && !nearSame(v, c1) && !wb(word).test(v)) push(out.parafrasa, v);
      }
    }
  }
  return out;
}

/** Validasi kandidat terhadap semua kolom terpakai. */
function okCand(v, c1, used) {
  if (!v || !v.trim() || v.trim().length < 4) return false;
  if (/^merupakan kata/i.test(v)) return false;
  if (/--/.test(v)) return false;
  if (used.has(v.toLowerCase())) return false;
  if (mutOverlap(v, c1) || nearSame(v, c1) || same(v, c1)) return false;
  if (c1.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(c1.toLowerCase())) return false;
  return true;
}

/** Cek substring: satu kolom memuat kolom lain (aturan checker). */
function containsOverlap(a, b) {
  if (!a || !b) return false;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return true;
  if (la.length >= 12 && (la.includes(lb) || lb.includes(la))) return true;
  return false;
}

/** BOCOR: clue mengandung jawaban sebagai kata utuh. */
function leaksAnswer(clue, word) {
  if (!clue) return false;
  const re = new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
  return re.test(clue);
}

/** Perbaiki BOCOR & c2 memuat c3 via bahan KBBI (tanpa ubah yang sudah bagus). */
function repairQuality(word, c1, c2, c3) {
  let n1 = c1, n2 = c2, n3 = c3;
  let changed = false;
  // 1) BOCOR jawaban — ganti kolom yang bocor.
  const colNames = ["c1", "c2", "c3"];
  for (let i = 0; i < 3; i++) {
    const cur = [n1, n2, n3][i];
    if (cur && leaksAnswer(cur, word)) {
      const used = new Set([n1, n2, n3].filter(Boolean).map(x => x.toLowerCase()));
      used.delete(cur.toLowerCase());
      const bahan = gatherBahan(word, n1, used);
      const pick = [bahan.antonim, bahan.sinonim, bahan.contoh, bahan.sense, bahan.fragmen, bahan.parafrasa]
        .flat().find((v) => okCand(v, n1, used) && !leaksAnswer(v, word));
      if (pick) {
        if (i === 0) n1 = pick; else if (i === 1) n2 = pick; else n3 = pick;
        changed = true;
      }
    }
  }
  // 2) c2 memuat c3 / c3 memuat c2 / c1 memuat c2 — ganti kolom belakang yang memuat.
  const pairs = [[0, 1], [0, 2], [1, 2]];
  for (const [i, j] of pairs) {
    const cur = [n1, n2, n3];
    const a = cur[i], b = cur[j];
    if (!a || !b) continue;
    if (containsOverlap(a, b)) {
      // ganti kolom j (belakang) — coba bahan; kalau tidak ada, ganti kolom i
      const used = new Set(cur.filter(Boolean).map(x => x.toLowerCase()));
      used.delete(b.toLowerCase());
      const bahan = gatherBahan(word, n1, used);
      const pickJ = [bahan.antonim, bahan.sinonim, bahan.contoh, bahan.sense, bahan.fragmen, bahan.parafrasa]
        .flat().find((v) => okCand(v, n1, used) && !leaksAnswer(v, word) && !containsOverlap(v, cur[i]));
      if (pickJ) {
        if (j === 1) n2 = pickJ; else if (j === 2) n3 = pickJ;
        changed = true;
        continue;
      }
      // coba ganti kolom i (depan) — hanya bila i > 0 (jangan sentuh c1 yang baik)
      if (i > 0) {
        const used2 = new Set([n1, n2, n3].filter(Boolean).map(x => x.toLowerCase()));
        used2.delete(a.toLowerCase());
        const bahan2 = gatherBahan(word, n1, used2);
        const pickI = [bahan2.antonim, bahan2.sinonim, bahan2.contoh, bahan2.sense, bahan2.fragmen, bahan2.parafrasa]
          .flat().find((v) => okCand(v, n1, used2) && !leaksAnswer(v, word) && !containsOverlap(v, cur[j]));
        if (pickI) {
          if (i === 1) n2 = pickI; else if (i === 2) n3 = pickI;
          changed = true;
        }
      }
    }
  }
  if (!changed) return null;
  const finalCols = [n1, n2, n3];
  // jaring: jangan kembalikan kalau masih bocor / placeholder / kosong
  if (finalCols.some(c => !c || !c.trim() || /^merupakan kata/i.test(c) || leaksAnswer(c, word))) return null;
  return [n1, n2, n3];
}

// ---------------- proses ----------------
const tierArg = process.argv.find((a) => /^--tier=\d+$/.test(a));
const ONLY_TIER = tierArg ? Number(tierArg.split("=")[1]) : null;
const stats = { total: 0, placeholderAwal: 0, placeholderSisa: 0, tersisaList: [] };
const isPh = (t) => /^merupakan kata/i.test(t);

for (let tier = 10; tier >= 6; tier--) {
  if (ONLY_TIER && tier !== ONLY_TIER) continue;
  const path = `src/data/vocabulary/tier${tier}.ts`;
  const src = readFileSync(path, "utf8");
  const rows = [...src.matchAll(RE)].map(m => [m[1], m[2], m[3], m[4]]);
  const fixed = rows.map(([word, c1, c2, c3]) => {
    stats.total++;
    // 0. Override kurasi manual — dipakai penuh bila ada.
    const ov = CLUE_OVERRIDES[word];
    if (ov && ov.length === 3) {
      stats.diisiOverride = (stats.diisiOverride ?? 0) + 1;
      return [word, ov[0], ov[1], ov[2]];
    }
    // 0b. Perbaiki kualitas (BOCOR / c2 memuat c3) — untuk SEMUA row.
    const repaired = repairQuality(word, c1, c2, c3);
    if (repaired) {
      stats.diisiRepair = (stats.diisiRepair ?? 0) + 1;
      [c1, c2, c3] = repaired;
    }
    if (!isPh(c2) && !isPh(c3)) return [word, c1, c2, c3];
    stats.placeholderAwal += (isPh(c2) ? 1 : 0) + (isPh(c3) ? 1 : 0);
    let n1 = c1, n2 = c2, n3 = c3;

    // A. Potong trailer "; <sinonim>" dari c1 (jika c1 tidak placeholder).
    if (!isPh(n1)) {
      const { head, trail } = splitTrail(n1);
      if (trail && trail !== word && !wb(word).test(trail)) {
        const cands = byWord.get(word);
        const klass = cands?.[0]?.klass ?? null;
        // trail jadi sinonim/antonim untuk c3 bila c3 placeholder
        if (isPh(n3) && !trail.toLowerCase().includes(word)) {
          n3 = `Sinonim: ${trail}`;
        } else if (isPh(n2) && !trail.toLowerCase().includes(word)) {
          n2 = `Sinonim: ${trail}`;
        }
        if (head.length >= 8 && !wb(word).test(head)) n1 = head;
        stats.diisiTrail = (stats.diisiTrail ?? 0) + 1;
      }
    }

    // B. Isi placeholder c3 dulu, lalu c2, dari bahan.
    const usedInit = [n1, n2, n3].filter(Boolean).map(x => x.toLowerCase());
    const usedSet = new Set(usedInit);
    const bahan = gatherBahan(word, n1, usedSet);
    const pick = (usedNow) => {
      for (const list of [bahan.antonim, bahan.sinonim, bahan.contoh, bahan.sense, bahan.fragmen, bahan.parafrasa]) {
        const hit = list.find((v) => okCand(v, n1, usedNow));
        if (hit) return hit;
      }
      return null;
    };
    if (isPh(n3)) {
      const u = new Set([n1.toLowerCase(), n2.toLowerCase()]);
      const v = pick(u);
      if (v) { n3 = v; stats.diisi = (stats.diisi ?? 0) + 1; }
    }
    if (isPh(n2)) {
      const u = new Set([n1.toLowerCase(), n3.toLowerCase()]);
      const v = pick(u);
      if (v) { n2 = v; stats.diisi = (stats.diisi ?? 0) + 1; }
    }
    // B2. c3 placeholder masih → swap dengan c2 bila c2 sudah terisi & c3 tidak
    if (isPh(n3) && !isPh(n2)) { const t = n2; n2 = n3; n3 = t; }
    // B3. c2/c3 masih placeholder → isi dari c2/c3 ASLI yang valid (bukan ph)
    if (isPh(n3) && c3 && !isPh(c3) && okCand(c3, n1, new Set([n1.toLowerCase(), n2.toLowerCase()]))) { n3 = c3; }
    if (isPh(n2) && c2 && !isPh(c2) && okCand(c2, n1, new Set([n1.toLowerCase(), n3.toLowerCase()]))) { n2 = c2; }
    // B4. c2 placeholder & c3 placeholder → salah satu pakai kata asli valid
    if (isPh(n2) && isPh(n3)) {
      const cands = byWord.get(word);
      const klass = cands?.[0]?.klass ?? null;
      // parafrasa kelas kata (tanpa "Merupakan")
      if (klass && CLASS_NAME[klass]) {
        const core = cands?.[0]?.def?.split(";")[0] ?? "";
        const k = klass;
        const variants = [
          k === "nomina" || k === "n" ? `hal yang berkaitan dengan ${core}` : null,
          k === "verba" || k === "v" ? `kegiatan ${core}` : null,
          k === "adjektiva" || k === "a" ? `bersifat ${core}` : null,
        ].filter(Boolean);
        const v = variants.find((x) => okCand(x, n1, new Set([n1.toLowerCase()])));
        if (v) { n3 = v; stats.diisi = (stats.diisi ?? 0) + 1; }
      }
    }
    // Jaring akhir
    const finalUsed = new Set([n1.toLowerCase(), n2.toLowerCase(), n3.toLowerCase()]);
    if (same(n2, n3) || mutOverlap(n2, n3)) {
      const cands = byWord.get(word);
      const klass = cands?.[0]?.klass ?? null;
      const core = cands?.[0]?.def?.split(";")[0] ?? "";
      const k = klass;
      const alt = [k === "nomina" || k === "n" ? `hal yang berkaitan dengan ${core}` : null,
        k === "verba" || k === "v" ? `kegiatan ${core}` : null,
        k === "adjektiva" || k === "a" ? `bersifat ${core}` : null].find((x) => x && okCand(x, n1, finalUsed));
      if (alt) { n3 = alt; stats.diisi = (stats.diisi ?? 0) + 1; }
    }
    if (isPh(n2) || isPh(n3)) {
      stats.placeholderSisa += (isPh(n2) ? 1 : 0) + (isPh(n3) ? 1 : 0);
      stats.tersisaList.push(`${word}: c2="${n2}" c3="${n3}"`);
    }
    return [word, n1, n2, n3];
  });
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const rowsOut = fixed.map(([word, c1, c2, c3]) =>
    `  ["${word}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`,
  ).join("\n");
  const out = `// Tier ${tier} — 1000 kata asli KBBI (Kamus Besar Bahasa Indonesia), urut berdasarkan frekuensi.\n// Format: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].\nexport const TIER_${tier}_WORDS: [string, string, string, string][] = [\n${rowsOut}\n];\n`;
  writeFileSync(path, out);
  const phBefore = rows.filter(([, , c2, c3]) => isPh(c2) || isPh(c3)).length;
  console.log(`tier${tier}: ${fixed.length} kata ditulis (baris placeholder sebelum: ${phBefore})`);
}

console.log("\n=== STATISTIK ===\n", JSON.stringify(stats, null, 2));
console.log("\n=== TERSISA (max 40) ===");
stats.tersisaList.slice(0, 40).forEach(s => console.log("  " + s.slice(0, 120)));
