// ============================================================
// DATA PLAN-026 — perbaikan kualitas soal seluruh tier.
//   FIX_CLUES     : ganti penuh tuple tier1 (kata + 3 clue) yang
//                   clue-nya bocor (word-boundary).
//   SCRAMBLED_FIX : perbaiki 4 entri tier1 yang field kata-nya
//                   tertimpa bug engine v1 (kunci = field kata salah).
//   PART1_FIX     : patch kecil pada kandidat PART1.
//   SWAP          : ganti SELURUH entri kata bermasalah di tier 2-10
//                   ("word|tier" -> [word, c1, c2, c3] baru).
// Kata pengganti SWAP dipilih dari pool kata BEBAS (tidak ada di
// tier 1-10 lain) sehingga dedup global tidak memangkas tier lain.
// ============================================================

// ---- Tier 1: ganti penuh tuple (kata + 3 clue) yang clue-nya bocor ----
export const FIX_CLUES = {
  kuda: ["hewan besar yang bisa ditunggangi", "hewan berkaki empat yang berlari kencang", "Sinonim: hewan tunggangan"],
  cacing: ["hewan lunak panjang tak berkaki yang hidup di tanah", "hewan yang suka muncul saat hujan", "Hewan lunak beruas tanpa kaki"],
  bubur: ["makanan lembek dari beras yang dimasak dengan banyak air", "makanan hangat untuk bayi atau orang sakit", "Hidangan hangat yang lembut"],
  susu: ["cairan putih yang dihasilkan hewan ternak", "minuman yang baik untuk tulang", "Minuman putih kaya kalsium"],
  garam: ["bumbu asin yang berasal dari laut", "bubuk putih yang ditaburkan ke makanan", "Sinonim: natrium klorida"],
  bawang: ["umbi berlapis yang dipakai sebagai bumbu", "bahan masakan yang membuat harum", "Bumbu dapur yang berlapis"],
  kentang: ["umbi yang digoreng atau direbus", "bahan membuat keripik dan perkedel", "Bahan utama membuat keripik"],
  mangga: ["buah kuning manis yang berbiji pipih", "buah yang dijuluki raja buah", "Sinonim: mempelam"],
  anggur: ["buah kecil berkelompok yang manis", "buah yang dijadikan wine", "Buah kecil yang berkelompok"],
  jambu: ["buah yang bijinya banyak dan rasanya manis", "buah yang daunnya berkhasiat", "Buah yang bisa dibuat jus"],
  sawo: ["buah cokelat manis berpasir", "buah yang rasanya manis seperti gula", "Buah manis bertekstur pasir"],
  cokelat: ["makanan manis dari biji kakao", "Snack manis yang meleleh di mulut", "Sinonim: coklat"],
  teh: ["Minuman hangat dari daun kering", "minuman yang biasa diminum pagi hari", "Minuman seduh yang harum"],
  kopi: ["Minuman hitam dari biji sangrai", "minuman yang membuat melek", "Sinonim: kahwa"],
  rambut: ["serat halus yang tumbuh di kepala", "bagian tubuh yang disisir", "Antonim: botak"],
  alis: ["rambut halus di atas mata", "lengkung pelindung mata", "Buluh halus pelindung mata"],
  pipi: ["bagian wajah di samping hidung", "bagian wajah yang merona saat malu", "Bagian wajah yang sering dicubit"],
  jari: ["bagian ujung tangan yang beruas-ruas", "bagian tangan untuk menunjuk", "Bagian tangan yang beruas"],
  dada: ["bagian depan tubuh antara leher dan perut", "bagian tubuh tempat jantung berada", "Antonim: punggung"],
  paru: ["organ tubuh untuk bernapas", "organ yang mengembang saat menarik napas", "Organ tempat oksigen diserap"],
  usus: ["saluran pencernaan setelah lambung", "bagian tubuh yang menyerap sari makanan", "Saluran pencernaan yang berkelok"],
  tangga: ["Jalan naik yang bertingkat-tingkat", "alat untuk memanjat ke tempat tinggi", "Sinonim: jenjang"],
  kunci: ["alat untuk membuka gembok", "benda yang dimasukkan ke lubang pintu", "Sinonim: pembuka gembok"],
  sabun: ["bahan untuk membersihkan tubuh", "benda yang berbusa saat digosok", "Pembersih yang menghasilkan buih"],
  akar: ["bagian tanaman yang berada di dalam tanah", "bagian pohon yang menyerap air", "Bagian pohon yang tertanam"],
  putri: ["anak perempuan raja", "anak perempuan yang bangsawan", "Antonim: pangeran"],
  mandi: ["membersihkan badan dengan air", "Membasuh badan dengan air", "Sinonim: siram badan"],
  panggil: ["memanggil nama seseorang", "menyuruh datang dengan suara", "Sinonim: mengundang"],
  gigit: ["menjepit dengan gigi", "menggigit apel", "Antonim: menjilat"],
  segar: ["Badan terasa bugar", "udara pagi yang menyehatkan", "Antonim: lelah"],
  pecah: ["terbelah menjadi bagian-bagian", "cermin yang jatuh dari dinding", "Antonim: utuh"],
  sekolah: ["tempat belajar murid", "gedung tempat belajar", "Tempat menuntut ilmu"],
  radio: ["alat penerima siaran suara", "alat yang menyiarkan berita", "Alat pendengar siaran"],
  motor: ["kendaraan roda dua", "kendaraan yang dikendarai dengan helm", "Kendaraan roda dua bermesin"],
  kereta: ["kendaraan panjang berjalan di rel", "transportasi umum dari stasiun ke stasiun", "Bergerak di atas rel baja"],
  dasi: ["kain panjang yang dikalungkan di leher", "aksesori untuk baju formal", "Sinonim: tali leher"],
  sepak: ["menyepak dengan kaki", "menendang bola", "Sinonim: menendang"],
  tenis: ["olahraga dengan raket dan bola kecil", "olahraga yang dimainkan di lapangan", "Olahraga bola dengan raket"],
  dadu: ["benda kecil berbentuk kubus bersisi angka", "alat permainan yang dilempar", "Benda kecil bersisi angka"],
  gulat: ["olahraga adu kekuatan dengan menjatuhkan lawan", "pertandingan saling menjatuhkan", "Sinonim: bergulat"],
  tanggal: ["angka penanda hari dalam bulan", "tertulis di kalender dinding", "Merah di kalender berarti libur"],
  alamat: ["tempat tinggal seseorang yang dituju", "keterangan lokasi di amplop", "Sinonim: lokasi"],
  kabar: ["berita atau informasi", "yang dicari orang ketika heboh", "Sinonim: warta"],
  kejutan: ["hal yang tiba-tiba dan tak disangka", "hadiah ulang tahun yang disembunyikan", "Sinonim: surprise"],
  nada: ["bunyi yang beraturan tinggi rendahnya", "ada tujuh tingkatan dalam musik", "Antonim: senyap"],
  arah: ["jurusan atau tujuan", "mata angin menunjukkan ini", "Sinonim: haluan"],
};

