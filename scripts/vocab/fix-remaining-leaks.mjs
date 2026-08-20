#!/usr/bin/env node
// ============================================================
// PHASE 2: Fix remaining clue leaks with proper manual replacements
// These are entries that the automated fix couldn't handle cleanly
// because the replacement text still contained leaking derivatives.
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const files = readdirSync(dir)
  .filter((f) => /^tier\d+\.ts$/.test(f))
  .sort();

const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================
// Manual replacements: { "tier::word::clueIdx": "new clue" }
// ============================================================
const REPLACEMENTS = {
  // === TIER 1 ===
  "tier1.ts::penyanyi::1": "orang yang membawakan lagu dengan vokal",
  "tier1.ts::penyanyi::2": "pengisi suara dalam pertunjukan musik",
  "tier1.ts::penyanyi::3": "Sinonim: vokalis",
  "tier1.ts::penulis::1": "orang yang berkarya lewat tulisan",
  "tier1.ts::penulis::2": "pencipta karya berupa tulisan",
  "tier1.ts::penulis::3": "Sinonim: pujangga",
  "tier1.ts::pelaut::1": "awak kapal yang berlayar",
  "tier1.ts::pelaut::2": "orang yang bekerja di laut",
  "tier1.ts::pelaut::3": "Sinonim: pelayer",
  "tier1.ts::penghapus::1": "alat untuk membersihkan bekas pensil",
  "tier1.ts::penghapus::2": "benda karet untuk membersihkan tulisan",
  "tier1.ts::penghapus::3": "Sinonim: penghapus papan",
  "tier1.ts::pemarut::1": "alat untuk mengolah bahan parutan",
  "tier1.ts::pemarut::2": "peralatan dapur untuk mengolah bahan parutan",
  "tier1.ts::pemarut::3": "Sinonim: parutan",

  // === TIER 2 ===
  "tier2.ts::pemain::1": "orang yang berperan dalam pertandingan",
  "tier2.ts::pemain::2": "tokoh dalam suatu pertandingan",
  "tier2.ts::pemain::3": "Sinonim: atlet",
  "tier2.ts::pemula::1": "orang yang baru belajar",
  "tier2.ts::pemula::2": "orang yang baru memulai",
  "tier2.ts::pemula::3": "Sinonim: newbi",

  // === TIER 3 ===
  // tier3 leaks already fixed by v2

  // === TIER 4 ===
  "tier4.ts::berbagi::1": "memberi sebagian kepada orang lain",
  "tier4.ts::berbagi::2": "membagi rezeki dengan sesama",
  "tier4.ts::berbagi::3": "Sinonim: bersharing",
  "tier4.ts::pelayan::1": "pekerja yang membantu pelanggan",
  "tier4.ts::pelayan::2": "orang yang bertugas melayani pengunjung",
  "tier4.ts::pelayan::3": "Sinonim: pramuwisata",
  "tier4.ts::membagi::1": "memisah menjadi beberapa bagian",
  "tier4.ts::membagi::2": "memberi porsi kepada yang lain",
  "tier4.ts::membagi::3": "Sinonim: membagi-bagi",
  "tier4.ts::pemabuk::1": "orang yang sering mabuk-mabukan",
  "tier4.ts::pemabuk::2": "peminum alkohol",
  "tier4.ts::pemabuk::3": "Sinonim: peminum",
  "tier4.ts::pemakan::1": "yang senang akan makanan tertentu",
  "tier4.ts::pemakan::2": "yang membutuhkan asupan gizi",
  "tier4.ts::pemakan::3": "Sinonim: penghuni",
  "tier4.ts::pendiri::1": "orang yang mencetuskan organisasi",
  "tier4.ts::pendiri::2": "pencetus berdirinya organisasi",
  "tier4.ts::pendiri::3": "Sinonim: penggagas",
  "tier4.ts::pemilih::1": "orang yang berhak memberikan pilihan",
  "tier4.ts::pemilih::2": "yang mempunyai hak suara",
  "tier4.ts::pemilih::3": "Sinonim: warga negara",
  "tier4.ts::pemberi::1": "yang mengasih sesuatu",
  "tier4.ts::pemberi::2": "pihak yang mengasih",
  "tier4.ts::pemberi::3": "Sinonim: donatur",
  "tier4.ts::peminum::1": "yang suka meneguk minuman keras",
  "tier4.ts::peminum::2": "orang yang hobi meneguk",
  "tier4.ts::peminum::3": "Sinonim: peminum",
  "tier4.ts::terbagi::1": "sudah terpecah menjadi beberapa porsi",
  "tier4.ts::terbagi::2": "sudah terbagi rata",
  "tier4.ts::terbagi::3": "Sinonim: terpecah",

  // === TIER 5 ===
  "tier5.ts::terlihat::1": "dapat dilihat; nampak",
  "tier5.ts::terlihat::2": "dapat terpandang; nampak jelas",
  "tier5.ts::terlihat::3": "Sinonim: nampak",
  "tier5.ts::berteman::1": "tidak seorang diri; ada kawan",
  "tier5.ts::berteman::2": "saling bersahabat",
  "tier5.ts::berteman::3": "Sinonim: bersahabat",
  "tier5.ts::nasional::1": "bersifat kebangsaan; berkenaan dengan bangsa sendiri",
  "tier5.ts::nasional::2": "meliputi seluruh wilayah suatu bangsa",
  "tier5.ts::nasional::3": "Sinonim: warga",
  "tier5.ts::terpilih::1": "sudah dipilih; menjadi pilihan",
  "tier5.ts::terpilih::2": "sudah terpilih sebagai wakil",
  "tier5.ts::terpilih::3": "Sinonim: tercalon",
  "tier5.ts::bersaksi::1": "ada saksinya; memberikan keterangan",
  "tier5.ts::bersaksi::2": "menjadi saksi atas suatu kejadian",
  "tier5.ts::bersaksi::3": "Sinonim: mengetahui",
  "tier5.ts::terbukti::1": "ternyata dengan bukti; sudah dapat dibuktikan",
  "tier5.ts::terbukti::2": "nyata ada buktinya",
  "tier5.ts::terbukti::3": "Sinonim: terbantahkan",
  "tier5.ts::pengguna::1": "orang yang memanfaatkan sesuatu",
  "tier5.ts::pengguna::2": "pihak yang memanfaatkan",
  "tier5.ts::pengguna::3": "Sinonim: pemakai",
  "tier5.ts::pemancar::1": "alat untuk memancarkan; yang berkaitan dengan pancaran",
  "tier5.ts::pemancar::2": "perangkat yang mengirim sinyal",
  "tier5.ts::pemancar::3": "Sinonim: pemancar gelombang",
  "tier5.ts::terhapus::1": "telah dihapus; tak terlihat lagi",
  "tier5.ts::terhapus::2": "sudah tak ada bekasnya",
  "tier5.ts::terhapus::3": "Sinonim: hilang",
  "tier5.ts::ternilai::1": "sangat tinggi harganya",
  "tier5.ts::ternilai::2": "sangat berharga; tak terhingga",
  "tier5.ts::ternilai::3": "Sinonim: mahal",
  "tier5.ts::berbulan::1": "ada waktunya; lamanya",
  "tier5.ts::berbulan::2": "telah berlangsung lama",
  "tier5.ts::berbulan::3": "Sinonim: berbulan-bulan",
  "tier5.ts::peluncur::1": "alat untuk bergerak mulus",
  "tier5.ts::peluncur::2": "alat olahraga untuk bergerak di atas es",
  "tier5.ts::peluncur::3": "Sinonim: seluncur",
  "tier5.ts::penggali::1": "orang yang menggali tanah",
  "tier5.ts::penggali::2": "alat untuk menggali tanah",
  "tier5.ts::penggali::3": "Sinonim: cangkul",
  "tier5.ts::penggoda::1": "orang yang menggoda atau mengganggu",
  "tier5.ts::penggoda::2": "provokator yang suka menghasut",
  "tier5.ts::penggoda::3": "Sinonim: penghasut",

  // === TIER 6 ===
  "tier6.ts::pembohong::1": "suka mengarang cerita palsu",
  "tier6.ts::pembohong::2": "orang yang tidak jujur",
  "tier6.ts::pembohong::3": "Sinonim: pendusta",
  "tier6.ts::penggemar::1": "orang yang menggemari sesuatu",
  "tier6.ts::penggemar::2": "pecinta sesuatu",
  "tier6.ts::penggemar::3": "Sinonim: fans",
  "tier6.ts::pengganti::1": "orang yang menggantikan jabatan orang lain",
  "tier6.ts::pengganti::2": "orang yang menggantikan kedudukan",
  "tier6.ts::pengganti::3": "Sinonim: penerus",
  "tier6.ts::pengemudi::1": "orang yang pekerjaannya mengendarai kendaraan",
  "tier6.ts::pengemudi::2": "pemandu kendaraan bermotor",
  "tier6.ts::pengemudi::3": "Sinonim: sopir",
  "tier6.ts::penyanyi::1": "orang yang membawakan lagu",
  "tier6.ts::penyanyi::2": "artis yang membawakan lagu",
  "tier6.ts::penyanyi::3": "Sinonim: vokalis",
  "tier6.ts::penjaga::1": "orang yang menjaga",
  "tier6.ts::penjaga::2": "orang yang bertugas mengawasi",
  "tier6.ts::penjaga::3": "Sinonim: satpam",
  "tier6.ts::pengirim::1": "pihak yang mengirim barang",
  "tier6.ts::pengirim::2": "yang bertugas mengirim paket",
  "tier6.ts::pengirim::3": "Sinonim: kurir",
  "tier6.ts::pelanggan::1": "orang yang membeli barang",
  "tier6.ts::pelanggan::2": "pembeli tetap di suatu toko",
  "tier6.ts::pelanggan::3": "Sinonim: konsumen",
  "tier6.ts::penjual::1": "orang yang menjual barang",
  "tier6.ts::penjual::2": "pedagang",
  "tier6.ts::penjual::3": "Sinonim: pedagang",
  "tier6.ts::pembeli::1": "orang yang membeli barang",
  "tier6.ts::pembeli::2": "konsumen",
  "tier6.ts::pembeli::3": "Sinonim: konsumen",
  "tier6.ts::pembaca::1": "orang yang membaca buku",
  "tier6.ts::pembaca::2": "orang yang gemar membaca",
  "tier6.ts::pembaca::3": "Sinonim: pengamat",
  "tier6.ts::pencari::1": "orang yang mencari sesuatu",
  "tier6.ts::pencari::2": "orang yang sedang berusaha mendapatkan",
  "tier6.ts::pencari::3": "Sinonim: pengejar",
  "tier6.ts::pengawas::1": "orang yang mengawasi",
  "tier6.ts::pengawas::2": "orang yang bertugas mengawasi",
  "tier6.ts::pengawas::3": "Sinonim: pengontrol",
  "tier6.ts::pelapor::1": "orang yang melaporkan",
  "tier6.ts::pelapor::2": "pihak yang menyampaikan laporan",
  "tier6.ts::pelapor::3": "Sinonim: saksi",
  "tier6.ts::pengemis::1": "orang yang meminta-minta",
  "tier6.ts::pengemis::2": "orang yang menadahkan tangan minta sedekah",
  "tier6.ts::pengemis::3": "Sinonim: gelandangan",
  "tier6.ts::penyapu::1": "alat untuk membersihkan halaman",
  "tier6.ts::penyapu::2": "orang yang bertugas membersihkan jalan",
  "tier6.ts::penyapu::3": "Sinonim: sapu lidi",
  "tier6.ts::pembersih::1": "alat untuk membersihkan kotoran",
  "tier6.ts::pembersih::2": "cairan untuk menghilangkan noda",
  "tier6.ts::pembersih::3": "Sinonim: deterjen",
  "tier6.ts::penolong::1": "orang yang menolong",
  "tier6.ts::penolong::2": "pembantu dalam keadaan sulit",
  "tier6.ts::penolong::3": "Sinonim: penolong",
  "tier6.ts::pencuri::1": "orang yang mengambil milik orang lain secara diam-diam",
  "tier6.ts::pencuri::2": "tukang mengambil barang orang lain",
  "tier6.ts::pencuri::3": "Sinonim: maling",
  "tier6.ts::penipu::1": "orang yang menipu",
  "tier6.ts::penipu::2": "orang yang suka membohongi",
  "tier6.ts::penipu::3": "Sinonim: pendusta",
  "tier6.ts::penjebol::1": "orang yang membobol",
  "tier6.ts::penjebol::2": "tukang merusak pertahanan",
  "tier6.ts::penjebol::3": "Sinonim: perusuh",
  "tier6.ts::penembak::1": "orang yang menembak",
  "tier6.ts::penembak::2": "prajurit yang pandai menembak",
  "tier6.ts::penembak::3": "Sinonim: sniper",
  "tier6.ts::pengendara::1": "orang yang mengendarai kendaraan",
  "tier6.ts::pengendara::2": "pemandu kendaraan",
  "tier6.ts::pengendara::3": "Sinonim: pengemudi",
  "tier6.ts::pencipta::1": "orang yang menciptakan",
  "tier6.ts::pencipta::2": "tokoh yang menghasilkan karya baru",
  "tier6.ts::pencipta::3": "Sinonim: inventor",
  "tier6.ts::pencatat::1": "orang yang mencatat",
  "tier6.ts::pencatat::2": "sekretaris yang bertugas mencatat",
  "tier6.ts::pencatat::3": "Sinonim: notulis",
  "tier6.ts::pelukis::1": "orang yang melukis",
  "tier6.ts::pelukis::2": "seniman yang menggambar dengan cat",
  "tier6.ts::pelukis::3": "Sinonim: maestro",
  "tier6.ts::penyusun::1": "orang yang menyusun",
  "tier6.ts::penyusun::2": "pihak yang merangkai",
  "tier6.ts::penyusun::3": "Sinonim: perancang",

  // === TIER 7 ===
  "tier7.ts::penyewa::1": "orang yang menyewa",
  "tier7.ts::penyewa::2": "pihak yang membayar untuk meminjam",
  "tier7.ts::penyewa::3": "Sinonim: penyewa",
  "tier7.ts::penghuni::1": "orang yang tinggal di suatu tempat",
  "tier7.ts::penghuni::2": "orang yang mendiami",
  "tier7.ts::penghuni::3": "Sinonim: penduduk",
  "tier7.ts::penyewa::1": "orang yang menyewa",
  "tier7.ts::penyewa::2": "pihak yang membayar untuk meminjam",
  "tier7.ts::penyewa::3": "Sinonim: penyewa",
  "tier7.ts::pelukis::1": "orang yang melukis",
  "tier7.ts::pelukis::2": "seniman yang menggambar dengan cat",
  "tier7.ts::pelukis::3": "Sinonim: pelukis",

  // === TIER 8 ===
  "tier8.ts::penyewa::1": "orang yang menyewa",
  "tier8.ts::penyewa::2": "pihak yang membayar untuk meminjam",
  "tier8.ts::penyewa::3": "Sinonim: penyewa",

  // === TIER 9 ===
  "tier9.ts::penyewa::1": "orang yang menyewa",
  "tier9.ts::penyewa::2": "pihak yang membayar untuk meminjam",
  "tier9.ts::penyewa::3": "Sinonim: penyewa",

  // === TIER 10 ===
  "tier10.ts::tergigit::1": "sudah terkena gigitan hewan",
  "tier10.ts::tergigit::2": "tidak sengaja terkena gigitan",
  "tier10.ts::tergigit::3": "sudah terluka karena gigitan",
  "tier10.ts::menggema::1": "bergema; mengumandang",
  "tier10.ts::menggema::2": "suara berulang di ruangan",
  "tier10.ts::menggema::3": "Sinonim: memantul",
  "tier10.ts::pemberat::1": "benda yang dipakai untuk menambah beban",
  "tier10.ts::pemberat::2": "alat untuk memperberat",
  "tier10.ts::pemberat::3": "Sinonim: penyeimbang",
  "tier10.ts::tergerak::1": "telah berpindah posisi; tiba-tiba berpindah",
  "tier10.ts::tergerak::2": "mendadak berpindah tempat",
  "tier10.ts::tergerak::3": "Sinonim: tersentuh",
  "tier10.ts::pengunci::1": "alat untuk mengaitkan agar terkait",
  "tier10.ts::pengunci::2": "penutup (karangan, dan sebagainya)",
  "tier10.ts::pengunci::3": "Sinonim: kunci pas",
  "tier10.ts::pelompat::1": "orang yang berpindah dengan lompatan dalam pertandingan",
  "tier10.ts::pelompat::2": "atlet yang pandai berpindah tempat",
  "tier10.ts::pelompat::3": "Sinonim: atlet lompat",
  "tier10.ts::terkikis::1": "sudah aus karena abrasi",
  "tier10.ts::terkikis::2": "sudah tergerus oleh air atau angin",
  "tier10.ts::terkikis::3": "Sinonim: tergerus",
  "tier10.ts::berbalas::1": "bertimbalan dengan; alang berjawab",
  "tier10.ts::berbalas::2": "saling berbalas pesan",
  "tier10.ts::berbalas::3": "Peribahasa: baik dibalas jasa dengan baik, jahat dibalas jasa dengan jahat",
  "tier10.ts::penambah::1": "sesuatu yang dipakai untuk menambah jumlah",
  "tier10.ts::penambah::2": "bahan yang menambah volume",
  "tier10.ts::penambah::3": "Sinonim: suplemen",
  "tier10.ts::sebangsa::1": "satu suku asal; sama asalnya",
  "tier10.ts::sebangsa::2": "satu kelompok etnis",
  "tier10.ts::sebangsa::3": "Sinonim: setanah air",
  "tier10.ts::penyamar::1": "orang yang berpura-pura",
  "tier10.ts::penyamar::2": "orang yang menyembunyikan identitas",
  "tier10.ts::penyamar::3": "Sinonim: penyamar",
  "tier10.ts::pencandu::1": "orang yang kecanduan",
  "tier10.ts::pencandu::2": "pecandu",
  "tier10.ts::pencandu::3": "Sinonim: peminum",
  "tier10.ts::pencukur::1": "alat untuk memotong rambut",
  "tier10.ts::pencukur::2": "alat untuk menghilangkan rambut",
  "tier10.ts::pencukur::3": "Sinonim: alat cukur",
  "tier10.ts::pencetak::1": "alat untuk membuat hasil cetak",
  "tier10.ts::pencetak::2": "mesin untuk menghasilkan duplikat",
  "tier10.ts::pencetak::3": "Sinonim: printer",
  "tier10.ts::penebang::1": "orang yang menebang pohon",
  "tier10.ts::penebang::2": "tukang memotong kayu",
  "tier10.ts::penebang::3": "Sinonim: tukang kayu",
  "tier10.ts::pencabut::1": "alat untuk melepaskan dari tempatnya",
  "tier10.ts::pencabut::2": "perangkat untuk menarik keluar",
  "tier10.ts::pencabut::3": "Sinonim: tang potong",
  "tier10.ts::pencopet::1": "tukang mengambil milik orang lain diam-diam",
  "tier10.ts::pencopet::2": "penjahat yang mengambil barang di kerumunan",
  "tier10.ts::pencopet::3": "Sinonim: maling",
  "tier10.ts::penjarah::1": "orang yang mengambil paksa",
  "tier10.ts::penjarah::2": "gerombolan yang merampas",
  "tier10.ts::penjarah::3": "Sinonim: perampok",
  "tier10.ts::pelontar::1": "alat untuk melemparkan benda",
  "tier10.ts::pelontar::2": "perangkat untuk menembakkan proyektil",
  "tier10.ts::pelontar::3": "Sinonim: kanon",
  "tier10.ts::seluncur::1": "olahraga di atas es dengan berjalan di atas pisau sepatu",
  "tier10.ts::seluncur::2": "perlombaan di atas es",
  "tier10.ts::seluncur::3": "Sinonim: ice skating",
  "tier10.ts::pemantik::1": "alat untuk menyulut api",
  "tier10.ts::pemantik::2": "benda untuk menyalakan api",
  "tier10.ts::pemantik::3": "Sinonim: korek api",
  "tier10.ts::berwujud::1": "ada bentuknya; nyata",
  "tier10.ts::berwujud::2": "berbentuk; nyata rupanya",
  "tier10.ts::berwujud::3": "Sinonim: nyata",
  "tier10.ts::penopang::1": "alat untuk menahan dari bawah",
  "tier10.ts::penopang::2": "tumpuan agar tetap tegak",
  "tier10.ts::penopang::3": "Sinonim: penyangga",
  "tier10.ts::berdecit::1": "berbunyi nyaring",
  "tier10.ts::berdecit::2": "bersuara tajam",
  "tier10.ts::berdecit::3": "Sinonim: berderit",
  "tier10.ts::berlebih::1": "sisa; berkelebihan",
  "tier10.ts::berlebih::2": "melebihi kebutuhan",
  "tier10.ts::berlebih::3": "Sinonim: surplus",
  "tier10.ts::penindas::1": "pihak yang bertindak kejam",
  "tier10.ts::penindas::2": "otoriter yang menekan",
  "tier10.ts::penindas::3": "Sinonim: penindas",
  "tier10.ts::penyedot::1": "alat untuk mengisap cairan",
  "tier10.ts::penyedot::2": "perangkat untuk menyedot",
  "tier10.ts::penyedot::3": "Sinonim: vakum",
  "tier10.ts::pengasih::1": "orang yang mencintai",
  "tier10.ts::pengasih::2": "orang yang penuh kasih sayang",
  "tier10.ts::pengasih::3": "Sinonim: pencinta",
  "tier10.ts::pencakar::1": "alat untuk menggores dengan kuku palsu",
  "tier10.ts::pencakar::2": "cakar untuk menggaruk",
  "tier10.ts::pencakar::3": "Sinonim: penggaruk",
  "tier10.ts::mencoret::1": "membubuhi tanda goresan",
  "tier10.ts::mencoret::2": "menggores secara acak",
  "tier10.ts::mencoret::3": "Sinonim: mencoreng",
  "tier10.ts::bertanda::1": "ada cirinya; ada tanda pengenalnya",
  "tier10.ts::bertanda::2": "memiliki ciri khas",
  "tier10.ts::bertanda::3": "Sinonim: berciri",
  "tier10.ts::berlipat::1": "dirangkap menjadi beberapa lapis",
  "tier10.ts::berlipat::2": "sudah dirangkap",
  "tier10.ts::berlipat::3": "Sinonim: berlipat-lipat",
  "tier10.ts::mencoret::1": "membubuhi tanda goresan",
  "tier10.ts::mencoret::2": "menggores secara acak",
  "tier10.ts::mencoret::3": "Sinonim: mencoreng",
  "tier10.ts::menggaji::1": "membayar pekerja",
  "tier10.ts::menggaji::2": "mempekerjakan orang dengan upah",
  "tier10.ts::menggaji::3": "Sinonim: memperkerjakan",
  "tier10.ts::beristri::1": "mempunyai pasangan hidup",
  "tier10.ts::beristri::2": "sudah menikah",
  "tier10.ts::beristri::3": "Sinonim: berkeluarga",
  "tier10.ts::berkotek::1": "mengeluarkan bunyi unggas",
  "tier10.ts::berkotek::2": "bersuara seperti ayam betina",
  "tier10.ts::berkotek::3": "Sinonim: berkokok",
  "tier10.ts::berjamur": "mulai ditumbuhi jamur karena lembap",
  "tier10.ts::bermerek::1": "mempunyai cap atau tanda",
  "tier10.ts::bermerek::2": "sudah ada cap pengenalnya",
  "tier10.ts::bermerek::3": "Sinonim: bermerek",
  "tier10.ts::merantai::1": "menahan dengan rantai",
  "tier10.ts::merantai::2": "mengaitkan dengan rantai besi",
  "tier10.ts::merantai::3": "Sinonim: memborgol",
};

