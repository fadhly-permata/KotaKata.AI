#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "data", "vocabulary");

const FIXES = {
  "menggaji": ["upah untuk pekerja", "imbalan atas pekerjaan yang dilakukan", "Sinonim: upah"],
  "kelupaan": ["perihal lupa", "keadaan terlupakan; keteledoran", "Verba keadaan terlupakan; keteledoran"],
  "pemuatan": ["proses pengisian ke wadah", "kegiatan memasukkan barang ke kapal", "pengisian stok kendaraan"],
  "seandainya": ["andaikata; kalau saja", "seumpama yang terjadi", "andaikata"],
  "terbukti": ["ternyata benar atau salah dengan bukti kuat", "nyata ada fakta pendukungnya", "Sinonim: ternyata"],
  "merasakan": ["menjadikan perasaan", "mengalami sensasi tertentu", "Sinonim: menikmati"],
  "kelihatan": ["dapat terlihat; nampak", "Contoh: sekarang barulah … siapa yang bersalah", "Sinonim: ternyata"],
  "keinginan": ["hasrat; kehendak; harapan", "peri-hal hasrat; kehendak; harapan", "Sinonim: hawa nafsu"],
  "perbedaan": ["beda; selisih", "hal yang membedakan dua hal", "Sinonim: disparitas"],
  "mengganti": ["menukar (dengan yang lain)", "memberikan substitusi barang", "Sinonim: mewakili"],
  "pemanasan": ["proses penghangatan", "latihan awal sebelum berolahraga", "Antonim: pendinginan"],
  "pemahaman": ["proses pengertian", "Contoh: … bahasa sumber dan bahasa sasaran sangat penting bagi penerjemah", "Sinonim: pengertian"],
  "melompati": ["berpindah dengan lompatan melewati", "melangkahi", "Sinonim: meloncati"],
  "pembagian": ["proses pemisahan beberapa bagian", "hitungan pembagian", "Sinonim: peragih"],
  "pemisahan": ["proses pemecahan; pemisahan", "Contoh: karena tidak ada … antara tamu wanita dan tamu pria, kami bebas memilih tempat duduk", "Sinonim: pembedaan"],
  "pemecahan": ["proses penyelesaian masalah", "penyelesaian masalah atau persoalan", "Sinonim: penyelesaian"],
  "berurutan": ["berturut-turut tanpa jeda", "berjalan secara serial", "Sinonim: serial"],
  "penulisan": ["proses menuangkan gagasan ke dalam tulisan", "kegiatan menuangkan gagasan ke dalam tulisan", "Sinonim: tulis-menulis"],
  "penugasan": ["proses pemberian tugas", "Contoh: ada … kepada Polri untuk menjaga ketertiban daerah itu", "pemberian tugas kepada"],
  "penekanan": ["proses penekanan", "Contoh: … penyebaran penyakit terletak pada usaha keras aparat kesehatan", "Sinonim: represi"],
  "penukaran": ["proses pertukaran", "penggantian", "Sinonim: penyilihan"],
  "kemerahan": ["berwarna mendekati merah", "berwarna kemerahan", "Sinonim: merah jambu"],
  "bertangan": ["diberkahi kemampuan atau keterampilan", "memiliki kemampuan (dalam konteks tertentu)", "Antonim: bercanggah"],
  "penularan": ["proses penyebaran penyakit", "perbuatan penyebaran penyakit", "penyebaran penyakit ke orang lain"],
  "penyesalan": ["perasaan kecewa", "proses merasa kecewa terhadap keputusan", "perasaan kecewa terhadap keputusan"],
  "pendaratan": ["proses turun dari udara ke darat", "Contoh: … tentara musuh berhasil digagalkan", "tempat turun ke darat"],
  "penggunaan": ["proses pemakaian sesuatu", "Contoh: kita harus menggalakkan … bahasa Indonesia", "Sinonim: pemakaian"],
  "penggalian": ["proses pengorekan tanah", "Contoh: dalam … itu ditemukan beberapa buah tempayan kuno", "Kiasan usaha mencari dan menemukan"],
  "pemindaian": ["proses pemindaian data", "pemindahan data dengan alat pemindaian", "pemeriksaan dengan sinar"],
  "pengabdian": ["proses persembahan diri", "Contoh: ia memperlihatkan … nya kepada tanah air dan agamanya", "Sinonim: dedikasi"],
  "pencemaran": ["proses pengotoran", "Contoh: … udara; … lingkungan", "Sinonim: pengotoran"],
  "pengajaran": ["proses pemberian didikan", "perihal pendidikan; segala sesuatu mengenai didikan", "Sinonim: piwulang"],
  "penambahan": ["proses penambahan jumlah", "Contoh: … gaji pegawai negeri perlu dipertimbangkan pada tahun anggaran ini", "Sinonim: suplesi"],
  "penyusupan": ["proses penyusupan", "Contoh: kita menolak semua … kebudayaan asing yang merusak generasi muda", "Sinonim: infiltrasi"],
  "penguasaan": ["proses penguasaan", "Contoh: … atas tanah perkebunan itu tidak sah", "pemahaman atau kesanggupan untuk menggunakan pengetahuan"],
  "penyelaman": ["proses menyelam ke dalam air", "olahraga bawah air", "Sinonim: diving"],
  "penyakitan": ["sakit-sakit selalu; selalu menderita", "Contoh: sesudah tua, ia", "bersifat sakit-sakit selalu"],
  "menguapkan": ["memasakkan (memanaskan, dan sebagainya)", "menjadikan uap; mengeluarkan uap", "Sinonim: menguapi"],
  "menggigiti": ["berkali-kali menggigit", "Contoh: anak itu senang … kukunya", "berdikit-dikit"],
  "beraturan": ["dengan aturan; teratur", "memakai aturan", "tahu sopan santun"],
  "penguapan": ["proses perubahan wujud cair ke gas", "Contoh: … air laut terus berlangsung; … daun teh itu berlangsung 24 jam supaya menjadi layu", "proses perubahan wujud cair ke wujud gas yang disertai oleh pelepasan panas"],
  "kehitaman": ["terlalu gelap", "bersifat gelap pekat", "Sinonim: gelap pekat"],
};

let fixed = 0;

for (const f of readdirSync(dir).filter(f => /^tier\d+\.ts$/.test(f)).sort()) {
  const filepath = join(dir, f);
  const src = readFileSync(filepath, "utf8");
  const regex = /^\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?$/gm;
  const tuples = [];
  let match;
  while ((match = regex.exec(src)) !== null) {
    tuples.push({ fullMatch: match[0], word: match[1] });
  }

  let newSrc = src;
  let modified = false;

  for (const t of tuples) {
    if (FIXES[t.word]) {
      const c = FIXES[t.word];
      const newTuple = `  ["${t.word}", "${c[0]}", "${c[1]}", "${c[2]}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      modified = true;
      fixed++;
    }
  }

  if (modified) {
    writeFileSync(filepath, newSrc, "utf8");
    console.log(`${f}: fixed`);
  }
}

console.log(`\nTotal: ${fixed} entries fixed`);
