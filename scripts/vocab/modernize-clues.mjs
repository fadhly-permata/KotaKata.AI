// ============================================================
// KotaKata AI — Modernisasi Singkatan Kuno di Semua Clue Tier
// (PLAN-011)
//
// Menghilangkan singkatan kuno (pd/dl/krn/thd/msl/dgn/yg/dr/dll/dsb/
// kpd/tsb/spt/sdh/utk/dng/tt/sbg) dari clue 1/2/3 dengan penggantian
// kata baku, sambil menjaga QA 0 issue / 0 bocor / 0 duplikat.
//
// Pendekatan:
//   (a) penggantian mekanik aman dengan word-boundary (pd→pada,
//       dl→dalam, krn→karena, thd→terhadap, msl→misalnya, dst.);
//   (b) bila penggantian menciptakan konflik QA BARU (kolom menjadi
//       duplikat/substring — banyak data lama yang hanya lolos karena
//       beda ejaan "pd" vs "pada"), script mencoba AUTO-RESOLVE:
//       ganti kolom bermasalah dengan bahan alternatif dari riset —
//       nilai parsed cache PLAN-007 (def/senses/example/definitions
//       yang SUDAH bersih & dimodernisasi), turunan Sinonim/Antonim/
//       fragmen dari def cache, lalu arti mentah dump KBBI sebagai
//       fallback — selalu divalidasi terhadap kolom lain;
//   (c) kata yang TIDAK bisa di-resolve otomatis dikembalikan ke
//       nilai lama dan dicatat sebagai "unresolved" → perlu override
//       manual di clue-overrides.mjs (langkah 2c PLAN-011).
//
// Usage:
//   node scripts/vocab/modernize-clues.mjs           # dry-run: report + conflict
//   node scripts/vocab/modernize-clues.mjs --audit   # audit-only (target & contoh)
//   node scripts/vocab/modernize-clues.mjs --apply   # tulis balik ke tier files
//   node scripts/vocab/modernize-clues.mjs --apply --sql   # + regenerate vocabulary.sql
//   node scripts/vocab/modernize-clues.mjs --out=report.json
//   node scripts/vocab/modernize-clues.mjs --cache=/tmp/kotakata-research-cache
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MODERNIZE_OVERRIDES } from "./modernize-overrides.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const VOCAB_DIR = join(ROOT, "src", "data", "vocabulary");
const OVERRIDES_FILE = join(ROOT, "scripts", "vocab", "clue-overrides.mjs");

const flag = (name) => process.argv.includes(`--${name}`);
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
};
const AUDIT = flag("audit");
const APPLY = flag("apply");
const WITH_SQL = flag("sql");
const OUT_PATH = arg("out", join(ROOT, "scripts", "vocab", "modernize-report.json"));
const CACHE_DIR = arg("cache", "/tmp/kotakata-research-cache");

// ---------------------------------------------------------------- mapping
// Semua pakai word-boundary (\b) — token panjang (dll/dsb/dgn/dng)
// tidak bisa terpotong oleh token pendek (dl).
const ABBREV_RE = /\b(pd|dl|krn|dgn|dng|yg|sbg|dr|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk|dp)\b/gi;

/** Penggantian kata baku. "dr" hanya diganti bila bukan "dr." (gelar dokter). */
const ABBREV_MAP = {
  pd: "pada",
  dl: "dalam",
  krn: "karena",
  dgn: "dengan",
  dng: "dengan",
  yg: "yang",
  sbg: "sebagai",
  tt: "tentang",
  kpd: "kepada",
  tsb: "tersebut",
  spt: "seperti",
  ud: "sudah",
  msl: "misalnya",
  sdh: "sudah",
  thd: "terhadap",
  utk: "untuk",
  dp: "daripada",
  dll: "dan lain-lain",
  dsb: "dan sebagainya",
};

function replaceAbbrev(s) {
  if (!s) return s;
  let out = s;
  for (const [abbr, full] of Object.entries(ABBREV_MAP)) {
    out = out.replace(new RegExp(`\\b${abbr}\\b`, "gi"), full);
  }
  // "dr." (gelar dokter) dipertahankan; "dr" lain menjadi "dari".
  out = out.replace(/\bdr\b(?!\.)/gi, "dari");
  return out.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/,+/g, ",").trim();
}

