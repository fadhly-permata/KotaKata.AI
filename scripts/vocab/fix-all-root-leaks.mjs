#!/usr/bin/env node
// ============================================================
// Fix ALL root leaks across all tier vocabulary files.
// Root leaks = clues that contain derivative forms of the answer
// (e.g., "menyanyikan" for answer "penyanyi")
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");
const isDryRun = process.argv.includes("--dry-run");

// ============================================================
// Indonesian prefix/suffix patterns
// ============================================================
const PREFIXES = ["meng", "meny", "mem", "pen", "men", "menc", "ber", "ter", "per", "pe", "me", "di", "se", "ke"];
const SUFFIXES = ["kan", "an", "i", "lah", "kah", "tah", "nya"];

function getRoot(word) {
  const w = word.toLowerCase();
  for (const p of ["meng", "meny", "mem", "pen", "men", "menc", "ber", "ter", "per", "pe", "me", "di", "se", "ke"]) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      return { prefix: p, root: w.slice(p.length) };
    }
  }
  return null;
}

function getDerivativeForms(root) {
  const forms = new Set();
  for (const p of PREFIXES) {
    for (const s of SUFFIXES) {
      forms.add(p + root + s);
    }
    forms.add(p + root);
  }
  for (const s of SUFFIXES) {
    forms.add(root + s);
  }
  return Array.from(forms).filter(f => f.length >= 4);
}

