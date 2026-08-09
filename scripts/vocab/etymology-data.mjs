// ============================================================
// ETYMOLOGY DATA — Kata serapan bahasa Indonesia per bahasa asal.
// Peta terkurasi presisi-tinggi: word -> bahasa asal.
//
// Dipakai oleh scripts/vocab/add-language-origin.mjs untuk menambah
// keterangan "Kata serapan dari bahasa X" ke clue_1 soal yang merupakan
// kata serapan asing (keluhan user: banyak soal bukan bahasa Indonesia
// tapi clue tidak menyebutkan asal bahasanya).
//
// KATA HANYA DIMASUKKAN KALAU ASAL BAHASANYA YAKIN. Kata Melayu asli
// (ada, hari, makan, mandi, baik, tanah, dst) sengaja TIDAK dimasukkan.
// Bahasa daerah (Jawa, Minangkabau, Sunda) tidak dimasukkan karena masih
// dianggap kosakata Nusantara — fokus pada serapan bahasa ASING.
// Sumber: daftar kata serapan terverifikasi (KBBI V, Wikipedia id,
// literatur leksikografi) + kurasi manual.
// ============================================================

export const ETYMOLOGY = {
  // ---- Bahasa Inggris ----
  // Kata sains berakar Yunani (biologi, matematika, fisika, dst) ditaruh di
  // daftar Yunani, bukan di sini, supaya keterangan asal bahasanya akurat.
  Inggris: `komputer televisi internet kamera video radio film sistem data bank bus alarm area unit level format forum menu memo laser radar monitor modem laptop blog tag tank golf safari alumni domain digital digit drum filter freezer horizon horizontal lift militer regional sonar vlog aktivitas artikel bisnis detail dokumen faktor fokus kategori kualitas kuantitas opini prioritas proyek risiko spesial standar tren akun aplikasi diskon link online offline informasi kredit bonus festival museum stadion robot vitamin kalkulator printer modern global formal informal manual material natural normal personal sensor elektronik mekanik praktis praktisi klinis klinik kritis kreatif kreativitas konstruksi konsumsi produksi distribusi komunikasi institusi struktur fungsi situasi organisasi partisipasi evaluasi motivasi imajinasi observasi formasi inovasi navigasi variasi reaksi aksi interaksi apresiasi asosiasi kompetisi komposisi ekspresi depresi posisi proposal eksposisi imposisi proposisi disposisi impresi represi progresi regresi suksesi seksi agresif aliansi alkohol artifisial asumsi atraktif autentik basis katering klandestin klik kokpit koin koktail komunitas konseling diktator donat debat dinasti efektif efisiensi ekstra faks fleksibel glamor gol gosip gorila grup horor imperialis impulsif instan insting instrumen isolasi maraton maskot misterius milenium notifikasi orisinal objektif paradigma paradoks partikel paten permanen prematur psikolog program protes pai problem proyektor privasi royalti sampel skuter subjek subjektif survei soda skip suvenir trailer target tornado teror unifikasi unik ilegal galaksi kristal piramida produk stetoskop super jurnalis final fiksi komersial maskulin deodoran galeri legenda labirin klip sir`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Belanda ----
  Belanda: `kantor polisi sepeda kulkas handuk ember bensin dasi dompet ongkos wortel karcis apotek rokok lampu arloji bengkel bioskop asbak kuitansi garansi pabrik persen sanksi dosen gaji kabel steker saklar dongkrak ban rem kopling baut sekrup mur jas rok sandal kaus kancing wastafel gorden syal knalpot spion setir plat nomor bom roket peluru senjata mesiu meriam jenderal kapten letnan prajurit brigade divisi komandan artileri barak kompi batalyon infanteri kavaleri logistik amunisi korps markas apel disiplin absen izin cuti pensiun tunjangan anggaran kas bon nota faktur kwitansi rekening deposito giro utang asuransi polis premi klaim agen komisi kupon obligasi saham laba omzet neraca audit akuntan akuntansi pembukuan piutang wesel cek abiturien admiral advertensi akademi aklamasi aksen aktif akur akurat aktor aktris altar amatir ambisi anonim antik aparatur apartemen aransemen arbitrase aroma arsip arsitektur arteri atlet atraksi bakteri balkon balok bandit bangkrut baut beton biografi biro bis biskuit blokir brankas bros brosur bursa cokelat dansa dek dekan delegasi deportasi diagonal diagram dialog dinas dok dokter donor duet egois eksemplar eksklusif elementer fasilitas firma fisik fisiologi frekuensi fusi fakultas gang garnisun grafik granat gratis gubernur halte hotel helikopter helm ideal identik identitas impas importir imun infeksi injeksi inspektur instalasi instansi institut instruksi intens intim intuisi inventaris jangkar jeli kafetaria kaliber kalkun kalori kampanye kandidat kantin kapasitas kapel karantina karier kasir kaset kasus kerah keran kilometer kios klakson klasemen klasik koki kolega koleksi kolektif kolonel koloni kolonial kombinasi komite kompensasi kompor komplikasi kompas kondisi koneksi konferensi kongres konsensus konstitusi konsulat kontingen kontrak konvoi koper kopral koran koreksi korsleting kritik kostum kriminal kuas kubus kurir korupsi kaktus lap las label lensa lisensi listrik lokasi lokomotif lusin makelar maksimal mandat maniak mantel marmer massal maskapai massa materi mayor mayoritas medali menit miliar miliuner mineral miniatur minimal minus misa misionaris mistik mobilisasi modus monopoli montir monumen mosi motif mumi mutasi motel naif netral nol onderdil operasi optimis oranye organ organik orientasi oval paket panik panorama parade paragraf paralel parasit parasut partai patroli pelat peleton peluit penalti perban periodik permen pers petisi pipa pir plester puisi pompa porsi postur pot potensi potret predikat preman preseden presiden prestasi prestise primitif promotor propaganda protokol proyektil puding pulpen rabies radiator radikal rak ransel realisasi referensi refleks registrasi rektor rel religius republik reputasi resep resepsi resolusi reuni ronde rotasi sabotase sadis salut saus segel sekop sekoci sekrup sekte sektor selang selai seminari sen sensasi sentimeter serbet serius sersan sertifikat simpati sipir sipil sirkulasi sirkus skala skema skenario sketsa skor sol sop sosial sosis spesifik staf stan stasiun stempel stok sukses suster taktik tang tangki teknis telat telegram teras terminal tiket toilet tomat tong tragis transparan transaksi turis tenis ventilasi vital volume visi voli wol model monster norma plastik satelit mesin sup provinsi adempauze afdeling apartheid belasting hop over overdosis register`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Arab ----
  Arab: `abad abadi akal ahli akibat akhir alamat alam alim aman amal asal asli awam bab badan bahaya bait daftar dunia derajat doa hadiah haji hakim halal haram harfiah huruf ibadah ikhlas iklan ilmu iman istirahat izin jadwal jawab jenis jin judul kabar kafir kertas khawatir kiamat kitab khusus kursi maaf mahal makna malaikat manfaat markas masjid maut mimbar miskin musibah mustahil nafsu nasib niat pahala rahmat rakyat riwayat rukun sabar sah salam sehat sejarah selamat setia sifat sinar sujud surat syarat syukur taat takdir tamat tegas tertib tobat ujian umat umum umur usul wajib waktu yakin yatim zaman adat ajal amar hal imam jasad kaum khas keramat kuliah kubur kadar munafik musyawarah mahkamah makam sahabat wasiat akrab ajaib akbar akhirat ayat wujud hamil hasil ijazah istilah makalah salju wakil kasur iklim sabtu menara musim abu din habibullah hut jadi jamal kamar malik rabi rai ria sadar saraf`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Sanskerta ----
  Sanskerta: `agama angkasa asmara bahasa bahagia bahtera bangsawan benda bencana berita biaya budi bumi budaya bangsa mitra anugerah cahaya cakrawala cakra cinta darma dewa dewi dosa duka gerhana gita guru indah istana istri jaya jiwa kaca karya kasta kesatria kota kuasa keluarga lagu lambat leluhur manusia menteri merdeka nama negara neraka pahala pahlawan pejabat pelajaran pena perang perdana perintah perkasa pertama perwira puja pujangga pura putra putri raja rakyat samudra surya suara suci surga takhta tatkala usaha usia utama wanita warta wibawa wisata sangsi arus`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Portugis ----
  Portugis: `algojo bangku bendera biola bola boneka botol dadu gereja gudang jendela keju kemeja lemari mangga meja mentega minggu nanas pesta renda saku sepatu tenda tinta tuala garpu nona piring arena armada asma beranda domino kereta lelang lentera legal mandor nyonya palsu pesiar pita ras sofa celana topi`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Tionghoa (Hokkien/Mandarin) ----
  // "tahu" (tahu kedelai) & "suhu" (guru) TIDAK dimasukkan: di data soal, "tahu"
  // berarti "mengetahui" (Melayu asli) dan "suhu" berarti "temperatur" —
  // homograf yang kalau ditandai jadi salah kaprah.
  Tionghoa: `bakmi bakpau bakso bihun cakwe capcai cincau gincu hoki kecap kelontong kongsi kuaci kuih loteng lumpia mie pangsit sampan shio tauco tauge tauke teh teko angpau becak cici encim cincai bakpia kuotie juhi taoge`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Jepang ----
  Jepang: `anime bento bonsai judo karate kimono manga ninja origami romusha sake samurai sashimi sushi tsunami`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Persia ----
  Persia: `acar anggur baju bazar bidadari bubur cadar destar gandum istana kismis kurma laskar nakhoda nisan pasar pelita piala piring saudagar seluar taman tamasya topan`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Tamil ----
  Tamil: `badai kapal keledai perisai toko kuli candu`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Hindi ----
  Hindi: `roti samosa kari`.split(/\s+/).filter(Boolean),

  // ---- Bahasa Yunani ----
  Yunani: `atom biologi demokrasi ekonomi filosofi fisika fotografi geografi gram liter matematika meter mikroskop politik telepon teleskop energi kimia astronomi drama etika hipotesis ideologi krisis logika mekanisme metode musik strategi teori`.split(/\s+/).filter(Boolean),
};

/** Balikkan peta jadi word -> bahasa. */
export function buildWordToLang() {
  const m = new Map();
  for (const [lang, words] of Object.entries(ETYMOLOGY)) {
    for (const w of words) {
      if (!m.has(w)) m.set(w, lang);
    }
  }
  return m;
}
