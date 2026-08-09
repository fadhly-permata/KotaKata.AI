// ============================================================
// Perbaikan presisi issue clue tier 1-5 (data curated manual).
// Setiap baris diganti penuh (c1/c2/c3) — tidak menyebut kata
// jawaban, tidak ada kolom yang memuat kolom lain, c1/c2/c3
// saling berbeda.
// Usage: node scripts/vocab/fix-tier1-5.mjs [--dry-run]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");

// kata -> [c1, c2, c3]
const FIX = {
  // ---- tier1 ----
  koin: ["mata uang logam", "uang receh", "Sinonim: receh"],
  laki: ["suami; sebutan untuk pria", "pasangan hidup dalam pernikahan", "Sinonim: pasangan"],
  kung: ["tiruan bunyi gong dipukul", "tiruan suara gong", "Sinonim: dentang"],
  pon: ["satuan ukuran berat lima ratus gram", "bobot setengah kilogram", "Sinonim: setengah kilo"],
  uni: ["perserikatan; persatuan", "perhimpunan", "Sinonim: gabungan"],
  rim: ["satuan ukuran kertas yang berjumlah lima ratus helai", "jumlah kertas sebanyak lima ratus lembar", "Sinonim: pak"],
  demo: ["unjuk rasa; aksi protes", "aksi massa menyampaikan pendapat", "Sinonim: demonstrasi"],
  tian: ["perut perempuan hamil; kandungan", "bagian tubuh tempat janin tumbuh", "Sinonim: rahim"],
  wig: ["rambut tiruan sebagai penutup kepala", "penutup kepala dari serat rambut buatan", "Sinonim: rambut palsu"],
  polo: ["permainan bola dengan berkuda", "olahraga berkuda", "Sinonim: permainan berkuda"],
  oli: ["minyak pelumas mesin", "cairan kental pelicin mesin", "Sinonim: gemuk"],
  babu: ["perempuan yang bekerja sebagai pembantu rumah tangga", "perempuan pekerja domestik", "Sinonim: pelayan"],
  step: ["langkah dalam senam irama", "gerakan kaki dalam senam", "Sinonim: langkah kaki"],
  vila: ["rumah peristirahatan di luar kota", "rumah liburan", "Sinonim: pondok"],
  leng: ["satuan ukuran berat setengah cupak", "timbangan setengah cupak", "Sinonim: takaran"],
  alif: ["nama huruf pertama abjad Arab", "aksara pertama dalam abjad Arab", "melambangkan bunyi 'a'"],
  duk: ["kain pembalut waktu haid", "kain penyerap darah haid", "Sinonim: pembalut wanita"],
  bet: ["pemukul bola dalam permainan pingpong", "alat pukul dalam pingpong", "Sinonim: raket"],
  das: ["tiruan bunyi tembakan senapan", "tiruan suara tembakan senjata", "Sinonim: ledakan"],
  cuka: ["cairan masam untuk bumbu", "bahan perasa masam", "hasil peragian yang rasanya masam"],
  bias: ["simpangan", "pembelokan arah", "Sinonim: penyimpangan"],
  // ---- tier2 ----
  komet: ["benda langit berekor cahaya yang mengelilingi matahari", "bintang bercahaya dengan ekor", "Sinonim: bintang berekor"],
  impas: ["sama besar pendapatan dengan modal; tanpa laba", "pulang pokok", "Sinonim: tidak untung"],
  lusin: ["satuan jumlah dua belas buah", "sekumpulan dua belas", "Sinonim: dosin"],
  metro: ["kereta bawah tanah", "jaringan angkutan cepat dalam kota", "Sinonim: kereta listrik"],
  dekan: ["pemimpin fakultas di perguruan tinggi", "ketua fakultas", "Sinonim: kepala fakultas"],
  sajak: ["gubahan sastra berbentuk puisi", "karangan berirama", "Sinonim: syair"],
  germo: ["induk semang bagi perempuan pelacur; muncikari", "perantara pelacuran", "Sinonim: mucikari"],
  hindu: ["agama yang berkitab suci Weda", "pemeluk ajaran berpedoman Weda", "Sinonim: agama Weda"],
  mesiu: ["bahan kimia mudah meledak untuk isi peluru", "bubuk peledak", "Sinonim: bahan peledak"],
  sisir: ["alat merapikan rambut yang bergerigi", "sikat rambut", "Sinonim: alat perapih rambut"],
  // ---- tier3 ----
  bahasa: ["sistem lambang bunyi yang dipakai manusia untuk berkomunikasi", "perkataan yang diucapkan manusia", "Sinonim: tutur"],
  // ---- tier4 ----
  pembawa: ["orang yang membawa", "pemandu acara", "Sinonim: pengantar"],
  memerah: ["menjadi merah", "pipi memanas karena malu", "Antonim: pucat"],
  pejalan: ["orang yang berjalan", "yang berjalan tanpa kendaraan", "Sinonim: pengguna"],
  // ---- tier5 ----
  bayangan: ["bayang-bayang", "gambaran dalam angan-angan", "Sinonim: refleksi"],
  kediaman: ["tempat atau rumah yang ditinggali", "tempat tinggal", "Sinonim: hunian"],
  menanyai: ["bertanya kepada; memeriksa dengan bertanya", "menginterogasi", "Sinonim: mengusut"],
  kavaleri: ["barisan atau pasukan berkuda", "pasukan yang menunggang kuda", "Sinonim: pasukan kuda"],
  bersusah: ["berasa susah", "berlelah-lelah; bekerja keras", "Antonim: bersenang"],
  penjepit: ["alat untuk menjepit", "alat yang dipakai menjepit pakaian", "Sinonim: jepitan"],
  domestik: ["berhubungan dengan masalah dalam negeri", "bersifat internal suatu negara", "Antonim: internasional"],
  penjahit: ["orang yang mata pencahariannya menjahit", "tukang jahit", "Sinonim: pengrajin pakaian"],
  bersayap: ["mempunyai sayap", "dapat terbang di udara", "Sinonim: berkapak"],
};

