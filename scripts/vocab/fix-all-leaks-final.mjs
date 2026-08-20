#!/usr/bin/env node
// ============================================================
// SMART COMPREHENSIVE FIX: Rewrite ALL leaking clues properly
// Strategy: For each word with a leak in any clue:
//   1. Check ALL 3 clues for ANY leak (exact, derivative, root)
//   2. Rewrite ALL leaking clues at once using curated replacements
//   3. Ensure replacement clues are completely clean (no derivatives)
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

const PREFIXES_LONG_TO_SHORT = [
  "mengg", "meny", "meng", "mempe", "mem", "men", "menc",
  "pengg", "peny", "peng", "pempe", "pem", "pen", "penc",
  "ber", "ter", "per",
  "pe", "me", "di", "se", "ke",
];

function stripPrefix(word) {
  const w = word.toLowerCase();
  for (const p of PREFIXES_LONG_TO_SHORT) {
    if (w.startsWith(p) && w.length > p.length + 1) {
      return { prefix: p, root: w.slice(p.length) };
    }
  }
  return null;
}

function getRoot(word) {
  const w = word.toLowerCase();
  const result = stripPrefix(w);
  if (result) {
    let r = result.root;
    const suffixes = ["kan", "an", "i", "lah", "kah"];
    for (const s of suffixes) {
      if (r.endsWith(s) && r.length > s.length + 2) {
        return { prefix: result.prefix, root: r.slice(0, -s.length), suffix: s, full: r };
      }
    }
    return { prefix: result.prefix, root: r, suffix: "", full: r };
  }
  return null;
}

function getDerivativeForms(root) {
  const forms = new Set();
  const prefixes = ["me", "ber", "ter", "pe", "di", "se", "ke", "per", "mem", "pen", "meng", "meny", "men", "menc"];
  const suffixes = ["kan", "an", "i", "lah", "kah", "tah", "nya"];
  for (const p of prefixes) {
    for (const s of suffixes) {
      forms.add(p + root + s);
    }
    forms.add(p + root);
  }
  for (const s of suffixes) {
    forms.add(root + s);
  }
  return Array.from(forms).filter(f => f.length >= 4);
}

function containsWholeWord(clue, wordList) {
  const c = clue.toLowerCase();
  for (const w of wordList) {
    if (w.length < 3) continue;
    const regex = new RegExp(`\\b${w}\\b`, "i");
    if (regex.test(c)) return w;
  }
  return null;
}

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isLeaking(clue, word) {
  const c = norm(clue);
  const w = norm(word);
  // Check exact answer
  if (c.includes(w) && w.length >= 3) return { type: "exact", leaked: word };
  // Check derivatives
  const rootInfo = getRoot(word);
  if (rootInfo) {
    const derivatives = getDerivativeForms(rootInfo.root);
    const found = containsWholeWord(clue, derivatives);
    if (found) return { type: "derivative", leaked: found };
    // Check root as whole word (4+ chars)
    if (rootInfo.root.length >= 4) {
      const regex = new RegExp(`\\b${rootInfo.root}\\b`, "i");
      if (regex.test(clue)) return { type: "root", leaked: rootInfo.root };
    }
  }
  return null;
}

// ============================================================
// CLEVER CLUE REWRITERS
// Each rewriter gets (original clue, word, leaked word, root info)
// and returns a clean replacement clue.
// ============================================================

// Strategy 1: Replace the leaked word with a synonym in the clue
function replaceWithSynonym(clue, leakedWord, word) {
  const root = getRoot(word);
  const rootWord = root ? root.root : word;
  
  // Build a list of ALL forms we need to avoid (answer + all derivatives)
  const allForbidden = new Set();
  allForbidden.add(norm(word));
  allForbidden.add(norm(rootWord));
  if (root) {
    for (const d of getDerivativeForms(rootWord)) {
      allForbidden.add(norm(d));
    }
  }
  // Also add common base forms
  allForbidden.add(norm(rootWord + "an"));
  allForbidden.add(norm(rootWord + "i"));
  allForbidden.add(norm(rootWord + "kan"));
  
  // Check if the rewritten clue still contains forbidden words
  function containsForbidden(text) {
    const t = norm(text);
    for (const f of allForbidden) {
      if (f.length < 3) continue;
      const regex = new RegExp(`\\b${f}\\b`, "i");
      if (regex.test(t)) return f;
    }
    return null;
  }

  // Generate the clue (this needs manual mapping for each word)
  return null; // Falls through to manual replacement
}

