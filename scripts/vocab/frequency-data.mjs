// ============================================================
// INDEKS FREKUENSI PLAN-045 — tingkat keumuman kata bahasa Indonesia.
//
// Sumber: kurasi manual kata sehari-hari (kata yang dipakai anak &
// pemula setiap hari), kata dari tier1 (sudah dikurasi PLAN-026 sebagai
// "kata mudah, konkret, sehari-hari"), + heuristik penanda kata jarang
// (sufiks/panjang kata, istilah khusus).
//
// Tingkat: SANGAT_UMUM (tier 1-2) > UMUM (tier 3-4) > JARANG (5-7) >
// SANGAT_JARANG (8-10).
// ============================================================

// ---- Kata SANGAT UMUM: dipakai sehari-hari oleh semua orang ----
// Diambil dari tier1 (kurasi PLAN-026) + kata umum tier2/3 + kurasi manual.
export const SANGAT_UMUM = `
kucing anjing ayam bebek angsa burung elang merpati beo gagak ikan lele udang
kepiting cumi gurita katak kodok kadal buaya penyu ular kuda sapi kerbau kambing
domba kelinci tikus gajah badak jerapah zebra singa harimau macan beruang monyet
kera rusa kancil tupai landak babi unta lebah tawon semut nyamuk lalat capung
jangkrik belalang cacing siput kelelawar paus lumba nasi beras bubur roti kue
donat bakso soto sate telur tempe keju susu mentega minyak garam gula kecap
sambal cabai bawang tomat kentang wortel bayam kangkung kubis jagung pisang
mangga jeruk anggur durian rambutan pepaya nanas kelapa semangka melon jambu
sawo salak singkong ubi gandum tepung madu permen cokelat es air teh kopi jus
sirup kepala rambut wajah dahi alis mata hidung pipi bibir mulut gigi lidah
telinga leher bahu lengan tangan jari kuku siku dada perut punggung pinggang
lutut kaki tumit darah kulit tulang otak jantung paru hati usus rumah kamar
dapur ruang pintu jendela dinding lantai atap tangga pagar halaman taman meja
kursi bangku lemari kasur bantal selimut kain lampu lilin kompor panci wajan
piring mangkuk gelas sendok garpu pisau gunting palu gergaji paku kunci cermin
sisir sabun sikat handuk ember gayung sapu kotak keranjang botol vas matahari
bulan bintang awan langit angin hujan petir kilat pelangi embun kabut salju
udara bumi gunung bukit lembah sungai danau laut pantai pulau ombak pasir batu
tanah lumpur debu api asap hutan pohon ranting daun bunga rumput akar batang
duri buah biji ibu ayah bapak kakek nenek kakak adik paman bibi anak bayi gadis
pemuda pria wanita keluarga saudara tetangga teman sahabat musuh tamu guru
dokter perawat polisi tentara pilot sopir nelayan petani pedagang tukang koki
penyanyi penulis pengacara hakim raja ratu pangeran putri pahlawan kapten
pelaut makan minum tidur bangun mandi cuci siram tanam panen potong iris pukul
tendang lempar tangkap pegang ambil beri terima kirim antar jemput tunggu cari
panggil jawab tanya nyanyi tari lompat lari jalan naik turun masuk keluar buka
tutup padam beli jual bayar simpan buang taruh gantung lipat rebus goreng
panggang bakar campur aduk tuang seduh kunyah telan gigit peluk duduk renang
besar kecil tinggi pendek panjang lebar sempit tebal tipis berat ringan cepat
lambat jauh dekat panas dingin hangat sejuk terang gelap cerah kering basah
kotor bersih indah cantik jelek buruk baik jahat ramah galak jinak liar buas
pintar pandai bodoh rajin malas berani sedih senang gembira marah tenang heran
bingung jujur adil kaya miskin lapar haus kenyang segar lelah sehat sakit kuat
lemah keras lunak halus kasar tajam tumpul licin lurus bengkok bulat bundar
datar miring utuh pecah retak penuh kosong ramai sepi sunyi harum wangi busuk
asin manis pahit asam pedas tawar enak lezat kota desa kampung pasar toko
warung kantor sekolah masjid gereja candi museum stasiun bandara pelabuhan
jembatan sawah ladang kebun kolam lapangan gedung hotel buku pensil pulpen
kertas penghapus penggaris papan kapur spidol dompet uang gaji harga ongkos
surat amplop koran majalah berita telepon radio televisi orang manusia
jangan sangat pernah datang tempat sedang sekali sampai ketika bicara selalu
tolong sayang setiap selama merasa pulang segera memang bagian paling peduli
hampir alasan serius abad orang pergi adat ahli bagus akal waktu arti alam
alat dunia asli atur tuhan aman asal aksi sama kata hari malam pagi siang sore
nama usia umur panjang sehat pintar cerdas cerdik jenius anak sekolah belajar
membaca menulis berhitung menggambar bermain olahraga sepak bola bulu tangkis
renang lari jalan tidur bangun makan minum masak belanja bekerja main pulang
pergi datang mau ingin akan bisa harus boleh tidak ya tentu mungkin juga lagi
masih sudah belum pernah sering jarang selalu kadang sekarang kemarin besok
lusa tadi nanti dulu kemudian setelah sebelum ketika karena jadi tetapi
melainkan atau dan dengan untuk dari ke di pada kepada bagi oleh tanpa
// ---- Kata umum yang saat ini ada di tier3 (ditarik ke tier2) ----
hilang menuju cerita antara negara muncul semoga tampak sering segala kurang
mundur barang saling hingga karir selain pindah korban sistem nyonya lazim
maksud tengah posisi tujuan khusus kamera mujur cahaya nalar sejauh pistol
bahaya daftar nyaman daging sampah bohong daerah angkat normal tumbuh dewasa
urusan sesal hancur menari bangga lubang aturan negeri jumlah tampan kencan
pemain watak santai sersan mantan lelaki target anggap cerdas energi hormat
berdoa sumber pasien sentuh cincin hutang ribuan kangen sukses kuliah seumur
gratis rakyat dahulu kadang takdir kontak lembut proyek sehari malang tenaga
gudang boneka komedo sembuh berhak kreasi lontar nonton pabrik kecewa pahala
lanjut menipu bangsa mainan remaja mampir publik setuju sempat berkat serang
impian jarang kampus senyum jadwal senior lautan contoh tabiat lancar buatan
animasi ilegal stabil sosial persen muntah berkas pelaku dorong risiko tembok
tambah penipu adegan kredit berisi bidang akibat partai penari simbol kostum
patung ganggu syarat kembar sepupu topeng teknik lorong tampil capaian sarang
solusi bensin divisi seribu cicilan langka sidang produk ucapan ikatan teknis
klasik pusing junior pidato modern status curang kalung sampel reaksi aliran
sesaat pirang gendut memori hendak padang siaran justru nyaris hakikat runtuh
sarung pujian rantai meraih selera lenyap budaya jajanan terapi garasi mental
urutan ilmiah global curiga terbit klinik terjun tegang metode studio keliru
hitung asrama tempur cairan tipuan pinjam sesama untung sekutu miliar konser
tangki celaka jantan latihan mantel ramuan cedera ekstra tabung jangka bagasi
manual sirkus gelang sektor detail harian desain semula cabang kontes swasta
kaleng tebing elemen melamun tombak atasan paspor teater granat armada betina
pemula basket jurang konsep magnet lumpuh materi kritis gejala portal berbau
utusan komite fungsi karpet muslim pondok gairah dampak matang pangkal dugaan
teriak sensor nikmat magang banjir mantap fisika profil rangka sangka tertua
pelopor denyut taktik akurat bandar merayu laptop progres aktris rampung
hasrat doktor tanduk benang naskah tunduk bandit kemudi relawan kulkas paduan
teliti protes editor karang payung melaju ternak cerdik jernih santun lantas
vaksin karbon rentan serupa terisi komisi jaring parfum jurnal mertua visual
memuji lembur poster naluri lembar diskon pesona musnah nurani mangsa muatan
respons ringkas sedekah ginjal musisi limbah ayunan kursus unggul masker
sambut lajang ambang kerang galeri siklus formal tonton gabung parade piknik
logika rahmat sketsa dayung kapsul goyang tabrak buruan karate berkah kejang
sepele wisata pemicu peluit riak satuan faktor senter tablet ajaran kartun
bankir elegan lelang sastra pidana dialog tangkis mentah kompas loncat selang
hormon balkon agenda kantin jempol antena sampul ransel tumpah sirene silang
komedi rahang timbul guntur syukur kurung puding gorila berjuang cermat serasi
busana murung cadangan asmara serial hiasan pimpin grafik sekrup arloji oranye
tembus volume serbuk mungil ganjil bersin potret kalori bising ulasan satpam
hangus instan netral karakter ukiran angkuh stiker bandel enggan dukung kincir
derita bening simpulan sulung dagang suplai kambuh serbet anonim panjat kumpul
takjub mereda survei lampau montir makmur apotek sarana melodi kardus dilema
tungku kritik gawang tunjuk usulan tilang slogan empati kolega lincah ibadah
jualan luncur brosur alumni riasan kanvas donasi selada fitnah hanyut tempuh
privat tuntut maling polusi sumpit bintik tender rohani siasat karier maklum
tertib wisuda ijazah lendir pasrah tayang aparat gembok durasi maskot barter
esensi podium lentur manjur merica jemaat pangan memacu cemara mandor kaktus
marmer kronis wahana kompak imbang menuai rektor gading pundak steril indeks
blokir karcis kelabu mandat nuansa rotasi ikhlas pantau vektor ocehan dialek
postur grafis sembah seprai zodiak
`.split(/\s+/).filter(Boolean);

