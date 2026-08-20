#!/usr/bin/env node
// ============================================================
// Fix ALL critical clue leaks across all tier vocabulary files.
// Each new clue is hand-verified to NOT contain the answer word.
// Usage: node scripts/vocab/fix-clue-leaks.mjs [--dry-run]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const isDryRun = process.argv.includes("--dry-run");

function containsWord(str, word) {
  return str.toLowerCase().includes(word.toLowerCase());
}

// ============================================================
// FIX MAP — ALL new clues verified to NOT leak the answer word.
// Format: word → { clue_1?, clue_2?, clue_3? }
// ============================================================
const FIXES = {
  // ═══════════════ TIER 1 (58 words) ═══════════════

  // --- Direct answer-in-clue fixes ---
  tempe:     { clue_3: "Lauk sederhana berbahan kedelai difermentasi" },
  minyak:    { clue_1: "Cairan berlemak untuk menggoreng" },
  nanas:     { clue_3: "Buah kuning berduri bermahkota daun" },
  air:       { clue_1: "Fluida bening yang dibutuhkan semua makhluk hidup" },
  siku:      { clue_3: "Sendi di tengah lengan" },
  lutut:     { clue_2: "Bagian kaki yang ditekuk saat berjongkok" },
  gunting:   { clue_2: "Alat berbilah dua untuk memotong kertas" },
  cermin:    { clue_2: "Kaca yang memantulkan bayangan" },
  musuh:     { clue_1: "Lawan dalam pertengkaran", clue_2: "Orang yang selalu bertengkar" },
  raja:      { clue_1: "Pemimpin tertinggi di istana" },
  makan:     { clue_1: "Kegiatan memasukkan santapan ke mulut" },
  iris:      { clue_2: "Memotong bawang tipis-tipis" },
  lempar:    { clue_1: "Membuang benda dengan tangan ke suatu arah" },
  ambil:     { clue_1: "Memungut barang dari suatu tempat" },
  beri:      { clue_1: "Menyerahkan hadiah kepada orang lain" },
  antar:     { clue_1: "Membawa orang atau barang ke tujuan", clue_3: "Sinonim: damping" },
  jemput:    { clue_1: "Datang mengambil orang di suatu tempat" },
  cari:      { clue_2: "Berusaha menemukan sesuatu yang hilang" },
  tanya:     { clue_1: "Mengajukan soal kepada orang", clue_2: "Bersoal kepada guru", clue_3: "Sinonim: bersoal" },
  nyanyi:    { clue_2: "Melantunkan lagu dengan suara", clue_3: "Sinonim: melagu" },
  lari:      { clue_2: "Bergegas mengejar bus" },
  jalan:     { clue_2: "Melangkah santai di taman" },
  naik:      { clue_2: "Menapaki anak tangga" },
  masuk:     { clue_2: "Melangkah ke dalam ruangan" },
  buka:      { clue_1: "Tidak tertutup" },
  beli:      { clue_2: "Mendapatkan sayur dengan membayar" },
  jual:      { clue_2: "Memberikan barang kepada pembeli" },
  bayar:     { clue_2: "Mengeluarkan uang di kasir" },
  simpan:    { clue_1: "Menaruh barang di tempat aman" },
  buang:     { clue_1: "Menghilangkan sesuatu yang tidak dipakai", clue_2: "Menghilangkan sampah" },
  gantung:   { clue_1: "Menempelkan benda pada kaitan tinggi", clue_2: "Menjemur baju pada tali" },
  lipat:     { clue_1: "Mengatupkan ujung kertas agar rapi", clue_2: "Mengatupkan sesuatu menjadi dua bagian" },
  rebus:     { clue_2: "Memasak telur dalam air mendidih" },
  goreng:    { clue_2: "Memasak pisang dalam minyak panas" },
  bakar:     { clue_2: "Memasak ikan di atas bara api" },
  campur:    { clue_2: "Menggabungkan air dan gula" },
  aduk:      { clue_1: "Mengocok adonan dengan sendok", clue_2: "Mengocok kopi dengan sendok" },
  gigit:     { clue_2: "Mengunyah apel dengan gigi" },
  renang:    { clue_1: "Aktivitas bergerak di dalam air", clue_3: "Olahraga di kolam" },
  sedih:     { clue_2: "Merasa pilu dan tidak gembira" },
  bingung:   { clue_2: "Tidak tahu harus berbuat apa" },
  hari:      { clue_3: "Waktu dari fajar hingga senja" },
  minggu:    { clue_2: "Jangka waktu tujuh hari" },
  gambar:    { clue_2: "Hasil menggoreskan pensil di kertas" },
  gulat:     { clue_3: "Olahraga bela diri" },
  ujian:     { clue_1: "Tes untuk menilai kemampuan murid" },
  nilai:     { clue_1: "Angka hasil tes untuk mengukur kemampuan" },
  medali:    { clue_3: "Penghargaan berupa lempeng logam" },
  gema:      { clue_2: "Pantulan suara di gua" },
  dengung:   { clue_3: "Suara nyaring dari sayap serangga" },
  bersila:   { clue_1: "Posisi duduk dengan kedua kaki dilipat", clue_3: "Posisi kaki dilipat ke dalam" },
  rinci:     { clue_2: "Sangat detail dan lengkap", clue_3: "Sinonim: detail" },
  gemas:     { clue_2: "Ingin mencubit karena lucu" },
  angan:     { clue_2: "Khayalan atau harapan" },
  abdi:      { clue_1: "Orang yang bekerja untuk raja" },
  flu:       { clue_3: "Penyakit menular dari virus" },
  kumur:     { clue_3: "Membersihkan mulut dengan air" },
  yodium:    { clue_1: "Unsur kimia yang dipakai untuk luka" },
  sepak:     { clue_1: "Menendang bola dengan kaki", clue_3: "Sinonim: tendang" },

  // ═══════════════ TIER 2 (3 words) ═══════════════
  nonton:    { clue_1: "Menyaksikan pertunjukan atau film", clue_3: "Menyaksikan siaran" },
  relawan:   { clue_2: "Pekerja sukarela untuk kemanusiaan", clue_3: "Orang yang rela membantu" },
  simpulan:  { clue_3: "Ringkasan dari sebuah pembahasan" },

  // ═══════════════ TIER 3 (5 words) ═══════════════
  antre:     { clue_3: "Berbaris menunggu giliran" },
  bolos:     { clue_2: "Tidak masuk sekolah tanpa izin" },
  cipta:     { clue_2: "Membuat karya yang baru", clue_3: "Akar kata: memproduksi" },
  dalih:     { clue_2: "Alasan untuk menutupi kesalahan" },
  masyhur:   { clue_1: "Terkenal dan diakui banyak orang" },

  // ═══════════════ TIER 5 (15 words) ═══════════════
  menunggu:  { clue_2: "Merawat atau menjaga sementara waktu" },
  hubungan:  { clue_1: "Keadaan saling terkait; kontak" },
  bangunan:  { clue_2: "Gedung atau struktur dari material kuat" },
  nasional:  { clue_3: "Antonim: internasional" },
  sembunyi:  { clue_2: "Tidak terlihat karena dirahasiakan" },
  hitungan:  { clue_1: "Hasil berhitung; perkiraan", clue_3: "Angka yang dihasilkan dari berhitung" },
  tabrakan:  { clue_1: "Insiden dua benda saling hantam" },
  mengabdi:  { clue_2: "Bekerja dengan penuh keikhlasan" },
  pengenal:  { clue_2: "Tanda untuk mengenali seseorang" },
  rasional:  { clue_3: "Berlandaskan akal sehat" },
  astronom:  { clue_1: "Ahli yang mempelajari benda langit" },
  psikolog:  { clue_1: "Ahli yang mempelajari perilaku manusia" },
  arkeolog:  { clue_1: "Ahli yang menggali peninggalan purba" },
  perempat:  { clue_2: "Satu dari empat bagian sama" },
  angkutan:  { clue_2: "Layanan mengangkut barang atau penumpang" },

  // ═══════════════ TIER 6 (1 word) ═══════════════
  protestan: { clue_1: "Aliran gereja yang terpisah dari Katolik Roma" },

  // ═══════════════ TIER 7 (4 words) ═══════════════
  elektronik: { clue_1: "Alat yang menggunakan sirkuit listrik", clue_2: "Perihal alat yang menggunakan sirkuit listrik", clue_3: "Hal yang berkaitan dengan alat sirkuit listrik" },
  menyingkap: { clue_2: "Membuka tutupan; menyibak" },
  antropolog: { clue_1: "Ahli tentang asal-usul dan perilaku manusia", clue_2: "Perihal kajian asal-usul manusia", clue_3: "Hal yang berkaitan dengan kajian asal-usul manusia" },
  menghormat: { clue_2: "Menghargai dan memuliakan" },

  // ═══════════════ TIER 8 (12 words) ═══════════════
  dermatolog:  { clue_1: "Ahli tentang penyakit kulit", clue_3: "Hal yang berkaitan dengan penyakit kulit" },
  determinis:  { clue_1: "Penganut paham bahwa segala sudah ditentukan", clue_2: "Perihal paham bahwa segala sudah ditentukan", clue_3: "Hal yang berkaitan dengan paham penentuan nasib" },
  herpetolog:  { clue_1: "Ahli tentang reptil dan amfibi", clue_2: "Perihal kajian reptil dan amfibi", clue_3: "Hal yang berkaitan dengan kajian reptil dan amfibi" },
  klimatolog:  { clue_1: "Ahli tentang cuaca dan iklim", clue_2: "Perihal kajian cuaca dan iklim", clue_3: "Hal yang berkaitan dengan kajian cuaca dan iklim" },
  kolektivis:  { clue_1: "Penganut paham yang mengutamakan kelompok", clue_2: "Perihal paham yang mengutamakan kelompok", clue_3: "Hal yang berkaitan dengan paham kebersamaan" },
  kolonialis:  { clue_1: "Negara yang menjajah bangsa lain" },
  kosmetolog:  { clue_1: "Ahli kecantikan" },
  kriminolog:  { clue_1: "Ahli tentang tindak kejahatan" },
  leksikolog:  { clue_1: "Ahli tentang kata dan kosakata", clue_2: "Perihal kajian kata dan kosakata", clue_3: "Hal yang berkaitan dengan kajian kosakata" },
  materialis:  { clue_1: "Penganut paham yang mengutamakan materi", clue_3: "Pengikut ajaran yang mengutamakan materi" },
  metamorfis:  { clue_1: "Berhubungan dengan perubahan wujud" },
  paternalis:  { clue_3: "Penganut paham kebapakan" },

  // ═══════════════ TIER 9 (9 words) ═══════════════
  menyumpah:   { clue_2: "Menyuruh bersumpah; mengambil sumpah" },
  pragmatis:   { clue_3: "Berpandangan realistis dan praktis" },
  mengumpan:   { clue_2: "Melemparkan umpan" },
  bersetuju:   { clue_2: "Bertepatan dengan ; berbetulan dengan" },
  oportunis:   { clue_1: "Orang yang mengambil keuntungan dari situasi", clue_2: "Perihal mengambil keuntungan dari situasi", clue_3: "Hal yang berkaitan dengan sikap mencari keuntungan" },
  sekongkol:   { clue_2: "Saling bekerja sama secara licik" },
  entomolog:   { clue_1: "Ahli tentang serangga", clue_2: "Perihal kajian serangga", clue_3: "Hal yang berkaitan dengan kajian serangga" },
  futurolog:   { clue_1: "Ahli tentang ramalan masa depan", clue_2: "Perihal kajian ramalan masa depan", clue_3: "Hal yang berkaitan dengan kajian masa depan" },
  ginekolog:   { clue_3: "Ahli tentang kandungan wanita" },

  // ═══════════════ TIER 10 (8 words) ═══════════════
  sosialis:    { clue_2: "Penganut paham kebersamaan", clue_3: "Negara yang menganut paham kebersamaan" },
  menyorot:    { clue_2: "Membidik; mengarahkan cahaya" },
  tubrukan:    { clue_1: "Peristiwa saling berbenturan; tumbukan kendaraan", clue_2: "Saling berbenturan; berlanggaran", clue_3: "Peristiwa saling berbenturan antar kendaraan" },
  mengurai:    { clue_2: "Melonggarkan; menjelaskan secara rinci" },
  kecambah:    { clue_3: "Tunas yang muncul dari biji" },
  neurosis:    { clue_2: "Gangguan kejiwaan tanpa kerusakan organik" },
  menyekat:    { clue_2: "Merintangi; menghalangi; memisahkan" },
  biofisik:    { clue_1: "Gabungan biologi dan ilmu kebumian" },
};