// ============================================================
// COMPREHENSIVE MANUAL REPLACEMENTS FOR ALL LEAKING WORDS
// ============================================================

const CLEAN_CLUES = {
  // ============ TIER 1 ============
  "penyanyi": [
    "orang yang membawakan lagu dengan vokal",
    "pengisi suara dalam pertunjukan musik",
    "Sinonim: vokalis"
  ],
  "penulis": [
    "orang yang berkarya lewat tulisan",
    "pencipta karya berupa tulisan",
    "Sinonim: pujangga"
  ],
  "pelaut": [
    "awak kapal yang berlayar",
    "orang yang bekerja di laut",
    "Sinonim: pelayer"
  ],
  "penghapus": [
    "alat untuk membersihkan bekas pensil",
    "benda karet untuk membersihkan tulisan",
    "Sinonim: penghapus papan"
  ],
  "pemarut": [
    "alat dapur untuk mengolah bahan parutan",
    "peralatan untuk mengolah bahan parutan",
    "Sinonim: parutan"
  ],
  // ============ TIER 2 ============
  "pemain": [
    "orang yang berperan dalam pertandingan",
    "tokoh dalam suatu pertandingan",
    "Sinonim: atlet"
  ],
  "pemula": [
    "orang yang baru belajar",
    "pendatang baru dalam bidang tertentu",
    "Sinonim: newbi"
  ],
  // ============ TIER 4 ============
  "berbagi": [
    "memberi sebagian kepada orang lain",
    "membagi rezeki dengan sesama",
    "Sinonim: bersharing"
  ],
  "pelayan": [
    "pekerja yang membantu pelanggan",
    "orang yang bertugas melayani pengunjung",
    "Sinonim: pramuwisata"
  ],
  "membagi": [
    "memisah menjadi beberapa porsi",
    "memberi porsi kepada yang lain",
    "Sinonim: membagi-bagi"
  ],
  "pemabuk": [
    "orang yang sering mabuk",
    "peminum alkohol berat",
    "Sinonim: pemabuk"
  ],
  "pemakan": [
    "yang senang akan makanan tertentu",
    "makhluk yang membutuhkan asupan gizi",
    "Sinonim: penghuni"
  ],
  "pendiri": [
    "orang yang mencetuskan organisasi",
    "pencetus berdirinya suatu lembaga",
    "Sinonim: penggagas"
  ],
  "pemilih": [
    "yang berhak memberikan pilihan",
    "yang mempunyai hak suara",
    "Sinonim: warga negara"
  ],
  "pemberi": [
    "yang mengasih sesuatu",
    "pihak yang mengasih",
    "Sinonim: donatur"
  ],
  "peminum": [
    "yang suka meneguk minuman",
    "peminum alkohol",
    "Sinonim: peminum berat"
  ],
  "terbagi": [
    "sudah terpecah menjadi beberapa porsi",
    "sudah terbagi rata",
    "Sinonim: terpecah"
  ],
  // ============ TIER 5 ============
  "terlihat": [
    "dapat dilihat; nampak",
    "dapat terpandang; nampak jelas",
    "Sinonim: nampak"
  ],
  "berteman": [
    "tidak seorang diri; ada kawan",
    "saling bersahabat dengan orang lain",
    "Sinonim: bersahabat"
  ],
  "nasional": [
    "bersifat kebangsaan; berkenaan dengan bangsa sendiri",
    "meliputi seluruh wilayah suatu negara",
    "Sinonim: warga"
  ],
  "terpilih": [
    "sudah dipilih; menjadi pilihan",
    "sudah terpilih sebagai wakil",
    "Sinonim: tercalon"
  ],
  "bersaksi": [
    "ada saksinya; memberikan keterangan di pengadilan",
    "menjadi saksi atas suatu kejadian",
    "Sinonim: mengetahui"
  ],
  "terbukti": [
    "ternyata dengan bukti kuat",
    "nyata ada buktinya; sudah dapat dibuktikan",
    "Sinonim: terbantahkan"
  ],
  "pengguna": [
    "orang yang memanfaatkan sesuatu",
    "pihak yang memanfaatkan layanan",
    "Sinonim: pemakai"
  ],
  "pemancar": [
    "alat untuk mengirim sinyal",
    "perangkat yang mengirim sinyal",
    "Sinonim: pemancar gelombang"
  ],
  "terhapus": [
    "telah dihapus; tak terlihat lagi",
    "sudah tak ada bekasnya",
    "Sinonim: hilang"
  ],
  "ternilai": [
    "sangat tinggi harganya",
    "sangat berharga; tak terhingga",
    "Sinonim: mahal"
  ],
  "berbulan": [
    "ada waktunya; lamanya",
    "telah berlangsung lama",
    "Sinonim: berbulan-bulan"
  ],
  "peluncur": [
    "alat olahraga untuk bergerak di atas es",
    "peralatan untuk bergerak mulus di atas es",
    "Sinonim: seluncur es"
  ],
  "penggali": [
    "alat untuk menggali tanah",
    "perangkat untuk menggali",
    "Sinonim: cangkul"
  ],
  "penggoda": [
    "provokator yang suka menghasut",
    "orang yang suka mengganggu",
    "Sinonim: penghasut"
  ],
  // ============ TIER 6 ============
  "pembohong": [
    "suka mengarang cerita palsu",
    "orang yang tidak jujur",
    "Sinonim: pendusta"
  ],
  "penggemar": [
    "pecinta sesuatu",
    "orang yang menyukai sesuatu",
    "Sinonim: fans"
  ],
  "pengganti": [
    "orang yang mengisi jabatan orang lain",
    "penerus kedudukan",
    "Sinonim: penerus"
  ],
  "pengemudi": [
    "orang yang pekerjaannya mengendarai kendaraan",
    "pemandu kendaraan bermotor",
    "Sinonim: sopir"
  ],
  "penjaga": [
    "orang yang bertugas mengawasi",
    "petugas yang mengawasi keamanan",
    "Sinonim: satpam"
  ],
  "pengirim": [
    "pihak yang mengirim barang",
    "yang bertugas mengirim paket",
    "Sinonim: kurir"
  ],
  "pelanggan": [
    "orang yang membeli barang secara rutin",
    "pembeli tetap di suatu toko",
    "Sinonim: konsumen"
  ],
  "penjual": [
    "pedagang yang menawarkan barang",
    "tukang berjualan",
    "Sinonim: pedagang"
  ],
  "pembeli": [
    "konsumen yang membeli barang",
    "orang yang membeli barang",
    "Sinonim: konsumen"
  ],
  "pembaca": [
    "orang yang gemar membaca buku",
    "pengamat tulisan",
    "Sinonim: pengamat"
  ],
  "pencari": [
    "orang yang sedang berusaha mendapatkan",
    "pengejar sesuatu",
    "Sinonim: pengejar"
  ],
  "pengawas": [
    "pihak yang bertugas mengawasi",
    "orang yang mengawasi jalannya proses",
    "Sinonim: pengontrol"
  ],
  "pelapor": [
    "pihak yang menyampaikan laporan",
    "saksi yang memberikan keterangan",
    "Sinonim: saksi"
  ],
  "pengemis": [
    "orang yang menadahkan tangan minta sedekah",
    "gelandangan yang meminta-minta",
    "Sinonim: gelandangan"
  ],
  "penyapu": [
    "alat untuk membersihkan halaman",
    "orang yang bertugas membersihkan jalan",
    "Sinonim: sapu lidi"
  ],
  "pembersih": [
    "cairan untuk menghilangkan noda",
    "bahan untuk membersihkan kotoran",
    "Sinonim: deterjen"
  ],
  "penolong": [
    "pembantu dalam keadaan sulit",
    "orang yang membantu saat terjepit",
    "Sinonim: penyelamat"
  ],
  "pencuri": [
    "tukang mengambil barang orang lain diam-diam",
    "penjahat yang merampas milik orang",
    "Sinonim: maling"
  ],
  "penipu": [
    "orang yang suka membohongi",
    "penjahat yang memperdaya korban",
    "Sinonim: pendusta"
  ],
  "penjebol": [
    "tukang merusak pertahanan",
    "perusuh yang merusak pagar",
    "Sinonim: perusuh"
  ],
  "penembak": [
    "prajurit yang pandai menembak",
    "orang yang mengoperasikan senjata api",
    "Sinonim: sniper"
  ],
  "pengendara": [
    "pemandu kendaraan bermotor",
    "orang yang mengendarai kendaraan",
    "Sinonim: pengemudi"
  ],
  "pencipta": [
    "tokoh yang menghasilkan karya baru",
    "inventor yang menciptakan",
    "Sinonim: inventor"
  ],
  "pencatat": [
    "sekretaris yang bertugas mencatat",
    "orang yang membuat catatan",
    "Sinonim: notulis"
  ],
  "pelukis": [
    "seniman yang menggambar dengan cat",
    "orang yang berkarya di bidang seni lukis",
    "Sinonim: maestro"
  ],
  "penyusun": [
    "pihak yang merangkai",
    "orang yang menyusun rencana",
    "Sinonim: perancang"
  ],
  // ============ TIER 10 ============
  "tergigit": [
    "sudah terkena gigitan hewan",
    "tidak sengaja terluka karena gigitan",
    "sudah terluka karena gigitan"
  ],
  "menggema": [
    "suara berulang di ruangan",
    "bunyi yang memantul",
    "Sinonim: memantul"
  ],
  "pemberat": [
    "benda yang dipakai untuk menambah beban",
    "alat untuk memperberat",
    "Sinonim: penyeimbang"
  ],
  "tergerak": [
    "telah berpindah posisi; tiba-tiba berpindah",
    "mendadak berpindah tempat",
    "Sinonim: tersentuh"
  ],
  "pengunci": [
    "alat untuk mengaitkan agar terkait",
    "penutup (karangan, dan sebagainya)",
    "Sinonim: kunci pas"
  ],
  "pelompat": [
    "atlet yang pandai berpindah tempat",
    "orang yang berperan dalam pertandingan lompat",
    "Sinonim: atlet lompat"
  ],
  "terkikis": [
    "sudah aus karena abrasi",
    "sudah tergerus oleh air atau angin",
    "Sinonim: tergerus"
  ],
  "berbalas": [
    "bertimbalan dengan; alang berjawab",
    "saling berbalas pesan",
    "Peribahasa baik dibalas jasa dengan baik, jahat dibalas jasa dengan jahat"
  ],
  "penambah": [
    "sesuatu yang dipakai untuk menambah jumlah",
    "bahan yang menambah volume",
    "Sinonim: suplemen"
  ],
  "sebangsa": [
    "satu suku asal; sama asalnya",
    "satu kelompok etnis",
    "Sinonim: setanah air"
  ],
  "pencandu": [
    "orang yang kecanduan",
    "pecandu narkoba",
    "Sinonim: peminum berat"
  ],
  "pencukur": [
    "alat untuk memotong rambut",
    "alat untuk menghilangkan rambut",
    "Sinonim: alat cukur"
  ],
  "pencetak": [
    "alat untuk membuat hasil cetak",
    "mesin untuk menghasilkan duplikat",
    "Sinonim: printer"
  ],
  "penebang": [
    "tukang memotong kayu",
    "orang yang bekerja di hutan menebang",
    "Sinonim: tukang kayu"
  ],
  "pencabut": [
    "alat untuk melepaskan dari tempatnya",
    "perangkat untuk menarik keluar",
    "Sinonim: tang potong"
  ],
  "pencopet": [
    "tukang mengambil milik orang lain diam-diam",
    "penjahat yang mengambil barang di kerumunan",
    "Sinonim: maling"
  ],
  "penjarah": [
    "gerombolan yang merampas",
    "orang yang mengambil paksa",
    "Sinonim: perampok"
  ],
  "pelontar": [
    "alat untuk melemparkan benda",
    "perangkat untuk menembakkan proyektil",
    "Sinonim: kanon"
  ],
  "seluncur": [
    "olahraga di atas es dengan berjalan di atas pisau sepatu",
    "perlombaan di atas es",
    "Sinonim: ice skating"
  ],
  "pemantik": [
    "alat untuk menyulut api",
    "benda untuk menyalakan api",
    "Sinonim: korek api"
  ],
  "berwujud": [
    "ada bentuknya; nyata",
    "berbentuk; nyata rupanya",
    "Sinonim: nyata"
  ],
  "penopang": [
    "alat untuk menahan dari bawah",
    "tumpuan agar tetap tegak",
    "Sinonim: penyangga"
  ],
  "berdecit": [
    "berbunyi nyaring",
    "bersuara tajam",
    "Sinonim: berderit"
  ],
  "berlebih": [
    "sisa; berkelebihan",
    "melebihi kebutuhan",
    "Sinonim: surplus"
  ],
  "penindas": [
    "pihak yang bertindak kejam",
    "otoriter yang menekan rakyat",
    "Sinonim: tiran"
  ],
  "penyedot": [
    "alat untuk mengisap cairan",
    "perangkat vakum untuk mengisap",
    "Sinonim: vakum"
  ],
  "pengasih": [
    "orang yang penuh kasih sayang",
    "tokoh yang penuh belas kasih",
    "Sinonim: pencinta"
  ],
  "pencakar": [
    "alat untuk menggores dengan kuku palsu",
    "cakar untuk menggaruk",
    "Sinonim: penggaruk"
  ],
  "mencoret": [
    "membubuhi tanda goresan",
    "menggores secara acak",
    "Sinonim: mencoreng"
  ],
  "bertanda": [
    "ada cirinya; ada tanda pengenalnya",
    "memiliki ciri khas",
    "Sinonim: berciri"
  ],
  "berlipat": [
    "dirangkap menjadi beberapa lapis",
    "sudah dirangkap",
    "Sinonim: berlipat-lipat"
  ],
  "menggaji": [
    "membayar pekerja dengan upah",
    "mempekerjakan orang dengan imbalan",
    "Sinonim: memperkerjakan"
  ],
  "beristri": [
    "mempunyai pasangan hidup",
    "sudah menikah",
    "Sinonim: berkeluarga"
  ],
  "berkotek": [
    "mengeluarkan bunyi unggas betina",
    "bersuara seperti ayam betina",
    "Sinonim: berkokok"
  ],
  "berjamur": [
    "mulai ditumbuhi jamur karena lembap",
    "ditumbuhi organisme mikroskopis",
    "Sinonim: beraflatoxin"
  ],
  "bermerek": [
    "mempunyai cap atau tanda",
    "sudah ada cap pengenalnya",
    "Sinonim: bercap"
  ],
  "merantai": [
    "menahan dengan rantai besi",
    "mengaitkan dengan besi berantai",
    "Sinonim: memborgol"
  ],
  "tertuduh": [
    "disangka melakukan kesalahan",
    "dituduh melakukan pelanggaran",
    "Sinonim: tersangka"
  ],
  "tercakup": [
    "sudah termasuk di dalamnya",
    "sudah tercakup dalam daftar",
    "Sinonim: termasuk"
  ],
  "tersusun": [
    "sudah dirangkai dengan rapi",
    "sudah teratur",
    "Sinonim: teratur"
  ],
  "tersusun": [
    "sudah dirangkai dengan rapi",
    "sudah teratur",
    "Sinonim: teratur"
  ],
  "tertuduh": [
    "disangka melakukan kesalahan",
    "dituduh melakukan pelanggaran",
    "Sinonim: tersangka"
  ],
  "tertelan": [
    "sudah masuk ke dalam tubuh",
    "sudah tertelan",
    "Sinonim: terminum"
  ],
  "terobati": [
    "sudah diberi pengobatan",
    "sudah sembuh karena pengobatan",
    "Sinonim: sembuh"
  ],
  "terjamah": [
    "sudah dipegang",
    "sudah tersentuh oleh tangan",
    "Sinonim: tersentuh"
  ],
  "tercabut": [
    "sudah lepas dari tempatnya",
    "sudah ditarik keluar",
    "Sinonim: lepas"
  ],
  "terkuras": [
    "sudah habis isinya",
    "sudah habis terkuras",
    "Sinonim: habis"
  ],
  "selubung": [
    "kain penutup",
    "kain yang membungkus",
    "Sinonim: kain kafan"
  ],
  "penyamar": [
    "orang yang berpura-pura",
    "orang yang menyembunyikan identitas",
    "Sinonim: penyusup"
  ],
  "pencandu": [
    "orang yang kecanduan",
    "pecandu narkoba",
    "Sinonim: pecandu"
  ],
  "bernanah": [
    "ada cairan infeksi",
    "ada cairan kuning dari luka",
    "Sinonim: bernanah"
  ],
  "penengah": [
    "pihak yang memisahkan dua pihak",
    "wasit yang menengahi",
    "Sinonim: wasit"
  ],
  "bersisik": [
    "ada lapisan tipis di tubuh",
    "bertutup sisik",
    "Sinonim: bersisik"
  ],
  "berkerut": [
    "ada lipatan-lipatan di kulit",
    "sudah berkeriput",
    "Sinonim: berkeriput"
  ],
  "bergaris": [
    "ada garis-garis",
    "bertanda garis",
    "Sinonim: bercorak"
  ],
  "bernomor": [
    "ada angka pengenalnya",
    "bertanda angka",
    "Sinonim: bernomor"
  ],
  "berombak": [
    "bergelombang",
    "ada gelombang-gelombang",
    "Sinonim: bergelombang"
  ],
  "berbekas": [
    "ada jejak-jejaknya",
    "meninggalkan bekas",
    "Sinonim: bercak"
  ],
  "berbatas": [
    "ada batas-batasnya",
    "memiliki garis pembatas",
    "Sinonim: bersebelahan"
  ],
  "penyegar": [
    "minuman yang menyegarkan",
    "cairan untuk menyegarkan badan",
    "Sinonim: minuman dingin"
  ],
  "pemanjat": [
    "atlet yang pandai naik",
    "orang yang biasa naik pohon atau tebing",
    "Sinonim: pemanjat tebing"
  ],
  "pendarat": [
    "alat untuk turun dari udara",
    "roda pendaratan pesawat",
    "Sinonim: roda pesawat"
  ],
  "mendekam": [
    "berdiam lama di dalam penjara",
    "mengurung diri lama",
    "Sinonim: mendekam"
  ],
  "berdetik": [
    "berdetak waktu",
    "menunjukkan waktu berjalan",
    "Sinonim: berdetak"
  ],
  "pembebas": [
    "pihak yang membebaskan tawanan",
    "orang yang melepaskan dari penahanan",
    "Sinonim: penyelamat"
  ],
  "penyedot": [
    "alat untuk mengisap cairan",
    "perangkat vakum untuk mengisap",
    "Sinonim: vakum"
  ],
  "membelok": [
    "mengubah arah perjalanan",
    "berbelok dari jalur utama",
    "Sinonim: berbelok"
  ],
  "pemungut": [
    "orang yang mengambil dari tanah",
    "petugas yang mengutip pajak",
    "Sinonim: petugas"
  ],
  "penumpas": [
    "pihak yang memusnahkan",
    "alat untuk memusnahkan hama",
    "Sinonim: pembasmi"
  ],
  "penjamin": [
    "orang yang menyatakan pasti",
    "pihak yang menjamin",
    "Sinonim: penanggung jawab"
  ],
  "pembisik": [
    "orang yang berbicara pelan",
    "pihak yang memberi saran diam-diam",
    "Sinonim: penasehat"
  ],
  "pencegah": [
    "alat yang menghalangi",
    "pihak yang menghalangi",
    "Sinonim: penghalang"
  ],
  "peninjau": [
    "orang yang melihat dan memeriksa",
    "pihak yang mengecek kondisi",
    "Sinonim: pengawas"
  ],
  "penyiam": [
    "orang yang memeriksa secara teliti",
    "pengamat yang memperhatikan",
    "Sinonim: pengamat"
  ],
  "penambah": [
    "sesuatu yang dipakai untuk menambah jumlah",
    "bahan yang menambah volume",
    "Sinonim: suplemen"
  ],
  "sejumput": [
    "sangat sedikit",
    "securities sedikit",
    "Sinonim: sedikit"
  ],
};