function containsWholeWord(clue, wordList) {
  const c = clue.toLowerCase();
  for (const w of wordList) {
    if (w.length < 3) continue;
    const regex = new RegExp(`\\b${w}\\b`, "i");
    if (regex.test(c)) {
      return w;
    }
  }
  return null;
}

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// COMPREHENSIVE FIX MAP — All leaks found in scan
// Format: { "word": { clue_1: "new clue", clue_2: "new clue", clue_3: "new clue" } }
// Only include clues that need fixing (non-leaking clues are kept as-is)
// ============================================================
const FIXES = {
  // ═══════════════ TIER 1 ═══════════════
  "penyanyi": {
    clue_1: "orang yang vokal dalam paduan suara atau pertunjukan",
    clue_2: "penghibur yang suaranya merdu"
  },
  "penulis": {
    clue_1: "pengarang buku atau karya sastra",
    clue_2: "orang yang menuangkan gagasan ke atas kertas"
  },
  "pelaut": {
    clue_1: "awak kapal yang berlayar di laut",
    clue_2: "orang yang bekerja di atas kapal"
  },
  "penghapus": {
    clue_1: "alat karet untuk membersihkan coretan pensil",
    clue_2: "benda yang dipakai untuk melenyapkan bekas tulisan"
  },
  "pemarut": {
    clue_1: "alat bergerigi untuk memotong tipis sayuran",
    clue_2: "perangkat dapur untuk menghaluskan bahan makanan"
  },
  "beruang": {
    clue_3: "Sinonim: bruin"
  },
  "sendok": {
    clue_1: "alat makan berbentuk sendok untuk mengambil makanan",
    clue_2: "perakapan makanan berbentuk cekung di ujung"
  },
  "pelangi": {
    clue_1: "busur warna-warni di langit setelah turun hujan",
    clue_2: " fenomena optik berupa spektrum warna di awan"
  },
  "pemuda": {
    clue_1: "laki-laki dalam masa remaja hingga dewasa muda",
    clue_2: "generasi muda yang energik"
  },
  "perawat": {
    clue_1: "tenaga kesehatan yang merawat pasien di rumah sakit",
    clue_2: "petugas medis yang membantu dokter"
  },
  "petani": {
    clue_1: "orang yang menggarap sawah atau ladang",
    clue_2: "profesi pengolah lahan pertanian",
    clue_3: "Sinonim: tani bumi"
  },
  "terima": {
    clue_1: "menerima sesuatu yang diberikan",
    clue_2: "mendapatkan kiriman",
    clue_3: "Antonim: beri"
  },
  "keluar": {
    clue_1: "bergerak ke arah luar dari suatu tempat",
    clue_2: "meninggalkan suatu ruangan"
  },
  "seduh": {
    clue_1: "membuat minuman dengan cara menyeduh air panas",
    clue_2: "proses merendam teh atau kopi dengan air panas"
  },
  "peluk": {
    clue_1: "merangkul dengan kedua lengan",
    clue_2: "menggapit erat dengan tangan",
    clue_3: "Sinonim: rangkul"
  },
  "segar": {
    clue_1: "fresh; tidak layu atau segar",
    clue_2: "merasa bugar dan sehat",
    clue_3: "Antonim: lesu"
  },
  "merah": {
    clue_1: "warna seperti darah",
    clue_2: "warna buah semangka",
    clue_3: "Antonim: hitam"
  },
  "berjinjit": {
    clue_1: "berdiri dengan ujung kaki saja",
    clue_2: "mengangkat badan dengan ujung kaki",
    clue_3: "Sinonim: mencicit"
  },

  // ═══════════════ TIER 2 ═══════════════
  "sejauh": {
    clue_1: "sampai jarak tertentu",
    clue_2: "seberapa jauh jaraknya"
  },
  "pemain": {
    clue_1: "orang yang turut serta dalam suatu pertandingan",
    clue_2: "peserta yang berlaga dalam olahraga"
  },
  "seumur": {
    clue_1: "selama masa hidup",
    clue_2: "sepanjang usia"
  },
  "pelaku": {
    clue_1: "orang yang melakukan suatu perbuatan",
    clue_2: "tokoh dalam suatu kejadian"
  },
  "penari": {
    clue_1: "orang yang menari dalam pertunjukan",
    clue_2: "penampil seni tari"
  },
  "semula": {
    clue_1: "pada awalnya; mula-mula",
    clue_2: "sebelumnya; pada permulaan"
  },
  "pemula": {
    clue_1: "orang yang baru belajar dalam suatu bidang",
    clue_2: "orang yang baru mulai berkecimpung"
  },
  "terisi": {
    clue_1: "sudah penuh berisi",
    clue_2: "sudah terisi barang atau isi"
  },
  "bermain": {
    clue_1: "bersenang-senang dengan suatu kegiatan",
    clue_2: "melakukan aktivitas rekreasi"
  },
  "sekali": {
    clue_1: "satu kali; pernah",
    clue_2: "hanya satu waktu saja"
  },
  "setiap": {
    clue_1: "masing-masing tanpa terkecuali",
    clue_2: "tiap-tiap"
  },
  "sesal": {
    clue_1: "menyesali perbuatan yang telah lampau",
    clue_2: "merasa tidak rela atas sesuatu yang telah terjadi"
  },
  "sehari": {
    clue_1: "satu masa matahari terbenam hingga terbit lagi",
    clue_2: "dua puluh empat jam"
  },
  "berhak": {
    clue_1: "memiliki kuasa atau kewenangan",
    clue_2: "dapat menuntut sesuatu yang semestinya"
  },
  "senior": {
    clue_1: "orang yang lebih tua atau lebih lama dalam suatu jabatan",
    clue_2: "orang yang lebih berpengalaman"
  },
  "persen": {
    clue_1: "satuan untuk menyatakan bagian dari seratus",
    clue_2: "simbol % dalam perhitungan"
  },
  "berisi": {
    clue_1: "memiliki isi atau muatan",
    clue_2: "terdapat sesuatu di dalamnya"
  },
  "seribu": {
    clue_1: "angka 1000",
    clue_2: "sepuluh ratus"
  },
  "sesama": {
    clue_1: "satu golongan atau jenis yang sama",
    clue_2: "saling antara sesuatu yang setara"
  },
  "terisi": {
    clue_1: "sudah penuh berisi",
    clue_2: "sudah terisi barang atau isi"
  },

  // ═══════════════ TIER 3 ═══════════════
  "berada": {
    clue_1: "berkedudukan di suatu tempat",
    clue_2: "berposisi atau terletak"
  },
  "sebaik": {
    clue_1: "sama bagusnya dengan",
    clue_2: "setara kualitasnya dengan"
  },
  "sekuat": {
    clue_1: "sama kuatnya dengan",
    clue_2: "setara tenaganya dengan"
  },
  "pelari": {
    clue_1: "orang yang berlari cepat dalam perlombaan",
    clue_2: "atlet cabang lari"
  },
  "serasa": {
    clue_1: "seolah-olah sedang dirasai",
    clue_2: "bagai sedang merasakan"
  },
  "penemu": {
    clue_1: "orang pertama yang mengungkap sesuatu yang baru",
    clue_2: "sosok yang menemukan sesuatu sebelum orang lain"
  },
  "berasa": {
    clue_1: "mengalami rasa tertentu di lidah",
    clue_2: "merasakan suatu citarasa",
    clue_3: "Sinonim: terasa"
  },
  "berjinjit": {
    clue_1: "berdiri dengan ujung kaki saja",
    clue_2: "mengangkat badan dengan ujung kaki",
    clue_3: "Sinonim: mencicit"
  },

  // ═══════════════ TIER 4 ═══════════════
  "membuka": {
    clue_1: "membiarkan terbuka; menjadikan tidak tertutup",
    clue_2: "memulai suatu acara atau kegiatan"
  },
  "petugas": {
    clue_1: "pegawai yang ditugaskan untuk suatu pekerjaan",
    clue_2: "orang yang menjalankan tugas resmi"
  },
  "penjaga": {
    clue_1: "orang yang menjaga keamanan atau ketertiban",
    clue_2: "sosok yang bertanggung jawab atas pengawasan"
  },
  "berbuat": {
    clue_1: "melakukan sesuatu perbuatan",
    clue_2: "bertindak atau melakukan tindakan"
  },
  "berbagi": {
    clue_1: "membagi kepada orang lain",
    clue_2: "memberikan sebagian milik kita",
    clue_3: "Sinonim: membagi"
  },
  "pencuri": {
    clue_1: "orang yang mengambil hak orang lain secara diam-diam",
    clue_2: "tokoh kriminal yang mengambil barang bukan miliknya"
  },
  "setahun": {
    clue_1: "satu masa peredaran bumi mengelilingi matahari",
    clue_2: "dua belas bulan lamanya"
  },
  "pemilik": {
    clue_1: "orang yang memiliki sesuatu",
    clue_2: "orang yang punya atas suatu benda"
  },
  "pelayan": {
    clue_1: "pekerja yang melayani tamu di restoran atau hotel",
    clue_2: "pramuwisma yang membantu kebutuhan orang lain"
  },
  "pelatih": {
    clue_1: "orang yang melatih atlet atau tim olahraga",
    clue_2: "instruktur yang membimbing latihan"
  },
  "secepat": {
    clue_1: "sama cepatnya dengan",
    clue_2: "setara kelajuannya dengan"
  },
  "merekam": {
    clue_1: "mengabadikan suara atau gambar dengan alat",
    clue_2: "menggunakan perekam untuk menyimpan data"
  },
  "terikat": {
    clue_1: "sudah diikat dengan tali atau tali",
    clue_2: "tergantung pada suatu kewajiban"
  },
  "terbuat": {
    clue_1: "dibuat dari bahan tertentu",
    clue_2: "tercipta dari suatu materi"
  },
  "penutup": {
    clue_1: "bagian akhir dari suatu rangkaian",
    clue_2: "benda yang dipakai untuk menutup"
  },
  "pembuat": {
    clue_1: "orang yang membuat atau menciptakan sesuatu",
    clue_2: "pengrajin atau produsen"
  },
  "pejuang": {
    clue_1: "orang yang berjuang untuk suatu tujuan",
    clue_2: "tokoh yang berkorban demi kemerdekaan"
  },
  "pejabat": {
    clue_1: "orang yang memegang jabatan pemerintahan",
    clue_2: "pegawai tingkat tinggi dalam suatu lembaga"
  },
  "pecandu": {
    clue_1: "orang yang kecanduan sesuatu",
    clue_2: "peminum atau pemakai narkoba"
  },
  "menguji": {
    clue_1: "mengadakan ujian atau tes",
    clue_2: "melakukan pengujian terhadap sesuatu"
  },
  "peledak": {
    clue_1: "bahan yang dapat meledak",
    clue_2: "zat kimia yang bersifat eksplosif"
  },
  "pemadam": {
    clue_1: "alat atau petugas untuk memadamkan api",
    clue_2: "unit yang menangani kebakaran"
  },
  "penjual": {
    clue_1: "orang yang menjual barang dagangan",
    clue_2: "pedagang atau toko"
  },
  "terduga": {
    clue_1: "yang disangka atau diduga",
    clue_2: "diduga kuat sebagai pelaku"
  },
  "sejenis": {
    clue_1: "satu golongan atau kategori yang sama",
    clue_2: "bertipe atau berkarakter serupa"
  },
  "membagi": {
    clue_1: "memisah menjadi beberapa bagian",
    clue_2: "memberikan hak bagi orang lain"
  },
  "semudah": {
    clue_1: "sama gampangnya dengan",
    clue_2: "setara tingkat kesulitannya dengan"
  },
  "pembawa": {
    clue_1: "orang atau sesuatu yang membawa barang",
    clue_2: "pengangkut atau kurir"
  },
  "pelacak": {
    clue_1: "alat atau orang yang melacak sesuatu",
    clue_2: "perangkat penjejak lokasi"
  },
  "pewaris": {
    clue_1: "orang yang berhak menerima warisan",
    clue_2: "ahli waris dari suatu harta"
  },
  "pemabuk": {
    clue_1: "orang yang sering mabuk minuman keras",
    clue_2: "pecandu alkohol"
  },
  "pembeli": {
    clue_1: "orang yang membeli barang di toko",
    clue_2: "konsumen atau pelanggan"
  },
  "pencari": {
    clue_1: "orang yang mencari sesuatu yang hilang",
    clue_2: "penelusur atau penjejak"
  },
  "seiring": {
    clue_1: "bersamaan dengan; beriringan",
    clue_2: "sejalan dengan perkembangan"
  },
  "berjaga": {
    clue_1: "waspada menjaga keamanan",
    clue_2: "tidak tidur untuk mengawasi"
  },
  "pembuka": {
    clue_1: "bagian awal dari suatu acara",
    clue_2: "orang atau benda yang membuka"
  },
  "penegak": {
    clue_1: "orang yang menegakkan aturan atau hukum",
    clue_2: "aparat penegak hukum"
  },
  "berjaya": {
    clue_1: "meraih kemenangan atau keberhasilan",
    clue_2: "sukses dalam suatu usaha"
  },
  "pemukul": {
    clue_1: "alat untuk memukul bola dalam olahraga",
    clue_2: "tongkat atau raket olahraga"
  },
  "pembaca": {
    clue_1: "orang yang membaca buku atau teks",
    clue_2: "pecinta literasi"
  },
  "pembela": {
    clue_1: "orang yang membela kepentingan orang lain",
    clue_2: "kuasa hukum yang membela klien"
  },
  "pemakan": {
    clue_1: "hewan atau orang yang memakan makanan tertentu",
    clue_2: "konsumen jenis makanan tertentu"
  },
  "pendiri": {
    clue_1: "orang yang mendirikan organisasi atau lembaga",
    clue_2: "sosok pencetus berdirinya suatu instansi"
  },
  "bermula": {
    clue_1: "berasal dari; permulaan",
    clue_2: "awal mula suatu kejadian"
  },
  "berfoto": {
    clue_1: "berpose di depan kamera",
    clue_2: "mengabadikan gambar diri"
  },
  "pemeran": {
    clue_1: "orang yang memerankan tokoh dalam film atau sandiwara",
    clue_2: "aktor atau aktris"
  },
  "pelukis": {
    clue_1: "orang yang berkarya melukis gambar",
    clue_2: "seniman yang menggunakan cat dan kanvas"
  },
  "bersiul": {
    clue_1: "mengeluarkan bunyi pelan dari mulut",
    clue_2: "mengeluarkan nada-nada dari bibir"
  },
  "tergoda": {
    clue_1: "terpengaruh oleh bujukan atau rayuan",
    clue_2: "merasa tertarik akan suatu godaan"
  },
  "seiring": {
    clue_1: "bersamaan dengan; beriringan",
    clue_2: "sejalan dengan perkembangan"
  },

  // ═══════════════ TIER 5 ═══════════════
  "berlaku": {
    clue_1: "berlaku sesuai dengan peraturan",
    clue_2: "bersifat resmi atau berlaku umum"
  },
  "berkualitas": {
    clue_1: "memiliki mutu atau kualitas yang baik",
    clue_2: "sangat bagus mutunya"
  },
  "terkenal": {
    clue_1: "dikenal oleh banyak orang",
    clue_2: "sudah populer di masyarakat"
  },
  "berkembang": {
    clue_1: "tumbuh dan maju dari waktu ke waktu",
    clue_2: "mengalami kemajuan yang pesat"
  },
  "terpengaruh": {
    clue_1: "terkena pengaruh dari sesuatu",
    clue_2: "terpengaruh oleh keadaan sekitar"
  },
  "terbentuk": {
    clue_1: "sudah terbentuk atau tercipta",
    clue_2: "terbentuk dari gabungan beberapa bagian"
  },
  "bergabung": {
    clue_1: "ikut serta dalam suatu kelompok",
    clue_2: "menjadi anggota dari suatu organisasi"
  },
  "berkantor": {
    clue_1: "bertugas atau bekerja di kantor",
    clue_2: "berpusat kegiatan di gedung perkantoran"
  },
  "terselenggara": {
    clue_1: "sudah dilaksanakan dengan baik",
    clue_2: "berhasil diselenggarakan"
  },
  "terakreditasi": {
    clue_1: "sudah diakui oleh lembaga resmi",
    clue_2: "memiliki pengakuan dari instansi berwenang"
  },
  "terkemuka": {
    clue_1: "sangat terkenal dan diakui",
    clue_2: "menjadi panutan dalam bidang tertentu"
  },
  "terpercaya": {
    clue_1: "dipercaya oleh banyak orang",
    clue_2: "andal dan dapat diandalkan"
  },
  "terintegrasi": {
    clue_1: "sudah menyatu atau tergabung",
    clue_2: "terhubung dalam satu sistem"
  },
  "berkomitmen": {
    clue_1: "berjanji untuk melaksanakan suatu tugas",
    clue_2: "berpegang teguh pada pendirian"
  },
  "teroptimasi": {
    clue_1: "sudah dimanfaatkan sebaik-baiknya",
    clue_2: "sudah diupayakan agar berjalan maksimal"
  },
  "berpengaruh": {
    clue_1: "memiliki pengaruh yang besar",
    clue_2: "sangat berdampak pada suatu hal"
  },
  "terstandarisasi": {
    clue_1: "sudah sesuai dengan standar yang berlaku",
    clue_2: "sudah memenuhi ukuran atau patokan baku"
  },
  "terakomodasi": {
    clue_1: "sudah ditampung atau disediakan tempat",
    clue_2: "sudah tersedia fasilitasnya"
  },
  "tersertifikasi": {
    clue_1: "sudah memiliki sertifikat resmi",
    clue_2: "sudah diakui kelayakannya oleh lembaga terkait"
  },
  "terjangkau": {
    clue_1: "bisa dijangkau dengan mudah",
    clue_2: "harganya tidak terlalu mahal"
  },
  "berlandaskan": {
    clue_1: "didasari oleh suatu prinsip atau aturan",
    clue_2: "berpedoman pada suatu acuan"
  },
  "tersertifikasi": {
    clue_1: "sudah memiliki sertifikat resmi",
    clue_2: "sudah diakui kelayakannya oleh lembaga terkait"
  },
  "terstandarisasi": {
    clue_1: "sudah sesuai dengan standar yang berlaku",
    clue_2: "sudah memenuhi ukuran atau patokan baku"
  },
  "terakomodasi": {
    clue_1: "sudah ditampung atau disediakan tempat",
    clue_2: "sudah tersedia fasilitasnya"
  },
  "teroptimasi": {
    clue_1: "sudah dimanfaatkan sebaik-baiknya",
    clue_2: "sudah diupayakan agar berjalan maksimal"
  },

  // ═══════════════ TIER 6 ═══════════════
  "tertumpah": {
    clue_1: "sudah tumpah ke luar",
    clue_2: "tidak sengaja terbuang isinya"
  },
  "bertulang": {
    clue_1: "mempunyai rangka tubuh dari tulang",
    clue_2: "dilengkapi dengan kerangka keras"
  },
  "penyumbat": {
    clue_1: "sesuatu yang menyumbat atau menyekat jalur",
    clue_2: "penutup lubang atau saluran"
  },
  "pemancing": {
    clue_1: "orang yang hobi memancing ikan",
    clue_2: "alat pancing berupa kail dan senar"
  },
  "penyembur": {
    clue_1: "alat untuk menyemburkan cairan",
    clue_2: "orang atau hewan yang menyemburkan air"
  },
  "penghasil": {
    clue_1: "sesuatu yang menghasilkan produk atau barang",
    clue_2: "sumber pendapatan atau penghasilan"
  },
  "pelaksana": {
    clue_1: "orang atau lembaga yang melaksanakan tugas",
    clue_2: "pihak yang menjalankan program"
  },
  "penyimpan": {
    clue_1: "tempat atau alat untuk menyimpan barang",
    clue_2: "pihak yang menyimpan data atau dokumen"
  },
  "penyokong": {
    clue_1: "orang atau kelompok yang memberi dukungan",
    clue_2: "pendukung atau penyokong"
  },
  "pemanggil": {
    clue_1: "orang atau alat untuk memanggil seseorang",
    clue_2: "panitia yang mengundang peserta"
  },

  // ═══════════════ TIER 7 ═══════════════
  "tergantung": {
    clue_1: "bergantung pada sesuatu hal",
    clue_2: "terpulang pada kondisi tertentu"
  },
  "tertangkap": {
    clue_1: "sudah tertangkap oleh polisi",
    clue_2: "sudah tertangkap atau terpegang"
  },
  "menyatakan": {
    clue_1: "mengungkapkan pendapat atau perasaan",
    clue_2: "menjelaskan suatu hal secara resmi"
  },
  "penyelamat": {
    clue_1: "orang atau lembaga yang menyelamatkan",
    clue_2: "tokoh yang menolong dari bahaya"
  },
  "tertinggal": {
    clue_1: "sudah ditinggalkan oleh orang lain",
    clue_2: "terseleweng dari rombongan"
  },
  "pengunjung": {
    clue_1: "orang yang datang mengunjungi suatu tempat",
    clue_2: "tamu atau wisatawan"
  },
  "terkendali": {
    clue_1: "sudah dapat dikontrol dengan baik",
    clue_2: "sudah berada dalam kendali"
  },
  "pengendali": {
    clue_1: "orang atau sistem yang mengontrol suatu proses",
    clue_2: "pengawas atau pengatur"
  },
  "pendamping": {
    clue_1: "orang yang mendampingi dalam suatu kegiatan",
    clue_2: "pendukung atau rekan yang menemani"
  },
  "penunggang": {
    clue_1: "orang yang menunggang kuda atau kendaraan",
    clue_2: "pengendara tunggangan"
  },
  "penghalang": {
    clue_1: "sesuatu yang menghalangi jalur atau akses",
    clue_2: "rintangan atau hambatan"
  },
  "penjelajah": {
    clue_1: "orang yang menjelajahi daerah atau wilayah baru",
    clue_2: "petualang atau penelusur"
  },
  "penghubung": {
    clue_1: "alat atau orang yang menghubungkan dua tempat",
    clue_2: "perantara atau jembatan informasi"
  },
  "terdeteksi": {
    clue_1: "sudah terdeteksi oleh alat atau indra",
    clue_2: "sudah diketahui keberadaannya"
  },
  "tersanjung": {
    clue_1: "merasa terhormat atau terbangga",
    clue_2: "merasa senang karena dipuji"
  },
  "pengembara": {
    clue_1: "orang yang mengembara atau berpetualang",
    clue_2: "pelancong tanpa tujuan tetap"
  },
  "pembangkit": {
    clue_1: "alat atau instalasi untuk menghasilkan listrik",
    clue_2: "sumber daya atau energi"
  },
  "bermanfaat": {
    clue_1: "mempunyai kegunaan atau manfaat",
    clue_2: "sangat berguna bagi banyak orang"
  },
  "pengganggu": {
    clue_1: "orang atau sesuatu yang mengganggu ketenangan",
    clue_2: "perusak atau pembuat onar"
  },
  "berkhianat": {
    clue_1: "tidak setia atau berpaling dari janji",
    clue_2: "mengkhianati kepercayaan orang lain"
  },
  "pengendara": {
    clue_1: "orang yang mengendarai kendaraan bermotor",
    clue_2: "pengemudi mobil atau motor"
  },
  "terbongkar": {
    clue_1: "sudah terungkap atau terbuka rahasianya",
    clue_2: "sudah diungkap ke publik"
  },
  "mendengkur": {
    clue_1: "mengeluarkan bunyi keras saat tidur",
    clue_2: "bersuara keras dari tenggorokan saat tidur pulas"
  },
  "penyelidik": {
    clue_1: "orang yang menyelidiki suatu kasus atau kejadian",
    clue_2: "detektif atau penyidik"
  },
  "permusuhan": {
    clue_1: "sikap atau perbuatan bermusuhan",
    clue_2: "perselisihan atau pertengkaran"
  },
  "berbahagia": {
    clue_1: "merasa senang dan gembira",
    clue_2: "merasakan kebahagiaan hidup"
  },
  "penyendiri": {
    clue_1: "orang yang suka mengasingkan diri",
    clue_2: "pribadi yang tidak suka keramaian"
  },
  "perkenalan": {
    clue_1: "hal atau perbuatan berkenalan dengan orang baru",
    clue_2: "pengenalan diri atau perjumpaan pertama"
  },
  "terelakkan": {
    clue_1: "sudah dapat dihindari atau dicegah",
    clue_2: "sudah bisa dielakkan"
  },
  "berselisih": {
    clue_1: "bertengkar atau berbeda pendapat",
    clue_2: "ada perbedaan atau ketidaksesuaian"
  },
  "pengangkut": {
    clue_1: "alat atau moda untuk mengangkut barang",
    clue_2: "truk, kapal, atau pesawat angkutan"
  },
  "mengangguk": {
    clue_1: "menggerakkan kepala ke atas dan ke bawah sebagai tanda setuju",
    clue_2: "mengangkat dagu ke atas sebagai tanda ya"
  },
  "pemanggang": {
    clue_1: "alat untuk membakar atau memanggang makanan",
    clue_2: "grill atau oven untuk masakan bakar"
  },
  "terlaksana": {
    clue_1: "sudah dapat dilaksanakan atau direalisasikan",
    clue_2: "sudah berjalan sesuai rencana"
  },
  "terpelajar": {
    clue_1: "sudah mendapat pendidikan yang cukup",
    clue_2: "berpengetahuan luas karena rajin belajar"
  },
  "terkontrol": {
    clue_1: "sudah dapat dikendalikan dengan baik",
    clue_2: "sudah berada dalam pengawasan"
  },
  "tersingkir": {
    clue_1: "sudah dikeluarkan dari kelompok atau kompetisi",
    clue_2: "sudah gagal dan keluar dari arena"
  },
  "penanggung": {
    clue_1: "orang atau badan yang menanggung biaya atau risiko",
    clue_2: "penjamin atau penanggung jawab"
  },
  "terperinci": {
    clue_1: "sudah dijelaskan secara rinci",
    clue_2: "terurai secara terperinci"
  },
  "pengembang": {
    clue_1: "orang atau perusahaan yang mengembangkan produk",
    clue_2: "developer atau pengembang properti"
  },
  "pembungkus": {
    clue_1: "alat atau bahan untuk membungkus barang",
    clue_2: "kertas atau plastik pembungkus"
  },
  "terbendung": {
    clue_1: "sudah dibendung atau terhalang alirannya",
    clue_2: "sudah tertahan oleh suatu penghalang"
  },
  "menggoyang": {
    clue_1: "menggerakkan sesuatu ke kiri dan ke kanan",
    clue_2: "mengguncang atau mengayunkan"
  },
  "penyemprot": {
    clue_1: "alat untuk menyemprotkan cairan",
    clue_2: "botol atau pistol semprot"
  },
  "terabaikan": {
    clue_1: "sudah dilupakan atau tidak diperhatikan",
    clue_2: "sudah diabaikan oleh orang lain"
  },
  "terkatakan": {
    clue_1: "sudah terucap atau terlontar dari mulut",
    clue_2: "sudah terkeluarkan kata-katanya"
  },
  "berbanding": {
    clue_1: "ada perbandingan atau keseimbangan",
    clue_2: "ada kesetaraan atau keseimbangan"
  },
  "penyandang": {
    clue_1: "orang yang menderita suatu penyakit atau kondisi",
    clue_2: "pembawa atau pemegang suatu gelar"
  },
  "pengontrol": {
    clue_1: "alat atau orang yang mengontrol suatu proses",
    clue_2: "pengawas atau regulator"
  },
  "percepatan": {
    clue_1: "penambahan kecepatan dari waktu ke waktu",
    clue_2: "laju perubahan kecepatan"
  },
  "mengganjal": {
    clue_1: "memberi penahan agar tidak goyang",
    clue_2: "menaruh benda di bawah supaya kokoh"
  },
  "berbintang": {
    clue_1: "dilengkapi dengan bintang atau simbol bintang",
    clue_2: "bertaburkan atau berhiaskan bintang"
  },
  "pendongeng": {
    clue_1: "orang yang suka bercerita atau mendongeng",
    clue_2: "pencerita atau narator cerita"
  },
  "penghambat": {
    clue_1: "sesuatu yang menghambat laju atau proses",
    clue_2: "rintangan atau penghalang"
  },
  "penggiling": {
    clue_1: "alat untuk menghaluskan atau menggiling bahan",
    clue_2: "mesin penggiling daging atau tepung"
  },
  "berdenting": {
    clue_1: "mengeluarkan bunyi seperti lonceng kecil",
    clue_2: "berbunyi nyaring seperti logam kecil beradu"
  },
  "penghangat": {
    clue_1: "alat untuk menghangatkan ruangan atau tubuh",
    clue_2: "heater atau jaket penghangat"
  },
  "bertingkat": {
    clue_1: "berpangkat-pangkat atau berjenjang",
    clue_2: "tersusun naik seperti tangga"
  },
  "penyumbang": {
    clue_1: "orang atau lembaga yang menyumbang dana atau barang",
    clue_2: "dermawan atau donatur"
  },
  "pemelihara": {
    clue_1: "orang yang memelihara dan merawat sesuatu",
    clue_2: "petugas perawatan atau pemelihara"
  },
  "penggerutu": {
    clue_1: "orang yang suka menggerutu atau mengeluh",
    clue_2: "pembunyi suara gerutu"
  },
  "terprogram": {
    clue_1: "sudah diatur oleh sistem komputer",
    clue_2: "sudah dicanangkan atau direncanakan"
  },
  "pencetakan": {
    clue_1: "proses mencetak dokumen atau buku",
    clue_2: "percetakan atau penerbitan"
  },
  "pengungkit": {
    clue_1: "alat untuk mengungkit atau mengangkat beban",
    clue_2: "tuas atau batang besi"
  },
  "tertantang": {
    clue_1: "merasa terdorong untuk melakukan sesuatu",
    clue_2: "merasa tertantang oleh suatu ajakan"
  },
  "penggertak": {
    clue_1: "orang yang suka menggertak atau menakut-nakuti",
    clue_2: "pembuat gertakan atau ancaman"
  },
  "tertanggal": {
    clue_1: "sudah diberi tanggal atau bertanggal",
    clue_2: "sudah memiliki catatan tanggal"
  },
  "mendengung": {
    clue_1: "mengeluarkan bunyi dengung yang terus-menerus",
    clue_2: "berbunyi vvvvv seperti serangga"
  },
  "penjambret": {
    clue_1: "orang yang pekerjaannya menjambret barang orang lain",
    clue_2: "penjahat jalanan yang merampas tas atau perhiasan"
  },
  "pengangkat": {
    clue_1: "alat untuk mengangkat beban berat",
    clue_2: " orang atau lembaga yang mengangkat seseorang ke jabatan"
  },
  "terpanggil": {
    clue_1: "sudah dipanggil atau diundang",
    clue_2: "merasa terdorong untuk datang"
  },
  "terbelalak": {
    clue_1: "membuka mata sangat lebar karena kaget",
    clue_2: "memelototkan mata karena heran"
  },
  "berbingkai": {
    clue_1: "dilengkapi dengan bingkai di sekelilingnya",
    clue_2: "ada bingkai atau pigura penyangga"
  },
  "penganiaya": {
    clue_1: "orang yang menganiaya atau menyiksa orang lain",
    clue_2: "pelaku kekerasan atau penganiayaan"
  },
  "pengkritik": {
    clue_1: "orang yang mengkritik atau menilai suatu karya",
    clue_2: "kriticus atau penilai"
  },
  "mewaspadai": {
    clue_1: "menjaga kewaspadaan terhadap sesuatu",
    clue_2: "hati-hati dan waspada terhadap bahaya"
  },

  // ═══════════════ TIER 8 ═══════════════
  "menggumpal": {
    clue_1: "menjadi gumpalan atau bergerombol",
    clue_2: "mengental atau menggumpal menjadi satu"
  },
  "penyandera": {
    clue_1: "orang yang menyandera atau menculik seseorang",
    clue_2: "teroris atau penculik yang meminta tebusan"
  },
  "berlistrik": {
    clue_1: "dilengkapi dengan aliran listrik",
    clue_2: "menggunakan tenaga listrik"
  },
  "penghantar": {
    clue_1: "zat padat yang menghantarkan panas atau listrik",
    clue_2: "kabel atau medium penghantar"
  },
  "penjagalan": {
    clue_1: "tempat atau proses penyembelihan hewan",
    clue_2: "rumah potong hewan"
  },
  "penyelinap": {
    clue_1: "orang yang menyelinap atau diam-diam masuk",
    clue_2: "penyusup atau pembelot"
  },
  "terlampaui": {
    clue_1: "sudah dilewati atau terlewati batasnya",
    clue_2: "sudah melampaui target"
  },
  "mendenting": {
    clue_1: "mengeluarkan bunyi dentingan",
    clue_2: "berbunyi seperti logam kecil beradu"
  },
  "pencangkok": {
    clue_1: "ahli yang mencangkok tanaman",
    clue_2: "petani yang melakukan pencangkokan"
  },
  "penyangkut": {
    clue_1: "gantungan untuk menaruh pakaian atau benda",
    clue_2: "hook atau hanger"
  },

  // ═══════════════ TIER 9 ═══════════════
  "mendesing": {
    clue_1: "mengeluarkan bunyi desingan yang keras",
    clue_2: "berbunyi seperti mesin atau proyektil"
  },
  "terhanyut": {
    clue_1: "terseret oleh arus air atau angin",
    clue_2: "terbawa oleh arus deras"
  },
  "penentang": {
    clue_1: "orang yang menentang atau menolak suatu gagasan",
    clue_2: "oposisi atau pengkritik kebijakan"
  },
  "terjadwal": {
    clue_1: "sudah diatur waktunya dalam jadwal",
    clue_2: "sudah direncanakan untuk dilaksanakan"
  },
  "tertembus": {
    clue_1: "sudah dapat ditembus atau dibobol",
    clue_2: "sudah pronia atau tembus pandang"
  },
  "pembaptis": {
    clue_1: "orang yang mempermandikan seseorang",
    clue_2: "rohaniwan yang melakukan upacara pembaptisan"
  },
  "berhadiah": {
    clue_1: "ada hadiah atau penghargaan yang disediakan",
    clue_2: "menyediakan hadiah bagi pemenang"
  },
  "pelengkap": {
    clue_1: "sesuatu yang dipakai untuk melengkapi",
    clue_2: "bagian tambahan agar lebih sempurna"
  },
  "penjemput": {
    clue_1: "orang yang pergi menjemput atau mengambil seseorang",
    clue_2: "kurir atau driver pengambil"
  },
  "penunjang": {
    clue_1: "alat atau faktor yang menunjang kelancaran",
    clue_2: "penopang atau pendukung"
  },
  "penyembah": {
    clue_1: "orang yang menyembah atau beribadah",
    clue_2: "umat atau penganut agama"
  },
  "termenung": {
    clue_1: "duduk merenung dalam diam",
    clue_2: "berpikir panjang dalam keheningan"
  },
  "penghujat": {
    clue_1: "orang yang menghujat atau mencela",
    clue_2: "kritikus tajam atau pengumpat"
  },
  "tergenang": {
    clue_1: "tergenang air atau cairan di suatu tempat",
    clue_2: "ada genangan air di permukaan"
  },
  "tergolong": {
    clue_1: "termasuk dalam golongan atau kategori tertentu",
    clue_2: "dikelompokkan ke dalam suatu jenis"
  },
  "pendobrak": {
    clue_1: "alat atau orang yang mendobrak pintu atau penghalang",
    clue_2: "pemecah atau peruntus"
  },
  "penyambut": {
    clue_1: "orang yang menyambut kedatangan tamu",
    clue_2: "tuan rumah atau protokol"
  },
  "menggesek": {
    clue_1: "menyentuh dengan gesekan atau goresan",
    clue_2: "mengusap permukaan dengan tekanan"
  },
  "penampung": {
    clue_1: "wadah atau tempat untuk menampung cairan",
    clue_2: "tangki atau bak penampungan"
  },
  "terlampir": {
    clue_1: "ikut termuat dalam dokumen atau lampiran",
    clue_2: "tercantum sebagai tambahan"
  },
  "tertimbun": {
    clue_1: "sudah tertimbun tanah atau material lain",
    clue_2: "sudah tertanam atau tertutup"
  },
  "terngiang": {
    clue_1: "terdengar berulang-ulang di telinga",
    clue_2: "masih terdengar gaungnya"
  },
  "mengomeli": {
    clue_1: "mengomel atau menggerutu dengan nada tinggi",
    clue_2: "bersuara tinggi mengeluh tentang sesuatu"
  },
  "penyuplai": {
    clue_1: "orang atau perusahaan yang menyuplai barang",
    clue_2: "pemasok atau distributor"
  },
  "pendayung": {
    clue_1: "orang yang mendayung perahu atau kano",
    clue_2: "dayung atau pengayuh"
  },
  "penggosok": {
    clue_1: "alat untuk menggosok pakaian atau permukaan",
    clue_2: "sikat atau kain lap penggosok"
  },
  "penyampai": {
    clue_1: "orang yang menyampaikan informasi atau berita",
    clue_2: "pembawa acara atau news anchor"
  },
  "penghenti": {
    clue_1: "alat atau mekanisme untuk menghentikan sesuatu",
    clue_2: "rem atau katup penutup"
  },
  "terampuni": {
    clue_1: "sudah diampuni atau dimaafkan",
    clue_2: "sudah mendapat pengampunan"
  },
  "bergelora": {
    clue_1: "berkobar atau menyala dengan hebat",
    clue_2: "bersemangat atau berapi-api"
  },
  "penggaruk": {
    clue_1: "alat untuk menggaruk atau mengikis permukaan",
    clue_2: "garu atau cakar penggaruk"
  },
  "menjuntai": {
    clue_1: "tergantung dan berayun-ayun",
    clue_2: "menggantung panjang ke bawah"
  },
  "penggosip": {
    clue_1: "orang yang suka membicarakan kehidupan orang lain",
    clue_2: "tukang gosip atau pembicara renceng"
  },
  "terpantau": {
    clue_1: "sudah dapat dipantau atau diamati",
    clue_2: "sudah terlihat oleh pengawasan"
  },
  "pengurang": {
    clue_1: "bilangan atau alat yang mengurangi",
    clue_2: "zat atau hal yang mengurangi kadar"
  },
  "mendenyut": {
    clue_1: "berdenyut-denyut dengan irama tertentu",
    clue_2: "berkedut atau berdetak seperti nadi"
  },

  // ═══════════════ TIER 10 ═══════════════
  "pembayar": {
    clue_1: "orang yang membayar tagihan atau utang",
    clue_2: "nasabah atau debitur"
  },
  "bertanda": {
    clue_1: "ada tanda atau penanda khusus",
    clue_2: "memiliki simbol atau cap"
  },
  "pencabut": {
    clue_1: "alat untuk mencabut paku atau gigi",
    clue_2: "orang yang menghunus atau mencabut senjata"
  },
  "pencopet": {
    clue_1: "tukang copet atau pencuri dompet",
    clue_2: "penjahat kecil yang mengambil barang di kantong"
  },
  "tergigit": {
    clue_1: "sudah kena gigitan dari hewan atau manusia",
    clue_2: "tidak sengaja terkena gigitan"
  },
  "berlipat": {
    clue_1: "sudah dilipat atau dilipat-lipat",
    clue_2: "berlipat ganda atau bertambah"
  },
  "pelontar": {
    clue_1: "alat untuk melontarkan benda seperti meriam",
    clue_2: "mesin投射 atau senjata pelontar"
  },
  "penjarah": {
    clue_1: "orang yang menjarah atau merampas harta benda",
    clue_2: "perampok atau perusuh"
  },
  "seluncur": {
    clue_1: "olahraga di atas es dengan sepatu bersisir",
    clue_2: "kegiatan meluncur di atas permukaan licin"
  },
  "mencoret": {
    clue_1: "membubuhi coretan pada tulisan atau gambar",
    clue_2: "menggoreskan tinta atau pensil secara acak"
  },
  "pemantik": {
    clue_1: "alat untuk memantik api atau percikan",
    clue_2: "korek api atau lighter"
  },
  "berwujud": {
    clue_1: "mempunyai bentuk atau rupa",
    clue_2: "berupa atau berbentuk sesuatu"
  },
  "penopang": {
    clue_1: "alat atau orang yang menopang beban",
    clue_2: "penyangga atau penahan"
  },
  "berdecit": {
    clue_1: "mengeluarkan bunyi decit yang nyaring",
    clue_2: "berbunyi seperti rem atau ban kempes"
  },
  "berlebih": {
    clue_1: "melebihi batas yang wajar",
    clue_2: "terlalu banyak atau berlebihan"
  },
  "penindas": {
    clue_1: "orang yang menindas atau menganiaya orang lain",
    clue_2: "tirani atau penguasa yang kejam"
  },
  "penyedot": {
    clue_1: "alat untuk menyedot cairan atau debu",
    clue_2: "vakum cleaner atau pompa hisap"
  },
  "pengasih": {
    clue_1: "orang yang mengasihi atau menyayangi",
    clue_2: "dermawan atau penyayang"
  },
  "pencakar": {
    clue_1: "alat untuk mencakar atau menggaruk permukaan",
    clue_2: "cakar atau kuku besi"
  },
  "menggema": {
    clue_1: "menimbulkan gaung atau pantulan suara",
    clue_2: "bersuara berulang di ruangan besar"
  },
  "tertelan": {
    clue_1: "sudah tertelan masuk ke dalam tenggorokan",
    clue_2: "tidak sengaja masuk ke dalam mulut dan perut"
  },
  "pemberat": {
    clue_1: "benda berat yang dipakai untuk menyeimbangkan",
    clue_2: "beban atau pemberat timbangan"
  },
  "selubung": {
    clue_1: "kain atau bahan penutup yang melingkupi",
    clue_2: "pelindung atau penutup luar"
  },
  "penebang": {
    clue_1: "orang yang pekerjaannya menebang pohon di hutan",
    clue_2: "gergaji atau kapak untuk menebang kayu"
  },
  "bergaris": {
    clue_1: "mempunyai garis atau pola berupa garis",
    clue_2: "bertekstur dengan garis-garis"
  },
  "tergerak": {
    clue_1: "sudah bergerak atau terdorong untuk bertindak",
    clue_2: "tergugah atau terdorong hatinya"
  },
  "mendekam": {
    clue_1: "berdiam dalam penjara atau tahanan",
    clue_2: "diam di tempat tertentu dalam waktu lama"
  },
  "pendarat": {
    clue_1: "pasukan atau alat untuk mendarat di wilayah musuh",
    clue_2: "roda atau bantalan pesawat untuk mendarat"
  },
  "berkerut": {
    clue_1: "mempunyai kerutan atau garis-garis halus",
    clue_2: "mengkerut atau berkedut"
  },
  "peminjam": {
    clue_1: "orang yang meminjam barang atau uang",
    clue_2: "nasabah atau debitur bank"
  },
  "penyamar": {
    clue_1: "orang yang menyamar atau menyembunyikan identitas",
    clue_2: "agen rahasia atau penyusup"
  },
  "berdetik": {
    clue_1: "mengeluarkan bunyi detik secara teratur",
    clue_2: "berbunyi tik-tik seperti jarum jam"
  },
  "pembebas": {
    clue_1: "orang atau lembaga yang membebaskan dari tahanan",
    clue_2: "pejuang kemerdekaan atau pembebas"
  },
  "terkuras": {
    clue_1: "sudah habis atau surut airnya",
    clue_2: "sudah dikuras isinya"
  },
  "penyegar": {
    clue_1: "minuman atau bahan yang menyegarkan tubuh",
    clue_2: "soft drink atau jus buah"
  },
  "tersusun": {
    clue_1: "sudah diatur atau ditumpuk dengan rapi",
    clue_2: "sudah tersusun secara sistematis"
  },
  "berjamur": {
    clue_1: "ditumbuhi jamur karena lembap",
    clue_2: "muncul bercak jamur pada permukaan"
  },
  "pencetak": {
    clue_1: "mesin atau alat untuk mencetak dokumen",
    clue_2: "printer atau mesin offset"
  },
  "pengunci": {
    clue_1: "alat untuk mengunci pintu atau brankas",
    clue_2: "gembok atau kunci digital"
  },
  "tercakup": {
    clue_1: "sudah termasuk dalam cakupan atau lingkup",
    clue_2: "sudah tercantum dalam daftar"
  },
  "pelompat": {
    clue_1: "atlet cabang lompat dalam olahraga",
    clue_2: "orang atau hewan yang melompat jauh"
  },
  "tertuduh": {
    clue_1: "orang yang didakwa atau dituduh melakukan kejahatan",
    clue_2: "tersangka atau terdakwa"
  },
  "mengulas": {
    clue_1: "membahas atau menilai suatu karya secara kritis",
    clue_2: "memberikan ulasan atau review"
  },
  "penyalur": {
    clue_1: "perusahaan atau orang yang menyalurkan barang",
    clue_2: "distributor atau agen penyalur"
  },
  "penyiram": {
    clue_1: "alat untuk menyiram tanaman atau bunga",
    clue_2: "gembor atau sprayer"
  },
  "penuntun": {
    clue_1: "alat atau orang yang menuntun atau membimbing",
    clue_2: "pemandu wisata atau navigator"
  },
  "penyamun": {
    clue_1: "perampok atau penjahat yang merampas barang",
    clue_2: "begal atau perampok jalanan"
  },
  "bernomor": {
    clue_1: "memiliki nomor urut atau identitas",
    clue_2: "diberi tanda angka atau nomor"
  },
  "membelok": {
    clue_1: "menyimpang atau berbelok dari arah semula",
    clue_2: "berpindah jalur atau mengubah arah"
  },
  "pemungut": {
    clue_1: "orang yang memungut sampah atau pajak",
    clue_2: "petugas pungut atau penagih"
  },
  "terkikis": {
    clue_1: "sudah tergerus atau terkikis permukaannya",
    clue_2: "sudah aus atau rusak karena gesekan"
  },
  "berbalas": {
    clue_1: "bertimbalan atau saling memberi",
    clue_2: "membalas dengan perbuatan yang sama"
  },
  "penumpas": {
    clue_1: "orang atau alat yang menumpas musuh",
    clue_2: "pemberantas atau pemusnah"
  },
  "berbekas": {
    clue_1: "menimbulkan bekas atau tanda",
    clue_2: "masih terlihat bekas atau jejaknya"
  },
  "berombak": {
    clue_1: "mempunyai ombak atau gelombang",
    clue_2: "bergelombang atau berombak"
  },
  "pembisik": {
    clue_1: "orang yang membisikkan rahasia atau info",
    clue_2: "pemberi bisikan atau petunjuk rahasia"
  },
  "pencegah": {
    clue_1: "alat atau orang yang mencegah sesuatu",
    clue_2: "penghalang atau pencegah"
  },
  "peninjau": {
    clue_1: "orang yang meninjau atau mengamati suatu lokasi",
    clue_2: "inspektur atau pengawas"
  },
  "penjamin": {
    clue_1: "orang atau lembaga yang menjamin keselamatan",
    clue_2: "surety atau penanggung jawab"
  },
  "tercabut": {
    clue_1: "sudah tercabut dari tempat asalnya",
    clue_2: "sudah dilepas atau dikeluarkan"
  },
  "penambah": {
    clue_1: "bahan atau zat yang ditambahkan ke dalam suatu campuran",
    clue_2: "suplemen atau additive"
  },
  "sejumput": {
    clue_1: "satu genggam kecil dari suatu benda",
    clue_2: "segenggam atau segenggam kecil"
  },
  "pemanjat": {
    clue_1: "atlet atau orang yang memanjat tebing atau pohon",
    clue_2: "climber atau pendaki"
  },
  "terjamah": {
    clue_1: "sudah tersentuh atau dijamah orang",
    clue_2: "sudah disentuh atau dimiliki"
  },
  "berbatas": {
    clue_1: "mempunyai batas atau garis pemisah",
    clue_2: "terbatas atau terhalang"
  },
  "bernanah": {
    clue_1: "mengandung nanah atau bernanah",
    clue_2: "infeksi yang menghasilkan nanah"
  },
  "penengah": {
    clue_1: "orang yang menengahi atau menjadi wasit",
    clue_2: "mediator atau arbitrator"
  },
  "sebangsa": {
    clue_1: "satu bangsa atau negara yang sama",
    clue_2: "sesama warga negara"
  },
  "bersisik": {
    clue_1: "mempunyai sisik seperti ikan atau reptil",
    clue_2: "bertekstur sisik-sisik kecil"
  },
  "pencukur": {
    clue_1: "alat untuk mencukur rambut atau janggut",
    clue_2: "pisau cukur atau gunting rambut"
  },
  "terobati": {
    clue_1: "sudah mendapat pengobatan dan sembuh",
    clue_2: "sudah diobati hingga pulih"
  },
  "penerang": {
    clue_1: "sumber cahaya atau penerangan",
    clue_2: "lampu atau alat penerangan"
  },
  "pencandu": {
    clue_1: "orang yang kecanduan narkoba atau minuman keras",
    clue_2: "pecandu atau peminum"
  },
  "pembalas": {
    clue_1: "orang yang membalas dendam atau jasa",
    clue_2: "balas budi atau pembalasan"
  },
  "pendidik": {
    clue_1: "guru atau dosen yang mendidik anak bangsa",
    clue_2: "tenaga pengajar atau pendidik"
  },
  "pengawet": {
    clue_1: "zat atau bahan untuk mengawetkan makanan",
    clue_2: "preservatif atau bahan pengawet"
  },
  "berjajar": {
    clue_1: "tersusun dalam barisan atau deretan",
    clue_2: "berbaris atau berjejer"
  },
  "berlabel": {
    clue_1: "dilengkapi dengan label atau cap merek",
    clue_2: "memiliki tanda pengenal atau cap"
  },
  "tertikam": {
    clue_1: "sudah kena tikaman benda tajam",
    clue_2: "sudah tertusuk atau terluka"
  },
  "membelit": {
    clue_1: "membalut atau melilit dengan erat",
    clue_2: "berbelit-belit atau berputar-putar"
  },
  "pemintal": {
    clue_1: "alat untuk memintal benang atau tali",
    clue_2: "mesin pemintal atau spindle"
  },
  "penyebar": {
    clue_1: "alat atau orang yang menyebarkan informasi",
    clue_2: "distributor atau pengedar"
  },
  "terhukum": {
    clue_1: "sudah dijatuhi hukuman oleh pengadilan",
    clue_2: "sudah mendapat hukuman"
  },
  "pengebor": {
    clue_1: "alat untuk mengebor tanah atau sumur",
    clue_2: "mesin bor atau rig pengeboran"
  },
  "pengolah": {
    clue_1: "alat atau orang yang mengolah bahan mentah",
    clue_2: "mesin pengolah atau pabrik pengolahan"
  },
  "penyabot": {
    clue_1: "orang yang menyabotase atau merusak",
    clue_2: "perusuh atau agen rahasia"
  },
  "pencatat": {
    clue_1: "alat atau orang yang mencatat data",
    clue_2: "buku catatan atau notaris"
  },
  "pengaduk": {
    clue_1: "alat untuk mengaduk atau mencampur bahan",
    clue_2: "sendok besar atau spatula pengaduk"
  },
  "penikmat": {
    clue_1: "orang yang menikmati atau merasai suatu kenikmatan",
    clue_2: "penggemar atau penikmat seni"
  },
  "berkerah": {
    clue_1: "mempunyai kerah pada bagian leher baju",
    clue_2: "dilengkapi dengan kerah atau lipatan kain"
  },
  "penimbun": {
    clue_1: "orang yang menimbun barang untuk spekulasi",
    clue_2: "penimbun atau pengumpul barang"
  },
  "tersekat": {
    clue_1: "sudah terhalang atau tersumbat jalannya",
    clue_2: "sudah dibatasi oleh sekat atau dinding"
  },
  "mendecit": {
    clue_1: "mengeluarkan bunyi decitan yang nyaring",
    clue_2: "berbunyi seperti rem atau ban kempes"
  },
  "pengupas": {
    clue_1: "alat untuk mengupas kulit buah atau sayuran",
    clue_2: "pisau kupas atau peelernya"
  },
  "pemasang": {
    clue_1: "orang atau tukang yang memasang instalasi",
    clue_2: "teknisi atau pemasang parket"
  },
  "pencetus": {
    clue_1: "orang yang mencetuskan ide atau gagasan baru",
    clue_2: "pelopor atau perintis"
  },
  "pengocok": {
    clue_1: "alat untuk mengocok telur atau adonan",
    clue_2: "whisk atau mixer"
  },
  "beraspal": {
    clue_1: "dilapisi dengan aspal atau hotmix",
    clue_2: "jalan beraspal atau berlapis bitumen"
  },
  "pengecoh": {
    clue_1: "orang atau alat untuk mengecoh lawan",
    clue_2: "pemain tipuan atau pengelabu"
  },

  // ═══════════════ TIER 4 additional ═══════════════
  "merekam": {
    clue_1: "mengabadikan suara atau gambar dengan alat",
    clue_2: "menggunakan perekam untuk menyimpan data"
  },
  "terikat": {
    clue_1: "sudah diikat dengan tali atau simpul",
    clue_2: "tergantung pada suatu kewajiban"
  },
  "terbuat": {
    clue_1: "dibuat dari bahan tertentu",
    clue_2: "tercipta dari suatu materi"
  },
  "penutup": {
    clue_1: "bagian akhir dari suatu rangkaian",
    clue_2: "benda yang dipakai untuk menutup"
  },
  "pembuat": {
    clue_1: "orang yang membuat atau menciptakan sesuatu",
    clue_2: "pengrajin atau produsen"
  },
  "pejuang": {
    clue_1: "orang yang berjuang untuk suatu tujuan",
    clue_2: "tokoh yang berkorban demi kemerdekaan"
  },
  "pejabat": {
    clue_1: "orang yang memegang jabatan pemerintahan",
    clue_2: "pegawai tingkat tinggi dalam suatu lembaga"
  },
  "pecandu": {
    clue_1: "orang yang kecanduan sesuatu",
    clue_2: "peminum atau pemakai narkoba"
  },
  "menguji": {
    clue_1: "mengadakan ujian atau tes",
    clue_2: "melakukan pengujian terhadap sesuatu"
  },
  "peledak": {
    clue_1: "bahan yang dapat meledak",
    clue_2: "zat kimia yang bersifat eksplosif"
  },
  "pemadam": {
    clue_1: "alat atau petugas untuk memadamkan api",
    clue_2: "unit yang menangani kebakaran"
  },
  "penjual": {
    clue_1: "orang yang menjual barang dagangan",
    clue_2: "pedagang atau toko"
  },
  "terduga": {
    clue_1: "yang disangka atau diduga",
    clue_2: "diduga kuat sebagai pelaku"
  },
  "sejenis": {
    clue_1: "satu golongan atau kategori yang sama",
    clue_2: "bertipe atau berkarakter serupa"
  },
  "membagi": {
    clue_1: "memisah menjadi beberapa bagian",
    clue_2: "memberikan hak bagi orang lain"
  },
  "semudah": {
    clue_1: "sama gampangnya dengan",
    clue_2: "setara tingkat kesulitannya dengan"
  },
  "pembawa": {
    clue_1: "orang atau sesuatu yang membawa barang",
    clue_2: "pengangkut atau kurir"
  },
  "pelacak": {
    clue_1: "alat atau orang yang melacak sesuatu",
    clue_2: "perangkat penjejak lokasi"
  },
  "pewaris": {
    clue_1: "orang yang berhak menerima warisan",
    clue_2: "ahli waris dari suatu harta"
  },
  "pemabuk": {
    clue_1: "orang yang sering mabuk minuman keras",
    clue_2: "pecandu alkohol"
  },
  "pembeli": {
    clue_1: "orang yang membeli barang di toko",
    clue_2: "konsumen atau pelanggan"
  },
  "pencari": {
    clue_1: "orang yang mencari sesuatu yang hilang",
    clue_2: "penelusur atau penjejak"
  },
  "seiring": {
    clue_1: "bersamaan dengan; beriringan",
    clue_2: "sejalan dengan perkembangan"
  },
  "berjaga": {
    clue_1: "waspada menjaga keamanan",
    clue_2: "tidak tidur untuk mengawasi"
  },
  "pembuka": {
    clue_1: "bagian awal dari suatu acara",
    clue_2: "orang atau benda yang membuka"
  },
  "penegak": {
    clue_1: "orang yang menegakkan aturan atau hukum",
    clue_2: "aparat penegak hukum"
  },
  "berjaya": {
    clue_1: "meraih kemenangan atau keberhasilan",
    clue_2: "sukses dalam suatu usaha"
  },
  "pemukul": {
    clue_1: "alat untuk memukul bola dalam olahraga",
    clue_2: "tongkat atau raket olahraga"
  },
  "pembaca": {
    clue_1: "orang yang membaca buku atau teks",
    clue_2: "pecinta literasi"
  },
  "pembela": {
    clue_1: "orang yang membela kepentingan orang lain",
    clue_2: "kuasa hukum yang membela klien"
  },
  "pemakan": {
    clue_1: "hewan atau orang yang memakan makanan tertentu",
    clue_2: "konsumen jenis makanan tertentu"
  },
  "pendiri": {
    clue_1: "orang yang mendirikan organisasi atau lembaga",
    clue_2: "sosok pencetus berdirinya suatu instansi"
  },
  "bermula": {
    clue_1: "berasal dari; permulaan",
    clue_2: "awal mula suatu kejadian"
  },
  "berfoto": {
    clue_1: "berpose di depan kamera",
    clue_2: "mengabadikan gambar diri"
  },
  "pemeran": {
    clue_1: "orang yang memerankan tokoh dalam film atau sandiwara",
    clue_2: "aktor atau aktris"
  },
  "pelukis": {
    clue_1: "orang yang berkarya melukis gambar",
    clue_2: "seniman yang menggunakan cat dan kanvas"
  },
  "bersiul": {
    clue_1: "mengeluarkan bunyi pelan dari mulut",
    clue_2: "mengeluarkan nada-nada dari bibir"
  },
  "tergoda": {
    clue_1: "terpengaruh oleh bujukan atau rayuan",
    clue_2: "merasa tertarik akan suatu godaan"
  },

  // ═══════════════ TIER 3 additional ═══════════════
  "berada": {
    clue_1: "berkedudukan di suatu tempat",
    clue_2: "berposisi atau terletak"
  },
  "sebaik": {
    clue_1: "sama bagusnya dengan",
    clue_2: "setara kualitasnya dengan"
  },
  "sekuat": {
    clue_1: "sama kuatnya dengan",
    clue_2: "setara tenaganya dengan"
  },
  "pelari": {
    clue_1: "orang yang berlari cepat dalam perlombaan",
    clue_2: "atlet cabang lari"
  },
  "serasa": {
    clue_1: "seolah-olah sedang dirasai",
    clue_2: "bagai sedang merasakan"
  },
  "penemu": {
    clue_1: "orang pertama yang mengungkap sesuatu yang baru",
    clue_2: "sosok yang menemukan sesuatu sebelum orang lain"
  },
  "berasa": {
    clue_1: "mengalami rasa tertentu di lidah",
    clue_2: "merasakan suatu citarasa",
    clue_3: "Sinonim: terasa"
  },

  // ═══════════════ TIER 5 additional ═══════════════
  "berlaku": {
    clue_1: "berlaku sesuai dengan peraturan",
    clue_2: "bersifat resmi atau berlaku umum"
  },
  "berkualitas": {
    clue_1: "memiliki mutu atau kualitas yang baik",
    clue_2: "sangat bagus mutunya"
  },
  "terkenal": {
    clue_1: "dikenal oleh banyak orang",
    clue_2: "sudah populer di masyarakat"
  },
  "berkembang": {
    clue_1: "tumbuh dan maju dari waktu ke waktu",
    clue_2: "mengalami kemajuan yang pesat"
  },
  "terpengaruh": {
    clue_1: "terkena pengaruh dari sesuatu",
    clue_2: "terpengaruh oleh keadaan sekitar"
  },
  "terbentuk": {
    clue_1: "sudah terbentuk atau tercipta",
    clue_2: "terbentuk dari gabungan beberapa bagian"
  },
  "bergabung": {
    clue_1: "ikut serta dalam suatu kelompok",
    clue_2: "menjadi anggota dari suatu organisasi"
  },
  "berkantor": {
    clue_1: "bertugas atau bekerja di kantor",
    clue_2: "berpusat kegiatan di gedung perkantoran"
  },
  "terselenggara": {
    clue_1: "sudah dilaksanakan dengan baik",
    clue_2: "berhasil diselenggarakan"
  },
  "terakreditasi": {
    clue_1: "sudah diakui oleh lembaga resmi",
    clue_2: "memiliki pengakuan dari instansi berwenang"
  },
  "terkemuka": {
    clue_1: "sangat terkenal dan diakui",
    clue_2: "menjadi panutan dalam bidang tertentu"
  },
  "terpercaya": {
    clue_1: "dipercaya oleh banyak orang",
    clue_2: "andal dan dapat diandalkan"
  },
  "terintegrasi": {
    clue_1: "sudah menyatu atau tergabung",
    clue_2: "terhubung dalam satu sistem"
  },
  "berkomitmen": {
    clue_1: "berjanji untuk melaksanakan suatu tugas",
    clue_2: "berpegang teguh pada pendirian"
  },
  "teroptimasi": {
    clue_1: "sudah dimanfaatkan sebaik-baiknya",
    clue_2: "sudah diupayakan agar berjalan maksimal"
  },
  "berpengaruh": {
    clue_1: "memiliki pengaruh yang besar",
    clue_2: "sangat berdampak pada suatu hal"
  },
  "terstandarisasi": {
    clue_1: "sudah sesuai dengan standar yang berlaku",
    clue_2: "sudah memenuhi ukuran atau patokan baku"
  },
  "terakomodasi": {
    clue_1: "sudah ditampung atau disediakan tempat",
    clue_2: "sudah tersedia fasilitasnya"
  },
  "tersertifikasi": {
    clue_1: "sudah memiliki sertifikat resmi",
    clue_2: "sudah diakui kelayakannya oleh lembaga terkait"
  },
  "terjangkau": {
    clue_1: "bisa dijangkau dengan mudah",
    clue_2: "harganya tidak terlalu mahal"
  },
  "berlandaskan": {
    clue_1: "didasari oleh suatu prinsip atau aturan",
    clue_2: "berpedoman pada suatu acuan"
  },

  // ═══════════════ TIER 2 additional ═══════════════
  "sekali": {
    clue_1: "satu kali; pernah",
    clue_2: "hanya satu waktu saja"
  },
  "setiap": {
    clue_1: "masing-masing tanpa terkecuali",
    clue_2: "tiap-tiap"
  },
  "sesal": {
    clue_1: "menyesali perbuatan yang telah lampau",
    clue_2: "merasa tidak rela atas sesuatu yang telah terjadi"
  },
  "sehari": {
    clue_1: "satu masa matahari terbenam hingga terbit lagi",
    clue_2: "dua puluh empat jam"
  },
  "berhak": {
    clue_1: "memiliki kuasa atau kewenangan",
    clue_2: "dapat menuntut sesuatu yang semestinya"
  },
  "senior": {
    clue_1: "orang yang lebih tua atau lebih lama dalam suatu jabatan",
    clue_2: "orang yang lebih berpengalaman"
  },
  "persen": {
    clue_1: "satuan untuk menyatakan bagian dari seratus",
    clue_2: "simbol % dalam perhitungan"
  },
  "berisi": {
    clue_1: "memiliki isi atau muatan",
    clue_2: "terdapat sesuatu di dalamnya"
  },
  "seribu": {
    clue_1: "angka 1000",
    clue_2: "sepuluh ratus"
  },
  "sesama": {
    clue_1: "satu golongan atau jenis yang sama",
    clue_2: "saling antara sesuatu yang setara"
  },
  "terisi": {
    clue_1: "sudah penuh berisi",
    clue_2: "sudah terisi barang atau isi"
  },
  "bermain": {
    clue_1: "bersenang-senang dengan suatu kegiatan",
    clue_2: "melakukan aktivitas rekreasi"
  },

  // ═══════════════ TIER 1 additional ═══════════════
  "berjinjit": {
    clue_1: "berdiri dengan ujung kaki saja",
    clue_2: "mengangkat badan dengan ujung kaki",
    clue_3: "Sinonim: mencicit"
  },
};

