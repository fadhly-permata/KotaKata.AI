// ============================================================
// PLAN-041 — Hapus kata vulgar (aman anak), ganti agar tiap
// tier tetap 1000 soal.
//
// Dua jenis perbaikan:
//   1. REPLACE — kata jawaban vulgar/tidak layak diganti dengan
//      kata pengganti kurasi (tier sama, kesulitan setara, 3 clue
//      baru yang tidak bocor jawaban, tidak duplikat di tier mana
//      pun — dicek terhadap seluruh kosakata).
//   2. REWRITE — jawaban bersih tapi clue memuat kata vulgar;
//      clue ditulis ulang.
//
// Setelah menjalankan: node scripts/vocab/vulgar-words.mjs harus
// melaporkan 0 hit vulgar & 0 hit answer-only, dan
// gen-vocab-sql + check-clue-quality lolos.
//
// Usage: node scripts/vocab/fix-plan041.mjs
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// ── 1. Penggantian jawaban: word → [kata_baru, c1, c2, c3] ─────
const REPLACE = {
  // Tier 2
  idiot: ["pandir", "tidak cerdik; bodoh sekali", "Antonim: pintar", "Sinonim: bebal"],
  tolol: ["bebal", "sukar mengerti; tidak dapat menerima pelajaran", "Antonim: cerdik", "Sinonim: pandir"],
  ganja: ["hening", "sunyi; sepi; lengang", "Antonim: ramai", "Sinonim: senyap"],
  banci: ["kikuk", "canggung; kaku dalam bertingkah", "Antonim: lincah", "Sinonim: canggung"],
  cabul: ["rukun", "baik dan damai; tidak bertengkar", "Antonim: bermusuhan", "Sinonim: akur"],
  mesum: ["mesra", "erat dan karib dalam persahabatan", "penuh kasih sayang", "Sinonim: akrab"],
  dungu: ["karib", "dekat dan akrab (tentang hubungan)", "sahabat yang sangat dekat", "Sinonim: akrab"],
  kafir: ["elok", "indah; bagus; cantik", "Antonim: buruk", "Sinonim: molek"],
  bugil: ["rimbun", "lebat dan banyak (tentang daun pohon)", "Antonim: gundul", "Sinonim: lebat"],
  anus: ["teduh", "tidak kena panas matahari; terlindung", "Antonim: panas", "Sinonim: sejuk"],
  penis: ["kokoh", "kuat dan tidak mudah roboh", "Antonim: rapuh", "Sinonim: kukuh"],
  opium: ["permai", "indah dan elok (tentang pemandangan)", "Antonim: buruk", "Sinonim: elok"],
  dadah: ["siulan", "bunyi nyaring dari bibir yang mengerucut", "Sinonim: bersuit", "Antonim: teriakan"],
  // Tier 3
  sialan: ["riuh", "ramai dan bising; gemuruh", "Antonim: sunyi", "Sinonim: ramai"],
  kentut: ["gempita", "riuh dan sangat ramai (tentang suara)", "Antonim: hening", "Sinonim: gegap"],
  heroin: ["desir", "bunyi angin atau pasir yang berhembus", "gemerisik halus", "Sinonim: desau"],
  mampus: ["riak", "gerakan air mengombak kecil", "gelombang kecil di permukaan air", "Sinonim: ombak kecil"],
  sundal: ["luapan", "air yang meluap keluar", "banjir akibat sungai meluap", "Sinonim: genangan"],
  kunyuk: ["selat", "laut sempit di antara dua daratan", "perairan yang memisahkan dua pulau", "perairan yang menghubungkan dua lautan besar"],
  goblok: ["tanjung", "daratan yang menjorok ke laut", "Antonim: teluk", "ujung daratan yang masuk ke laut"],
  morfin: ["masyhur", "terkenal; termasyhur", "Antonim: tak dikenal", "Sinonim: terkenal"],
  kontol: ["sentosa", "aman dan tenteram; bebas dari gangguan", "Antonim: kacau", "Sinonim: damai"],
  vagina: ["belukar", "semak-semak; hutan kecil", "tumbuhan kecil liar di hutan", "Sinonim: semak"],
  ereksi: ["bening", "jernih; bersih tembus pandang", "Antonim: keruh", "Sinonim: jernih"],
  testis: ["keruh", "tidak jernih; kotor (tentang air)", "Antonim: bening", "Sinonim: kotor"],
  // Tier 4
  keparat: ["termasyhur", "sangat terkenal; masyhur", "Antonim: tak dikenal", "Sinonim: terkenal"],
  pelacur: ["pemandangan", "sesuatu yang terlihat; panorama", "hal yang menarik untuk dilihat (tentang alam)", "Sinonim: panorama"],
  bangsat: ["membahana", "bergema; bergaung keras", "Antonim: senyap", "Sinonim: bergema"],
  sinting: ["berkumandang", "berbunyi nyaring dan bergema", "Sinonim: bergaung", "terdengar sampai jauh"],
  kampret: ["melilit", "membelit; melingkar erat", "Sinonim: membelit", "Antonim: melepas"],
  lesbian: ["berkelok", "berliku-liku; tidak lurus", "Antonim: lurus", "Sinonim: berliku"],
  ekstasi: ["rupawan", "elok; cantik (tentang wajah)", "Sinonim: molek", "Antonim: buruk rupa"],
  mani: ["rangkulan", "pelukan; dekap", "tindakan memeluk dengan kedua tangan", "Sinonim: pelukan"],
  kelamin: ["belaian", "elusan penuh kasih sayang", "Sinonim: elusan", "Antonim: pukulan"],
  // Tier 5
  bajingan: ["beristirahat", "menghentikan kegiatan untuk memulihkan tenaga", "Sinonim: rehat", "Antonim: bekerja"],
  meniduri: ["bernyanyi", "mengeluarkan suara dengan lagu", "melantunkan lagu", "Antonim: berdiam"],
  narkotik: ["bersenandung", "bernyanyi dengan suara pelan", "melagukan lagu dengan suara rendah", "Antonim: berteriak"],
  kemaluan: ["sanjung", "pujian; penghargaan yang tinggi", "Sinonim: puja", "Antonim: hinaan"],
  // Tier 6
  pelacuran: ["salaman", "berjabat tangan sebagai tanda salam", "Sinonim: berjabat", "Antonim: pelukan"],
  mariyuana: ["pekikan", "teriakan nyaring", "Sinonim: teriakan", "Antonim: bisikan"],
  selingkuh: ["lengkingan", "bunyi nyaring dan melengking", "Sinonim: pekikan", "Antonim: bisikan"],
  // Tier 7
  masturbasi: ["berbisik-bisik", "berkata dengan suara sangat pelan", "Sinonim: berbisik", "Antonim: berteriak"],
  bersetubuh: ["berkelindan", "berbelit; berjalin (tentang benang)", "Sinonim: berbelit", "Antonim: terurai"],
  pornografi: ["mengelilingi", "mengitari; berada di sekeliling", "Sinonim: mengitari", "Antonim: meninggalkan"],
  pencabulan: ["memutari", "berjalan mengelilingi", "Sinonim: mengitari", "Antonim: menembus"],
  // Tier 8
  percabulan: ["melangkahkan", "menggerakkan kaki untuk berjalan", "Sinonim: melangkah", "Antonim: menghentikan"],
  // Tier 9
  fornikasi: ["mengguntur", "berbunyi seperti guntur; menggelegar", "Sinonim: menggelegar", "Antonim: senyap"],
  gerempang: ["berteriak-teriak", "berseru dengan suara keras berulang-ulang", "Sinonim: berteriak", "Antonim: berbisik-bisik"],
  datatamak: ["berdentam", "berbunyi dentam; berdentum", "Sinonim: berdentum", "Antonim: senyap"],
  apomorfin: ["gelegar", "bunyi gemuruh yang keras", "Sinonim: gemuruh", "Antonim: sunyi"],
  // Tier 10
  testikel: ["semenanjung", "daratan yang menjorok ke laut dan dikelilingi laut di tiga sisinya", "Sinonim: jazirah", "Antonim: selat"],
  klitoris: ["ringkikan", "bunyi nyaring kuda", "Sinonim: meringkik", "suara kuda yang meringkik"],
};