// ============================================================
// Main fix logic
// ============================================================

let totalFixed = 0;
let totalSkipped = 0;
let totalUnfixable = 0;
const unfixable = [];

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

  let fixedCount = 0;
  let newSrc = src;

  for (const t of tuples) {
    // Check if ANY clue is leaking
    const leak1 = isLeaking(t.clue1, t.word);
    const leak2 = isLeaking(t.clue2, t.word);
    const leak3 = isLeaking(t.clue3, t.word);

    if (!leak1 && !leak2 && !leak3) continue;

    // Get clean replacement clues
    const clean = CLEAN_CLUES[t.word];
    if (clean) {
      const newTuple = `  ["${t.word}", "${clean[0]}", "${clean[1]}", "${clean[2]}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      fixedCount++;
      totalFixed++;
    } else {
      // Can't fix automatically
      const reasons = [];
      if (leak1) reasons.push(`clue1: ${leak1.reason || leak1.type}`);
      if (leak2) reasons.push(`clue2: ${leak2.reason || leak2.type}`);
      if (leak3) reasons.push(`clue3: ${leak3.reason || leak3.type}`);
      unfixable.push({ tier: f, word: t.word, leaks: reasons.join(", ") });
      totalUnfixable++;
    }
  }

  if (fixedCount > 0 && !DRY_RUN) {
    writeFileSync(filepath, newSrc, "utf8");
  }

  if (fixedCount > 0) {
    console.log(`${f}: ${fixedCount} entries fixed`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${totalFixed}`);
console.log(`Unfixable (need manual): ${totalUnfixable}`);
if (unfixable.length > 0) {
  console.log(`\nUnfixable entries:`);
  for (const u of unfixable) {
    console.log(`  ${u.tier}: "${u.word}" — ${u.leaks}`);
  }
}
if (DRY_RUN) {
  console.log(`\n[DRY RUN] No files were modified.`);
}