// ============================================================
// Apply fixes
// ============================================================
let totalFixed = 0;
let totalSkipped = 0;
let totalStillLeaking = 0;

for (let tier = 1; tier <= 10; tier++) {
  const filePath = join(dir, `tier${tier}.ts`);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }
  
  let changed = false;
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\["([a-z]+)"/);
    if (!match) continue;
    const word = match[1];
    
    if (!FIXES[word]) continue;
    
    const fixes = FIXES[word];
    const oldLine = lines[i];
    
    // Extract current clues
    const tupleMatch = oldLine.match(/\["([a-z]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\]/);
    if (!tupleMatch) continue;
    
    const [, , oldClue1, oldClue2, oldClue3] = tupleMatch;
    
    // Apply fixes - only replace clues that are in the FIXES map
    let newClue1 = fixes.clue_1 !== undefined ? fixes.clue_1 : oldClue1;
    let newClue2 = fixes.clue_2 !== undefined ? fixes.clue_2 : oldClue2;
    let newClue3 = fixes.clue_3 !== undefined ? fixes.clue_3 : oldClue3;
    
    // Check if new clues still leak
    const newLine = oldLine
      .replace(`"${oldClue1}"`, `"${newClue1}"`)
      .replace(`"${oldClue2}"`, `"${newClue2}"`)
      .replace(`"${oldClue3}"`, `"${newClue3}"`);
    
    // Verify no leak in new clues
    let stillLeaks = false;
    const rootInfo = getRoot(word);
    if (rootInfo) {
      const derivatives = getDerivativeForms(rootInfo.root);
      const found = containsWholeWord(
        newLine.substring(newLine.indexOf(`"${newClue1}"`)),
        derivatives
      );
      if (found) {
        stillLeaks = true;
      }
    }
    
    if (stillLeaks) {
      console.log(`🔴 tier${tier}.ts: ${word} - NEW CLUE STILL LEAKS!`);
      totalStillLeaking++;
      continue;
    }
    
    if (oldLine === newLine) {
      totalSkipped++;
      continue;
    }
    
    if (isDryRun) {
      console.log(`✅ tier${tier}.ts: ${word}`);
      console.log(`   OLD: ${oldLine.substring(0, 120)}`);
      console.log(`   NEW: ${newLine.substring(0, 120)}`);
      totalFixed++;
    } else {
      lines[i] = newLine;
      changed = true;
      totalFixed++;
      console.log(`✅ tier${tier}.ts: ${word}`);
    }
  }
  
  if (changed && !isDryRun) {
    writeFileSync(filePath, lines.join("\n"), "utf-8");
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${totalFixed}, Skipped: ${totalSkipped}, Still leaking: ${totalStillLeaking}`);