// ---- Penanda kata JARANG / SANGAT JARANG (istilah khusus, sastra, teknis) ----
export const RARE_SUFFIX_RE =
  /(isasi|isasi|isme|ologi|ograf|ografi|ografis|ometer|oskop|onomi|onomis|nomi|tas|wati|wanwati|ika|ensi|itas|ikasi|ektomi|ektasi|emia|emik|genik|genesis|sintesis|analisis|sis)$/;
export const RARE_PREFIX_RE = /^(ketidak|keper|keter|penyem|pembe|penge|perlamb|terper)/;

// Kata yang jelas UMUM (tier 3-5) meski bukan "sangat umum" — dipakai
// pendekatan audit (tidak untuk re-sort otomatis).
export const UMUM = `
perkutut absah antre bisul riuh bugar debit dusun dalih cipta kemari alasan
absah wilayah daerah kabupaten provinsi kecamatan kelurahan desa kepala
sekretaris bendahara ketua wakil anggota panitia rapat acara agenda jadwal
pengumuman undangan hadiah piala medali piagam sertifikat ijazah rapor nilai
ujian tugas pr sekolah kelas ruang guru murid siswa pelajar mahasiswa
perpustakaan laboratorium kantin seragam topi dasi sepatu sandal kaos baju
celana rok jas jaket sweater syal sarung kain batik songket tenun anyaman
kerajinan ukiran patung lukisan gambar foto kamera lensa layar proyektor
panggung layar film drama komedi aksi petualangan sejarah pendidikan
kesehatan lingkungan sampah daur ulang polusi pencemaran bencana banjir
gempa tsunami gunung meletus angin topan kekeringan musim kemarau hujan
panen sawah padi gabah beras nasi lauk sayur buah jajan pasar swalayan
minimarket supermarket apotek toko kios warung kaki lima restoran rumah makan
kafe kedai angkringan gerobak jual beli dagang usaha modal untung rugi laba
`.split(/\s+/).filter(Boolean);