// ---------------------------------------------------------------- QA gates (mirror check-clue-quality.mjs)
const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");

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

function qaDup(a, b) {
  if (!a || !b) return false;
  const A = a.trim();
  const B = b.trim();
  if (A === B) return true;
  if (A.length >= 12 && B.length >= 12 && (A.includes(B) || B.includes(A))) return true;
  return false;
}

/** Mengembalikan null bila set VALID, string alasan bila ada masalah. */
function checkSet(word, c1, c2, c3) {
  const cols = [c1, c2, c3];
  if (cols.some((c) => !c || !c.trim())) return "kolom kosong";
  for (let i = 0; i < 3; i++) {
    if (cols[i].trim().length < 4) return "kolom terlalu pendek";
    if (wordRe(word).test(cols[i])) return "bocor jawaban";
    if (hasUnbalancedParen(cols[i])) return "kurung tidak seimbang";
  }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      if (i === j) continue;
      if (qaDup(cols[i], cols[j])) return `c${i + 1} duplikat c${j + 1}`;
    }
  return null;
}

// ---------------------------------------------------------------- research sources (cache riset PLAN-007)
const researchCache = new Map();
function loadResearchCache() {
  if (researchCache.size || !existsSync(CACHE_DIR)) return researchCache;
  let n = 0;
  for (const f of readdirSync(CACHE_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const j = JSON.parse(readFileSync(join(CACHE_DIR, f), "utf8"));
      researchCache.set(j.word ?? f.replace(/\.json$/, ""), j);
      n++;
    } catch {
      /* skip korup */
    }
  }
  console.log(`[info] cache riset dimuat: ${n} kata`);
  return researchCache;
}

/** Redact kata jawaban / placeholder KBBI "~" dalam contoh pemakaian. */
function redact(word, t) {
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return String(t).replace(re, "…").replace(/~/g, "…").replace(/\s{2,}/g, " ").trim();
}

/** Kandidat pengganti kolom konflik — HANYA nilai parsed cache riset
 *  PLAN-007 (def/senses/example/definitions yang sudah bersih & teruji)
 *  plus Sinonim/Antonim yang tervalidasi dari def. Fragmen definisi dan
 *  parse ulang dump KBBI TIDAK dipakai: untuk kata single-definition hasilnya
 *  justru fragmen jelek — kata seperti itu ditangani override kurasi manual. */
function candidatesFor(word) {
  const cache = researchCache.get(word);
  const out = [];
  const push = (t) => {
    const c = replaceAbbrev(String(t ?? "").replace(/\s+/g, " ").trim());
    if (c && c.length >= 4 && !out.includes(c)) out.push(c);
  };

  // Nilai parsed cache (sudah bersih + modernize oleh pipeline riset).
  for (const s of cache?.kbbi?.senses ?? []) push(s);
  if (cache?.kbbi?.example) push(`Contoh: ${redact(word, cache.kbbi.example)}`);
  for (const d of cache?.definitions ?? []) push(d);
  if (cache?.kbbi?.def) push(cache.kbbi.def);

  // Sinonim / Antonim yang TERVALIDASI dari def cache.
  const def = cache?.kbbi?.def ?? "";
  if (def) {
    const syn = def.match(/(?:sama dengan|=\s*|sinonim(?:nya)?\s*[:=]?)\s*([a-z·]+(?:\s+[a-z·]+){0,2})/i);
    if (syn && syn[1].replace(/·/g, "").length >= 2) push(`Sinonim: ${syn[1].trim()}`);
    const ant = def.match(/(?:lawan kata|lawan(?:nya)?|antonim(?:nya)?|kebalikan(?: dari)?)\s*[:=]?\s*([a-z·]+(?:\s+[a-z·]+){0,2})/i);
    if (ant && ant[1].replace(/·/g, "").length >= 2) push(`Antonim: ${ant[1].trim()}`);
  }
  return out;
}