// 4 entri yang field kata-nya ikut tertimpa oleh bug engine v1 (c1 fix
// menimpa posisi kata). Kunci = field kata yang salah, nilai = tuple benar.
export const SCRAMBLED_FIX = {
  "Minuman hangat dari daun kering": ["teh", "Minuman hangat dari daun kering", "minuman yang biasa diminum pagi hari", "Minuman seduh yang harum"],
  "Minuman hitam dari biji sangrai": ["kopi", "Minuman hitam dari biji sangrai", "minuman yang membuat melek", "Sinonim: kahwa"],
  "Jalan naik yang bertingkat-tingkat": ["tangga", "Jalan naik yang bertingkat-tingkat", "alat untuk memanjat ke tempat tinggi", "Sinonim: jenjang"],
  "Badan terasa bugar": ["segar", "Badan terasa bugar", "udara pagi yang menyehatkan", "Antonim: lelah"],
};

// ---- Tier 1 part1: patch kecil pada kandidat PART1 (bocor word-boundary) ----
export const PART1_FIX = {
  sebelas: { c3: "Lima ditambah enam" },
  melepuh: { c3: "Antonim: mulus" },
  kumur: { c1: "Membersihkan mulut dengan air lalu membuangnya" },
};

// ---- Tier 2-10: ganti kata bermasalah dengan kata baru ----
// Kata pengganti diambil dari pool bebas (tidak ada di tier lain),
// jadi dedup global tidak memangkas tier lain.
export const SWAP = {
  // tier2 — kata tugas, pasif, noise, nama diri
  "untuk|2": ["merak", "burung besar berbulu indah", "burung dengan ekor yang bisa mengembang", "Ekor jantannya seperti kipas"],
  "siapa|2": ["kakatua", "burung berjambul yang bisa meniru suara", "burung peliharaan yang cerdas", "Jambulnya berwarna-warni"],
  "sebab|2": ["parkit", "burung kecil berwarna cerah", "burung peliharaan yang riang", "Sering dipelihara dalam sangkar"],
  "serta|2": ["jalak", "burung hitam yang pandai meniru suara", "burung yang sering dilatih bicara", "Sinonim: burung beo"],
  "ialah|2": ["murai", "burung berkicau berekor panjang", "burung lomba kicau yang populer", "Ekornya panjang dan indah"],
  "diuji|2": ["tekukur", "burung mirip merpati bersuara khas", "burung yang suaranya seperti mengetuk", "Sinonim: burung derkuku"],
  "allah|2": ["biawak", "kadal besar yang hidup di darat dan air", "reptil besar berlidah bercabang", "Sinonim: kadal besar"],
  "islam|2": ["komodo", "kadal raksasa khas Indonesia", "hewan purba dari Pulau Komodo", "Sinonim: biawak komodo"],
  "hindu|2": ["tokek", "cicak besar yang bersuara tokek", "kadal malam yang sering di dinding", "Suaranya terdengar di malam hari"],
  "germo|2": ["bunglon", "kadal yang bisa mengubah warna kulit", "hewan yang menyamar dengan warna", "Sinonim: kadal pohon"],
  "henry|2": ["iguana", "kadal besar berduri di punggung", "kadal herbivora dari daerah tropis", "Sinonim: kadal iguana"],
  "paris|2": ["kobra", "ular berbisa dengan leher mengembang", "ular yang bisa mendesis keras", "Sinonim: ular sendok"],
  "maria|2": ["belut", "ikan panjang licin yang hidup di lumpur", "ikan mirip ular di sawah", "Sinonim: ikan belut"],
  "megan|2": ["gurame", "ikan air tawar yang lezat digoreng", "ikan budidaya yang suka melompat", "Sinonim: ikan gurame"],
  "jamal|2": ["patin", "ikan air tawar berbadan panjang", "ikan yang sering dibuat sup asam", "Sinonim: ikan patin"],
  "wanda|2": ["gabus", "ikan air tawar yang kuat di lumpur", "ikan predator di rawa", "Sinonim: ikan gabus"],
  "duane|2": ["tenggiri", "ikan laut yang enak dijadikan sambal", "ikan berbadan panjang dari laut", "Sinonim: ikan tenggiri"],
  "samir|2": ["kakap", "ikan laut yang dagingnya tebal", "ikan favorit untuk digoreng", "Sinonim: ikan kakap"],
  "talon|2": ["bawal", "ikan laut berbadan pipih", "ikan yang sering digoreng utuh", "Sinonim: ikan bawal"],
  "pines|2": ["kijang", "rusa kecil yang larinya cepat", "hewan herbivora bertanduk kecil", "Sinonim: rusa kecil"],
  "orion|2": ["luwak", "musang pemakan biji kopi", "hewan kecil penghasil kopi terkenal", "Sinonim: musang"],
  "venus|2": ["entok", "bebek besar berwarna gelap", "unggas air yang jinak", "Sinonim: itik manila"],
  "hindi|2": ["itik", "unggas air penghasil telur", "bebek kecil peliharaan", "Sinonim: bebek"],
  // tier3 — kata tugas & pasif
  "adalah|3": ["perkutut", "burung merpati kecil bersuara merdu", "burung yang sering dipelihara orang Jawa", "Sinonim: burung perkutut"],
  "supaya|3": ["kutilang", "burung kecil berjambul hitam", "burung yang riang berkicau", "Sinonim: burung kutilang"],
  "engkau|3": ["kuntul", "burung putih berkaki panjang", "bangau putih yang berdiri di sawah", "Sinonim: bangau putih"],
  "dijual|3": ["pelikan", "burung besar berparuh berkantong", "burung pemakan ikan berparuh panjang", "Sinonim: burung undan"],
  // tier4 — pasif & -nya & noise
  "dimakan|4": ["cecak", "reptil kecil perekat di dinding", "hewan kecil pemakan nyamuk", "Sinonim: cicak"],
  "dibakar|4": ["keong", "hewan bercangkang yang merayap pelan", "siput yang hidup di air", "Sinonim: siput"],
  "dikejar|4": ["bekicot", "siput besar yang bisa dimakan", "keong darat berukuran besar", "Sinonim: siput besar"],
  "ditanam|4": ["rajungan", "kepiting laut dengan capit", "kepiting yang hidup di pasir pantai", "Sinonim: kepiting laut"],
  "kristus|4": ["wereng", "serangga kecil pengisap padi", "hama padi yang merusak tanaman", "Sinonim: hama wereng"],
  "rasanya|4": ["berudu", "anak katak yang hidup di air", "kecebong berekor", "Sinonim: kecebong"],
  "rupanya|4": ["kasuari", "burung besar tak bisa terbang dari Papua", "burung dengan jambul di kepala", "Sinonim: burung kasuari"],
  "tadinya|4": ["tapir", "hewan berbelalai pendek berkulit tebal", "hewan mirip babi bermoncong panjang", "Sinonim: hewan tapir"],
  "agaknya|4": ["bajing", "hewan pengerat yang pandai melompat", "hewan kecil berekor lebat", "Sinonim: tupai"],
  // tier5 — pasif & -nya
  "dimaksud|5": ["mencit", "tikus kecil yang sering dipakai percobaan", "tikus putih berukuran kecil", "Sinonim: tikus kecil"],
  "semuanya|5": ["hamster", "hewan pengerat kecil yang dipelihara", "hewan mungil suka mengumpulkan makanan", "Sinonim: marmut kecil"],
  "akhirnya|5": ["cheetah", "kucing besar yang berlari paling cepat", "macan tutul dengan bintik hitam", "Sinonim: macan tutul"],
  "biasanya|5": ["leopard", "kucing besar berbintik", "macan tutul pemburu di pohon", "Sinonim: macan bintang"],
  "nantinya|5": ["alpaka", "hewan berbulu tebal mirip llama", "hewan penghasil wol halus", "Sinonim: llama kecil"],
  "layaknya|5": ["bison", "kerbau liar berbulu tebal", "hewan besar dari padang rumput", "Sinonim: kerbau Amerika"],
  // tier6 — kata tugas, pasif, -nya
  "sedangkan|6": ["siamang", "kera hitam bersuara nyaring", "primata lengan panjang", "Sinonim: kera siamang"],
  "dikandung|6": ["tarsius", "primata kecil bermata besar", "hewan mungil dari Sulawesi", "Sinonim: kera hantu"],
  "segalanya|6": ["pesut", "mamalia air tawar yang ramah", "lumba-lumba sungai di Kalimantan", "Sinonim: lumba-lumba air tawar"],
  "tampaknya|6": ["dugong", "mamalia laut pemakan rumput laut", "hewan laut yang jinak", "Sinonim: duyung"],
  "sebaiknya|6": ["walrus", "hewan laut besar bertaring panjang", "singa laut dari daerah dingin", "Sinonim: gajah laut"],
  "selamanya|6": ["aligator", "reptil besar mirip buaya", "buaya dari daerah tropis", "Sinonim: buaya amerika"],
  "akibatnya|6": ["kaiman", "reptil mirip buaya yang lebih kecil", "buaya kecil dari Amerika", "Sinonim: buaya kecil"],
  "ketiganya|6": ["emu", "burung besar tak bisa terbang dari Australia", "burung tinggi berleher panjang", "Sinonim: burung unta Australia"],
  "seutuhnya|6": ["lovebird", "burung kecil yang setia pada pasangannya", "burung cinta yang jinak", "Sinonim: burung cinta"],
  "sebisanya|6": ["nuri", "burung berwarna cerah dari timur", "burung beo kecil berwarna merah", "Sinonim: burung kakatua kecil"],
  "sekiranya|6": ["walet", "burung kecil penghasil sarang mahal", "burung yang sarangnya dari air liur", "Sinonim: burung walet"],
  "sesukanya|6": ["pipit", "burung kecil yang suka memakan padi", "burung pengganggu di sawah", "Sinonim: burung pipit"],
  // tier7 — pasif & -nya
  "dipanggang|7": ["mandrill", "kera besar berwajah warna-warni", "primata dari Afrika", "Sinonim: kera mandrill"],
  "sebenarnya|7": ["babun", "kera besar bermoncong panjang", "primata yang berjalan di tanah", "Sinonim: monyet babun"],
  "seharusnya|7": ["marmot", "hewan pengerat yang suka bersiul", "hewan mirip tikus besar", "Sinonim: tikus gunung"],
  "setidaknya|7": ["terwelu", "hewan mirip kelinci yang liar", "kelinci yang hidup di hutan", "Sinonim: kelinci liar"],
  "secepatnya|7": ["menjangan", "rusa besar bertanduk panjang", "hewan herbivora bertanduk besar", "Sinonim: rusa besar"],
  "sebaliknya|7": ["garangan", "musang kecil pemakan ular", "hewan lincah pemburu tikus", "Sinonim: luwak kecil"],
  "seterusnya|7": ["sigung", "hewan hitam putih berbau menyengat", "hewan yang menyemprot bau busuk", "Sinonim: skunk"],
  "semestinya|7": ["bulus", "kura-kura air tawar", "reptil bercangkang yang berenang", "Sinonim: kura-kura air"],
  "sebetulnya|7": ["sidat", "ikan panjang seperti belut", "ikan yang hidup di air tawar", "Sinonim: ikan sidat"],
  "sepatutnya|7": ["lemuru", "ikan laut kecil berkelompok", "ikan kecil untuk sarden", "Sinonim: ikan lemuru"],
  "sasarannya|7": ["tongkol", "ikan laut yang mirip tuna kecil", "ikan yang sering dibuat pindang", "Sinonim: ikan tongkol"],
  "sedikitnya|7": ["kembung", "ikan laut yang biasa digoreng", "ikan kecil yang lezat", "Sinonim: ikan kembung"],
  "selebihnya|7": ["cakalang", "ikan laut untuk membuat pindang", "ikan yang diasap menjadi kayu", "Sinonim: ikan cakalang"],
  "selayaknya|7": ["delik", "burung kecil yang suka berkicau", "burung pemakan serangga", "Sinonim: burung kecil"],
  "secukupnya|7": ["punai", "burung merpati hijau", "burung hutan yang jinak", "Sinonim: burung punai"],
  "sewajarnya|7": ["kalong", "kelelawar besar pemakan buah", "kelelawar raksasa di pohon", "Sinonim: kelelawar besar"],
  "seperlunya|7": ["codot", "kelelawar kecil pemakan buah", "kelelawar yang hinggap di pohon", "Sinonim: kelelawar buah"],
  // tier10 — -nya
  "seadanya|10": ["sriti", "burung layang-layang kecil", "burung yang terbang cepat di sore hari", "Sinonim: burung walet kecil"],
};
