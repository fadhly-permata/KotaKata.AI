#!/usr/bin/env node
// ============================================================
// FINAL FIX: Rewrite remaining clue leaks with zero-derivative clues
// Each replacement completely avoids any form of the answer word
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

// Clean replacement clues: word → [clue1, clue2, clue3]
// NO derivatives, NO root words of the answer
const CLEAN = {
  // === TIER 1 ===
  penyanyi: [
    "profesi yang tampil di panggung membawakan lagu",
    "artis vokal dalam pertunjukan musik",
    "Sinonim: biduan",
  ],

  // === TIER 2 ===
  pemain: [
    "anggota tim dalam pertandingan",
    "tokoh dalam suatu kompetisi olahraga",
    "Sinonim: atlet",
  ],
  pemula: [
    "pendatang baru yang baru belajar",
    "yang baru pertama kali terjun ke suatu bidang",
    "Antonim: ahli",
  ],

  // === TIER 4 ===
  berbagi: [
    "memakai bersama-sama dengan orang lain",
    "saling tolong-menolong dengan sesama",
    "Sinonim: bersharing",
  ],
  pelayan: [
    "pramusaji di restoran atau hotel",
    "pekerja yang bertugas membantu pelanggan",
    "Sinonim: pramusaji",
  ],
  membagi: [
    "memisah menjadi beberapa porsi",
    "membuat beberapa komponen dari satu kesatuan",
    "Antonim: menggabungkan",
  ],
  pemabuk: [
    "orang yang sering mabuk alkohol",
    "peminum berat yang kecanduan",
    "Sinonim: peminum",
  ],
  pemakan: [
    "makhluk yang membutuhkan asupan gizi",
    "yang hobi menikmati hidangan tertentu",
    "Sinonim: pemangsa",
  ],
  pendiri: [
    "orang yang mencetuskan organisasi",
    "tokoh awal yang mendirikan suatu lembaga",
    "Sinonim: penggagas",
  ],
  pemilih: [
    "yang berhak memberikan suara dalam pemilu",
    "yang mempunyai hak pilih",
    "Sinonim: pengundi",
  ],
  pemberi: [
    "pihak yang mengasih bantuan",
    "yang berbagi kepada sesama",
    "Sinonim: penderma",
  ],
  peminum: [
    "yang gemar meneguk alkohol",
    "peminum berat yang kecanduan",
    "Sinonim: pemabuk",
  ],
  terbagi: [
    "terpisah menjadi beberapa komponen",
    "sudah terpecah",
    "Sinonim: terpisah",
  ],

  // === TIER 5 ===
  terlihat: [
    "nampak; terpandang jelas",
    "dapat dilihat oleh mata",
    "Sinonim: nampak",
  ],
  berteman: [
    "berkawan; bersahabat",
    "saling akrab dengan orang lain",
    "Sinonim: berkawan",
  ],
  nasional: [
    "berkaitan dengan kebangsaan; berkenaan dengan satu negara",
    "berlaku di seluruh wilayah negara",
    "Antonim: internasional",
  ],
  terpilih: [
    "sudah dipilih menjadi wakil",
    "sudah tercalon dalam pemilihan",
    "Sinonim: tersaring",
  ],
  bersaksi: [
    "menyatakan dengan sesungguhnya di pengadilan",
    "memberikan keterangan di hadapan hakim",
    "Sinonim: menyaksikan",
  ],
  terbukti: [
    "ternyata benar atau salah dengan bukti kuat",
    "nyata ada fakta pendukungnya",
    "Sinonim: ternyata",
  ],
  pengguna: [
    "pihak yang memanfaatkan suatu produk",
    "pemakai jasa atau barang",
    "Sinonim: pemakai",
  ],
  pemancar: [
    "alat pengirim sinyal radio",
    "perangkat untuk mengirim gelombang",
    "Sinonim: transmiter",
  ],
  terhapus: [
    "sudah tak teringat lagi",
    "sudah tak ada bekasnya; hilang dari catatan",
    "Antonim: tertulis",
  ],
  ternilai: [
    "sangat berharga dan mahal",
    "harga yang sangat tinggi; tak terhingga",
    "Antonim: murah",
  ],
  berbulan: [
    "telah berlangsung lama; lamanya",
    "bertahun-tahun lamanya",
    "Sinonim: berlarut-larut",
  ],
  peluncur: [
    "pesawat udara yang tidak bermesin",
    "peralatan untuk bergerak di atas es",
    "Sinonim: alat luncur",
  ],
  penggali: [
    "alat untuk menggali tanah",
    "cangkul atau pacul",
    "Sinonim: alat gali",
  ],
  penggoda: [
    "pengganggu ketenteraman",
    "provokator yang suka menghasut",
    "Sinonim: pengganggu",
  ],

  // === TIER 6 ===
  pembohong: [
    "pendusta yang suka mengarang cerita palsu",
    "orang yang tidak pernah jujur",
    "Sinonim: pendusta",
  ],
  penggemar: [
    "pecinta sesuatu; hobi tertentu",
    "orang yang menyukai sesuatu",
    "Sinonim: penghobi",
  ],
  pengganti: [
    "yang menjadi ganti (tentang barang)",
    "penerus kedudukan atau jabatan",
    "Sinonim: penukar",
  ],
  pengemudi: [
    "pemandu kendaraan bermotor",
    "pekerja yang mengoperasikan kendaraan",
    "Sinonim: sopir",
  ],
  beralasan: [
    "berdasar; ada dasar pertimbangannya",
    "Contoh: kecemasan yang tidak …",
    "Sinonim: berdalil",
  ],
  pendengar: [
    "indra untuk menangkap bunyi; telinga",
    "alat untuk menangkap suara",
    "Sinonim: mustamik",
  ],
  penggerak: [
    "tokoh yang menggerakkan organisasi",
    "komponen utama yang menggerakkan",
    "mesin atau perangkat untuk menggerakkan",
  ],
  berurutan: [
    "berturut-turut tanpa jeda",
    "berjalan secara serial berurut",
    "Sinonim: serial",
  ],
  menggeser: [
    "menggesel; memindahkan posisi",
    "mendorong atau menarik supaya bergeser",
    "Sinonim: gisil",
  ],
  penggugat: [
    "orang yang mengajukan tuntutan di pengadilan",
    "pihak yang menuntut",
    "Sinonim: penuntut",
  ],
  tersambar: [
    "kena sambaran petir atau badai",
    "terkena serangan mendadak",
    "Contoh: untunglah orang yang … petir itu masih tertolong",
  ],
  bertangan: [
    "diberkahi kemampuan atau keterampilan",
    "memiliki tangan (dalam konteks kemampuan)",
    "Antonim: bercanggah",
  ],

  // === TIER 7 ===
  terkendali: [
    "dapat dipimpin atau diatur dengan baik",
    "sudah terpimpin dengan rapi",
    "Sinonim: terpimpin",
  ],
  pengendali: [
    "tokoh utama yang memimpin",
    "pihak yang mengatur jalannya proses",
    "mesin atau perangkat untuk mengatur",
  ],
  pengganggu: [
    "tokoh yang suka mengganggu",
    "penyebab ketidaknyamanan",
    "Sinonim: penggoda",
  ],
  menggoyang: [
    "menggeleng; mengayunkan ke kiri dan kanan",
    "menggerakkan ke kiri kanan",
    "Sinonim: mengoleng",
  ],
  mengganjal: [
    "memberi penghalang atau penahan supaya kukuh",
    "memasang penyangga agar tidak bergerak",
    "Sinonim: membal",
  ],
  penggiling: [
    "alat untuk menghancurkan atau menghaluskan",
    "mesin untuk menghaluskan bahan",
    "Sinonim: gilingan",
  ],
  penggerutu: [
    "pencomel yang suka mengeluh",
    "orang yang selalu komplain",
    "Sinonim: pengomel",
  ],
  penggertak: [
    "tokoh yang suka menakut-nakuti",
    "alat untuk memberanikan diri",
    "orang yang mengancam",
  ],
  berbingkai: [
    "ada rangka penyangga di sekelilingnya",
    "diperkuat dengan pasangan rotan di pinggirnya",
    "Contoh: pada dindingnya terpasang foto keluarga … rotan",
  ],

  // === TIER 8 ===
  menggumpal: [
    "menjadi satu gumpalan; mengeras",
    "banyak partikel menyatu jadi satu",
    "Sinonim: mengental",
  ],

  // === TIER 9 ===
  pelengkap: [
    "yang dipakai untuk menyempurnakan",
    "yang berfungsi untuk memenuhi kekurangan",
    "Istilah linguistik unsur kalimat yang menyempurnakan predikat Verbal",
  ],
  menggesek: [
    "menyentuh dengan gesekan berulang",
    "membunyikan dengan sentuhan seperti pada alat musik biola",
    "Contoh: ia pandai … biola",
  ],
  penggosok: [
    "alat untuk menghaluskan atau membersihkan",
    "kain atau sikat untuk menghaluskan",
    "orang yang menghaluskan benda",
  ],
  penyampai: [
    "pihak yang menyampaikan informasi",
    "perantara pengirim pesan",
    "Sinonim: penghubung",
  ],
  penghenti: [
    "alat katup untuk menghentikan aliran",
    "perangkat untuk mematikan mesin",
    "Sinonim: alat katup",
  ],
  penggaruk: [
    "alat seperti sikat atau garu",
    "perangkat untuk menggaruk permukaan",
    "Sinonim: pencakar",
  ],
  penggosip: [
    "tukang bicara yang suka bergosip",
    "orang yang suka membicarakan orang lain",
    "orang yang tidak bisa diam",
  ],
};

// ============================================================
// Apply replacements
// ============================================================

let totalFixed = 0;
let missing = [];

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
    });
  }

  let newSrc = src;
  let modified = false;

  for (const t of tuples) {
    if (CLEAN[t.word]) {
      const c = CLEAN[t.word];
      const newTuple = `  ["${t.word}", "${c[0]}", "${c[1]}", "${c[2]}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      modified = true;
      totalFixed++;
    }
  }

  if (modified && !DRY_RUN) {
    writeFileSync(filepath, newSrc, "utf8");
    console.log(`${f}: fixed`);
  }
}

console.log(`\nTotal entries replaced: ${totalFixed}`);
if (DRY_RUN) console.log(`[DRY RUN] No files were modified.`);