const TIER_FILES = {
  koin: "tier1.ts", laki: "tier1.ts", kung: "tier1.ts", pon: "tier1.ts", uni: "tier1.ts",
  rim: "tier1.ts", demo: "tier1.ts", tian: "tier1.ts", wig: "tier1.ts", polo: "tier1.ts",
  oli: "tier1.ts", babu: "tier1.ts", step: "tier1.ts", vila: "tier1.ts", leng: "tier1.ts",
  alif: "tier1.ts", duk: "tier1.ts", bet: "tier1.ts", das: "tier1.ts", cuka: "tier1.ts",
  bias: "tier1.ts",
  komet: "tier2.ts", impas: "tier2.ts", lusin: "tier2.ts", metro: "tier2.ts", dekan: "tier2.ts",
  sajak: "tier2.ts", germo: "tier2.ts", hindu: "tier2.ts", mesiu: "tier2.ts", sisir: "tier2.ts",
  bahasa: "tier3.ts",
  pembawa: "tier4-part2.ts", memerah: "tier4-part3.ts", pejalan: "tier4-part3.ts",
  bayangan: "tier5.ts", kediaman: "tier5.ts", menanyai: "tier5.ts",
  kavaleri: "tier5-part3.ts", bersusah: "tier5-part3.ts", penjepit: "tier5-part3.ts",
  domestik: "tier5-part3.ts", penjahit: "tier5-part3.ts", bersayap: "tier5-part4.ts",
};

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const files = [...new Set(Object.values(TIER_FILES))];
let replaced = 0;
for (const file of files) {
  const path = `src/data/vocabulary/${file}`;
  let src = readFileSync(path, "utf8");
  for (const [word, clues] of Object.entries(FIX)) {
    if (TIER_FILES[word] !== file) continue;
    const [c1, c2, c3] = clues;
    const line = `  ["${word}", "${esc(c1)}", "${esc(c2)}", "${esc(c3)}"],`;
    const re = new RegExp(`^  \\["${word}",[^\\n]*\\],$`, "gm");
    const before = src.match(re);
    if (before && before.length === 1) {
      src = src.replace(re, line);
      replaced++;
    } else if (!before) {
      console.log(`!! kata tidak ditemukan di ${file}: ${word}`);
    } else {
      console.log(`!! ambigu (${before.length} match) di ${file}: ${word}`);
    }
  }
  if (!DRY) writeFileSync(path, src);
}
console.log(`replaced=${replaced}/${Object.keys(FIX).length}`);
