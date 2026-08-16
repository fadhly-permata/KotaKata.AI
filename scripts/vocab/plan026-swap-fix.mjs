// ============================================================
// SWAP_FIX — perbaiki tuple kata hasil SWAP yang clue-nya bocor
// (word-boundary). Kunci = "word|tier", nilai = [word, c1, c2, c3].
// Dipakai engine fix-plan026.mjs.
// ============================================================
export const SWAP_FIX = {
  "iguana|2": ["iguana", "kadal besar berduri di punggung", "kadal herbivora dari daerah tropis", "Berduri di sepanjang punggung"],
  "belut|2": ["belut", "ikan panjang licin yang hidup di lumpur", "ikan mirip ular di sawah", "Licin dan hidup di lumpur"],
  "gurame|2": ["gurame", "ikan air tawar yang lezat digoreng", "ikan budidaya yang suka melompat", "Sering dibudidayakan di kolam"],
  "komodo|2": ["komodo", "kadal raksasa khas Indonesia", "hewan purba yang hidup di satu pulau", "Hanya ada di Indonesia"],
  "patin|2": ["patin", "ikan air tawar berbadan panjang", "ikan yang sering dibuat sup asam", "Banyak dijadikan sup"],
  "gabus|2": ["gabus", "ikan air tawar yang kuat di lumpur", "ikan predator di rawa", "Kuat bertahan di lumpur"],
  "tokek|2": ["tokek", "cicak besar yang suka di dinding", "kadal malam yang sering di dinding", "Suaranya terdengar di malam hari"],
  "bawal|2": ["bawal", "ikan laut berbadan pipih", "ikan yang sering digoreng utuh", "Bentuknya pipih dan lebar"],
  "kakap|2": ["kakap", "ikan laut yang dagingnya tebal", "ikan favorit untuk digoreng", "Dagingnya tebal dan gurih"],
  "tenggiri|2": ["tenggiri", "ikan laut yang enak dijadikan sambal", "ikan berbadan panjang dari laut", "Enak untuk sambal"],
  "perkutut|3": ["perkutut", "burung merpati kecil bersuara merdu", "burung yang sering dipelihara orang Jawa", "Suaranya merdu dan khas"],
  "kutilang|3": ["kutilang", "burung kecil berjambul hitam", "burung yang riang berkicau", "Jambul hitam di kepala"],
  "kasuari|4": ["kasuari", "burung besar tak bisa terbang dari Papua", "burung dengan jambul di kepala", "Jambul di kepala berwarna biru"],
  "wereng|4": ["wereng", "serangga kecil pengisap padi", "hama padi yang merusak tanaman", "Musuh utama para petani"],
  "tapir|4": ["tapir", "hewan berbelalai pendek berkulit tebal", "hewan mirip babi bermoncong panjang", "Moncongnya menyerupai belalai"],
  "siamang|6": ["siamang", "kera hitam bersuara nyaring", "primata lengan panjang", "Suaranya nyaring di hutan"],
  "walet|6": ["walet", "burung kecil penghasil sarang mahal", "burung yang sarangnya dari air liur", "Sarangnya sangat berharga"],
  "pipit|6": ["pipit", "burung kecil yang suka memakan padi", "burung pengganggu di sawah", "Sering menyerbu padi"],
  "babun|7": ["babun", "kera besar bermoncong panjang", "primata yang berjalan di tanah", "Moncongnya panjang menonjol"],
  "sidat|7": ["sidat", "ikan panjang seperti belut", "ikan yang hidup di air tawar", "Tubuhnya licin memanjang"],
  "lemuru|7": ["lemuru", "ikan laut kecil berkelompok", "ikan kecil untuk sarden", "Bahan utama sarden"],
  "tongkol|7": ["tongkol", "ikan laut yang mirip tuna kecil", "ikan yang sering dibuat pindang", "Sering dibuat pindang"],
  "kembung|7": ["kembung", "ikan laut yang biasa digoreng", "ikan kecil yang lezat", "Lauk goreng yang lezat"],
  "cakalang|7": ["cakalang", "ikan laut untuk membuat pindang", "ikan yang diasap menjadi kayu", "Diasap menjadi ikan kayu"],
  "mandrill|7": ["mandrill", "kera besar berwajah warna-warni", "primata dari Afrika", "Wajahnya penuh warna"],
  "punai|7": ["punai", "burung merpati hijau", "burung hutan yang jinak", "Bulu kehijauan yang indah"],
};