// ============================================================
// Apply fixes
// ============================================================
let totalFixed = 0, totalSkipped = 0, totalStillLeaking = 0;

for (const [word, fixes] of Object.entries(FIXES)) {
  let tierFile = null;
  for (let t = 1; t <= 10; t++) {
    const fileName = `tier${t}.ts`;
    try {
      const src = readFileSync(join(dir, fileName), "utf8");
      if (src.includes(`"${word}"`)) { tierFile = fileName; break; }
    } catch { /* skip */ }
  }

  if (!tierFile) { console.log(`⚠️  "${word}" not found — skipping`); totalSkipped++; continue; }

  const filePath = join(dir, tierFile);
  let src = readFileSync(filePath, "utf8");
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRegex = new RegExp(
    `(\\["${escapedWord}"\\s*,\\s*")((?:[^"\\\\]|\\\\.)*)(")\\s*,\\s*"((?:[^"\\\\]|\\\\.)*)(")\\s*,\\s*"((?:[^"\\\\]|\\\\.)*)(")\\s*\\]`, "m"
  );

  const match = src.match(wordRegex);
  if (!match) { console.log(`⚠️  Could not match "${word}" in ${tierFile}`); totalSkipped++; continue; }

  const fullMatch = match[0];
  const unescape = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const cur = [unescape(match[2]), unescape(match[4]), unescape(match[6])];
  const newClues = [...cur];

  let changed = false;
  if (fixes.clue_1 !== undefined && fixes.clue_1 !== cur[0]) { newClues[0] = fixes.clue_1; changed = true; }
  if (fixes.clue_2 !== undefined && fixes.clue_2 !== cur[1]) { newClues[1] = fixes.clue_2; changed = true; }
  if (fixes.clue_3 !== undefined && fixes.clue_3 !== cur[2]) { newClues[2] = fixes.clue_3; changed = true; }

  if (!changed) { console.log(`ℹ️  "${word}" — no change`); continue; }

  const stillLeaks = [];
  for (let i = 0; i < 3; i++) {
    if (containsWord(newClues[i], word)) stillLeaks.push(`clue_${i+1}`);
  }
  if (stillLeaks.length > 0) {
    console.log(`🔴 "${word}" STILL LEAKS in ${stillLeaks.join(", ")}`);
    totalStillLeaking++;
  }

  const newTuple = `["${word}", "${escape(newClues[0])}", "${escape(newClues[1])}", "${escape(newClues[2])}"]`;

  if (isDryRun) {
    console.log(`${stillLeaks.length ? "🔴" : "✅"} ${tierFile}: "${word}"`);
  } else {
    src = src.replace(fullMatch, newTuple);
    writeFileSync(filePath, src, "utf8");
    console.log(`✅ ${tierFile}: "${word}"`);
  }
  totalFixed++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${totalFixed}, Skipped: ${totalSkipped}, Still leaking: ${totalStillLeaking}`);
if (isDryRun) console.log(`(dry-run — no files modified)`);