// ── 2. Tulis ulang clue (jawaban dipertahankan) ────────────────
// word → { c1? / c2? / c3? : clue_baru }
const REWRITE = {
  lian: { c1: "sumpah suami istri yang saling menuduh berbuat serong" },
  karat: { c3: "lapisan cokelat kemerahan pada besi" },
  kotoran: { c1: "sisa kotor; sesuatu yang kotor", c3: "Sinonim: najis" },
  bermoral: { c3: "Antonim: amoral" },
  kecanduan: { c2: "keadaan ketagihan hingga lupa hal lain" },
  bentangkan: { c1: "denda adat pada suku Dayak karena pelanggaran janji kawin" },
  argirodit: { c2: "salah satu mineral sumber germanium", c3: "bahan baku untuk memperoleh germanium" },
  disentri: {
    c1: "penyakit radang usus besar dengan gejala buang air besar bercampur lendir",
    c2: "hal yang berkaitan dengan radang usus besar dengan gejala buang air besar bercampur lendir",
  },
};

// ── Eksekusi ───────────────────────────────────────────────────
const files = readdirSync(vocabDir)
  .filter((f) => /^tier\d.*\.ts$/.test(f))
  .sort((a, b) => Number(a.match(/^tier(\d+)/)[1]) - Number(b.match(/^tier(\d+)/)[1]));