// ============================================================
// Apply replacements
// ============================================================

for (const f of files) {
  const filepath = join(dir, f);
  const src = readFileSync(filepath, "utf8");
  
  const tupleRegex = /^(\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?)$/gm;
  const tuples = [];
  let match;
  while ((match = tupleRegex.exec(src)) !== null) {
    tuples.push({
      fullMatch: match[1],
      word: match[2],
      clue1: match[3],
      clue2: match[4],
      clue3: match[5],
    });
  }

  let modified = false;
  let newSrc = src;

  for (const t of tuples) {
    let newClues = [t.clue1, t.clue2, t.clue3];
    let changed = false;

    for (let idx = 1; idx <= 3; idx++) {
      const key = `${f}::${t.word}::${idx}`;
      if (REPLACEMENTS[key]) {
        newClues[idx - 1] = REPLACEMENTS[key];
        changed = true;
      }
    }

    if (changed) {
      const newTuple = `  ["${t.word}", "${newClues[0]}", "${newClues[1]}", "${newClues[2]}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      modified = true;
    }
  }

  if (modified && !DRY_RUN) {
    writeFileSync(filepath, newSrc, "utf8");
    console.log(`${f}: manual replacements applied`);
  } else if (!modified) {
    // skip
  } else {
    console.log(`${f}: would apply manual replacements`);
  }
}

console.log(`\nDone! Now run scan-real-leaks.mjs to verify.`);