/** Kolom kandidat valid bila lolos semua gate & tidak duplikat dgn kolom lain.
 *  Definisi polos wajib >= 12 huruf (fragmen pendek/1 kata ditolak — kualitas
 *  clue jelek); "Sinonim/Antonim/Contoh" tetap boleh lebih pendek. */
function validCandidate(cand, word, idx, others) {
  const t = (cand ?? "").trim();
  if (t.length < 4) return false;
  const isFormat = /^(Sinonim|Antonim|Contoh):\s/.test(t);
  if (!isFormat && t.length < 12) return false;
  if (ABBREV_RE.test(t)) return false; // tujuan plan: 0 singkatan tersisa
  if (/[<>&]/.test(t)) return false; // sisa entity HTML = junk
  // Pelafalan fonetik (é/è) atau teks asing → tolak; „…“/„—/–“ (redaksi & rentang) diizinkan.
  if (/[^\u0020-\u007E…—–‘’“"]/.test(t)) return false;
  if (/(?:·|\.{2,})/.test(t)) return false; // pelafalan "se·ka·li·gus" / "te.ro.wong.an"
  if (/^[a-z·.]+\s+(?:n|v|a|adv|num|pron|konj|prep|interj|part|p)\b/i.test(t)) return false; // pelafalan + kelas
  if (/^(Nomina|Verba|Adjektiva|Adverbia|Numeralia|Pronomina|Partikel|Interjeksi|Konjungsi|Preposisi)\b/i.test(t)) return false;
  if (/^\//.test(t)) return false; // sisa pelafalan KBBI "/…/"
  if (/^(n|v|a|adv|num|pron|konj|prep|interj|part|p)(\s|$)/.test(t)) return false; // kelas kata telanjang
  if (wordRe(word).test(t)) return false;
  if (hasUnbalancedParen(t)) return false;
  if (/^merupakan kata/i.test(t)) return false;
  if (/--/.test(t)) return false;
  if (/\b\d{2,}/.test(t) && !/^Contoh: /.test(t)) return false; // fragmen teknis (rumus, angka)
  if (idx === 0 && /^(sinonim|antonim)\s*[:—–-]/i.test(t)) return false;
  if (idx > 0 && /^contoh\b/i.test(t) && !/^Contoh: /.test(t)) return false;
  if (others.some((o) => o && qaDup(t, o))) return false;
  return true;
}

/** Coba selesaikan konflik dengan mengganti kolom yang bermasalah.
 *  Berhenti segera setelah seluruh set valid (meminimalkan kolom yg diganti). */
function resolveConflicts(word, cols) {
  const recomputeBad = (arr) => {
    const b = new Set();
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        if (qaDup(arr[i], arr[j])) {
          b.add(i);
          b.add(j);
        }
      }
    return b;
  };

  const out = [...cols];
  let bad = recomputeBad(out);
  if (!bad.size) return out;

  // Prioritaskan perbaiki c2/c3 dulu; c1 hanya bila terpaksa. Untuk tiap
  // kolom konflik cari kandidat valid; kolom PERTAMA yang punya kandidat
  // langsung dipakai (kandidat tidak boleh "terbuang" di kolom yang salah).
  const order = [1, 2, 0];
  let guard = 0;
  while (bad.size && guard++ < 6) {
    let fixed = false;
    for (const i of order) {
      if (!bad.has(i)) continue;
      const others = out.map((c, k) => (k === i ? null : c));
      for (const cand of candidatesFor(word)) {
        if (!validCandidate(cand, word, i, others)) continue;
        out[i] = cand;
        fixed = true;
        break;
      }
      if (fixed) break;
    }
    if (!fixed) break;
    bad = recomputeBad(out);
  }
  return out;
}

// ---------------------------------------------------------------- row parsing (verbatim, spt fill-remaining)
const ROW_RE = /^  \[\"([^\"]+)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\",\s*\"((?:[^\"\\]|\\.)*)\"\],$/gm;

const tierFiles = readdirSync(VOCAB_DIR)
  .filter((f) => /^tier(\d+)(?:[ab]|-part\d+)?\.ts$/.test(f))
  .sort((a, b) => {
    const key = (f) => {
      const m = f.match(/^tier(\d+)(?:([ab])|-part(\d+))?\.ts$/);
      const tier = Number(m[1]);
      const kind = m[2] ? 1 : m[3] ? 2 : 0;
      const num = m[2] ? (m[2] === "a" ? 1 : 2) : m[3] ? Number(m[3]) : 0;
      return [tier, kind, num];
    };
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });

const rowsByFile = new Map();
for (const f of tierFiles) {
  const src = readFileSync(join(VOCAB_DIR, f), "utf8");
  const rows = [...src.matchAll(ROW_RE)].map((m) => ({
    word: m[1],
    c1: m[2],
    c2: m[3],
    c3: m[4],
    lineIdx: src.slice(0, m.index).split("\n").length - 1,
  }));
  rowsByFile.set(f, { src, rows });
}

// ---------------------------------------------------------------- main
const report = {
  plan: "PLAN-011",
  runAt: new Date().toISOString(),
  mode: AUDIT ? "audit" : APPLY ? "apply" : "dry-run",
  total: 0,
  perAbbrev: {},
  perColumn: { c1: 0, c2: 0, c3: 0 },
  perTier: {},
  changed: 0,
  unchanged: 0,
  resolved: 0,
  unresolved: [],
  rows: [],
};

// Muat sumber riset SEBELUM memproses row — tanpa ini researchCache kosong
// dan auto-resolve tidak pernah menemukan kandidat (semua jadi unresolved).
loadResearchCache();

let totalApply = 0;
for (const [f, { rows }] of rowsByFile) {
  const tier = Number(f.match(/^tier(\d+)/)[1]);
  const edits = [];
  for (const r of rows) {
    const cols = [r.c1, r.c2, r.c3];
    const names = ["c1", "c2", "c3"];
    const hits = cols.map((c) => (c ? [...c.matchAll(ABBREV_RE)].map((m) => m[1].toLowerCase()) : []));
    if (hits.every((h) => h.length === 0)) continue;

    report.total++;
    report.perTier[`t${tier}`] = (report.perTier[`t${tier}`] ?? 0) + 1;
    hits.forEach((h, i) => {
      if (!h.length) return;
      report.perColumn[names[i]]++;
      for (const a of h) report.perAbbrev[a] = (report.perAbbrev[a] ?? 0) + 1;
    });

    const newCols = cols.map(replaceAbbrev);
    const changed = newCols.some((c, i) => c !== cols[i]);

    if (AUDIT) {
      report.rows.push({ tier, file: f, word: r.word, old: cols, abbrevs: hits, new: newCols, changed });
      continue;
    }

    // Coba set modernisasi langsung; bila bentrok QA → auto-resolve; bila masih
    // bentrok → override kurasi manual (modernize-overrides.mjs).
    // CATATAN: checkSet null = VALID (falsy), string = invalid (truthy).
    let finalCols = newCols;
    let resolvedVia = null;
    if (changed && !checkSet(r.word, ...newCols)) {
      // valid tanpa konflik
    } else if (changed) {
      const attempt = resolveConflicts(r.word, newCols);
      if (!checkSet(r.word, ...attempt)) {
        finalCols = attempt;
        resolvedVia = attempt.some((c, i) => c !== newCols[i]) ? "resolve" : "noop";
      } else {
        // Kurasi manual: ganti kolom yang disebut (c2/c3), sisanya dari newCols.
        const ov = MODERNIZE_OVERRIDES[r.word];
        if (ov) {
          const cand = [
            newCols[0],
            ov.c2 ? replaceAbbrev(ov.c2) : newCols[1],
            ov.c3 ? replaceAbbrev(ov.c3) : newCols[2],
          ];
          if (!checkSet(r.word, ...cand)) {
            finalCols = cand;
            resolvedVia = "override";
          }
        }
        if (!resolvedVia) {
          // Tidak bisa di-resolve → kembali ke nilai lama (abbrev tetap), butuh override.
          report.unresolved.push({ tier, file: f, word: r.word, old: cols, new: newCols, attempt });
          report.rows.push({ tier, file: f, word: r.word, old: cols, new: newCols, changed, unresolved: true });
          continue;
        }
      }
    }

    report.rows.push({ tier, file: f, word: r.word, old: cols, new: finalCols, changed, resolvedVia });
    if (finalCols.some((c, i) => c !== cols[i])) {
      report.changed++;
      if (resolvedVia === "resolve") report.resolved++;
      if (APPLY) edits.push({ lineIdx: r.lineIdx, word: r.word, cols: finalCols });
    } else {
      report.unchanged++;
    }
  }

  if (APPLY && edits.length) {
    const path = join(VOCAB_DIR, f);
    const lines = readFileSync(path, "utf8").split("\n");
    for (const e of edits) {
      const [c1, c2, c3] = e.cols;
      lines[e.lineIdx] = `  ["${e.word}", "${c1}", "${c2}", "${c3}"],`;
    }
    writeFileSync(path, lines.join("\n"));
    totalApply += edits.length;
    console.log(`  ✓ ${f}: ${edits.length} baris diperbarui`);
  }
}

// ---- tulis override kurasi (set lengkap) ke clue-overrides.mjs bila --apply
const overrideEntries = [];
if (APPLY) {
  for (const row of report.rows) {
    if (row.resolvedVia !== "override") continue;
    overrideEntries.push({ word: row.word, cols: row.new });
  }
  if (overrideEntries.length) {
    const src = readFileSync(OVERRIDES_FILE, "utf8");
    const newBlock = overrideEntries
      .map(({ word, cols }) => `  "${word}": ["${cols[0]}", "${cols[1]}", "${cols[2]}"],`)
      .join("\n");
    const next = src.replace(/\n};\s*$/, `\n\n  // ---------- PLAN-011: kurasi singkatan kuno (${overrideEntries.length} kata) ----------\n${newBlock}\n};`);
    writeFileSync(OVERRIDES_FILE, next);
    console.log(`  ✓ clue-overrides.mjs: ${overrideEntries.length} entri kurasi ditambahkan`);
  }
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

// ---------------------------------------------------------------- output
if (AUDIT) {
  console.log(`AUDIT — ${report.total} kata memuat singkatan kuno`);
  console.log(`Per tier: ${JSON.stringify(report.perTier)}`);
  console.log(`Per kolom: ${JSON.stringify(report.perColumn)}`);
  console.log(`Per singkatan: ${JSON.stringify(report.perAbbrev)}`);
  console.log("\n── Sample target (max 25) ──");
  report.rows.slice(0, 25).forEach((r) =>
    console.log(`  t${r.tier} ${r.word}: c1="${(r.old[0] ?? "").slice(0, 60)}"`),
  );
} else {
  console.log(
    `Mode: ${report.mode} | Target: ${report.total} | Berubah: ${report.changed} (resolve: ${report.resolved}) | Unresolved: ${report.unresolved.length}`,
  );
  if (report.unresolved.length) {
    console.log("\n── UNRESOLVED (perlu override manual) ──");
    report.unresolved.forEach((c) =>
      console.log(`  t${c.tier} ${c.word}: old=${JSON.stringify(c.old)} new=${JSON.stringify(c.new)}`),
    );
  }
  console.log("\n── Sample perubahan (max 12) ──");
  report.rows
    .filter((r) => r.changed && !r.unresolved)
    .slice(0, 12)
    .forEach((r) => console.log(`  t${r.tier} ${r.word}: "${(r.old[0] ?? "").slice(0, 50)}" → "${(r.new[0] ?? "").slice(0, 50)}"`));
  if (APPLY) {
    console.log(`\n${totalApply} baris ditulis balik ke tier files.`);
    if (!WITH_SQL) console.log("ℹ️  Regenerate SQL: node scripts/vocab/gen-vocab-sql.mjs");
  } else if (report.changed) {
    console.log(`\nℹ️  ${report.changed} perbaikan SIAP — jalankan dengan --apply untuk menulis balik ke tier.`);
  }
}
console.log(`\nReport → ${OUT_PATH}`);