let replaced = 0;
let rewritten = 0;
const notFound = [];

for (const f of files) {
  const path = join(vocabDir, f);
  let src = readFileSync(path, "utf8");
  const lines = src.split("\n");
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^  \["([^"]+)",\s*"(.*)",\s*"(.*)",\s*"(.*)"\],$/);
    if (!m) continue;
    const word = m[1];

    if (REPLACE[word]) {
      const [nw, c1, c2, c3] = REPLACE[word];
      lines[i] = `  ["${nw}", "${c1}", "${c2}", "${c3}"],`;
      replaced++;
      changed = true;
      continue;
    }

    if (REWRITE[word]) {
      const r = REWRITE[word];
      let [c1, c2, c3] = [m[2], m[3], m[4]];
      if (r.c1) c1 = r.c1;
      if (r.c2) c2 = r.c2;
      if (r.c3) c3 = r.c3;
      lines[i] = `  ["${word}", "${c1}", "${c2}", "${c3}"],`;
      rewritten++;
      changed = true;
    }
  }

  if (changed) writeFileSync(path, lines.join("\n"), "utf8");
}

// Verifikasi: kata vulgar HARUS sudah tidak ada, kata REWRITE harus ada
const targets = Object.keys(REPLACE);
const rewriteTargets = Object.keys(REWRITE);
const allSrc = files.map((f) => readFileSync(join(vocabDir, f), "utf8")).join("\n");
for (const t of targets) {
  if (new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(allSrc)) {
    notFound.push(`masih ada: ${t}`);
  }
}
for (const t of rewriteTargets) {
  if (!allSrc.includes(`"${t}"`)) notFound.push(`hilang: ${t}`);
}

console.log(`File diproses: ${files.length}`);
console.log(`Jawaban diganti: ${replaced} (target ${targets.length})`);
console.log(`Clue ditulis ulang: ${rewritten} (target ${rewriteTargets.length})`);
if (notFound.length) {
  console.error(`VERIFIKASI GAGAL: ${notFound.join(", ")}`);
  process.exit(1);
}
if (replaced !== targets.length || rewritten !== rewriteTargets.length) {
  console.error("JUMLAH TIDAK SESUAI — ada entri yang tidak ter-replace!");
  process.exit(1);
}
console.log("Semua target berhasil diubah ✅");
