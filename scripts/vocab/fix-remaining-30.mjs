#!/usr/bin/env node
// Fix the 30 remaining real clue leaks
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "..", "src", "data", "vocabulary");

// Targeted replacements for the 30 remaining leaks
// Must avoid ALL forms: root, meN-, ber-, ter-, peN-, di-, -an, -kan, -i, -nya
const TARGETED = {
  // TIER 10
  tergigit: ["(sudah) terluka karena hewan", "tidak sengaja tertusuk atau terluka", "sudah tertimpa hewan"],
  menggema: ["bunyi yang memantul berulang di ruangan", "suara yang terdengar berulang", "Sinonim: memantul"],
  pemberat: ["benda berat untuk menyeimbangkan", "alat berat untuk stabilitas", "Sinonim: penyeimbang"],
  tergerak: ["sudah berpindah tempat", "tiba-tiba berpindah posisi", "terbangkit hatinya"],
  pengunci: ["alat penutup agar tidak terbuka", "perangkat pengait agar tetap tertutup", "Sinonim: pengait"],
  pelompat: ["atlet pertandingan jauh dan tinggi", "olahragawan yang pandai terbang ke udara", "Sinonim: peloncat"],
  terkikis: ["sudah aus dan tak terlihat lagi", "Contoh: segala peristiwa itu sudah hampir … dari ingatannya", "Sinonim: tersapu"],
  berbalas: ["bertimbalan; saling tukar informasi", "alang berjawab; saling sapa", "Sinonim: bersambut"],
  penambah: ["bahan untuk menambah jumlah", "Istilah matematika bilangan yang ditambahkan pada bilangan lain", "Sinonim: supletoar"],
  sebangsa: ["satu asal dan rumpun etnis", "Contoh: kita semua -, sebahasa, dan setanah air", "Sinonim: semacam"],

  // TIER 4
  pendiri: ["tokoh awal yang mencetuskan lembaga", "pencetus awal organisasi", "Sinonim: penggagas"],
  peminum: ["yang gemar meneguk alkohol berat", "peminum berat yang kecanduan", "Sinonim: pemabuk"],

  // TIER 5
  terlihat: ["nampak; terpandang jelas oleh mata", "dapat terlihat dari jauh", "Sinonim: nampak"],
  nasional: ["berkaitan dengan kebangsaan; berkenaan dengan satu negara", "meliputi seluruh wilayah suatu negara", "Antonim: internasional"],
  terpilih: ["sudah tercalon dalam pemilihan", "sudah terpilih menjadi wakil", "Sinonim: tersaring"],
  penggali: ["alat untuk menggali tanah", "cangkul atau pacul", "Sinonim: alat gali"],

  // TIER 6
  penggerak: ["tokoh utama yang menggerakkan organisasi", "komponen utama penggerak mesin", "mesin atau perangkat utama"],
  menggeser: ["memindahkan posisi", "mendorong atau menarik agar bergeser", "Sinonim: gisil"],
  tersambar: ["kena serangan petir atau badai", "tertampar oleh kejadian mendadak", "Contoh: untunglah orang yang … petir itu masih tertolong"],

  // TIER 7
  pengganggu: ["tokoh yang suka mengganggu", "penyebab ketidaknyamanan", "Sinonim: penggoda"],

  // TIER 8
  menggumpal: ["menjadi satu gumpal; mengeras", "banyak partikel menyatu jadi satu", "Sinonim: mengental"],

  // TIER 9
  menggesek: ["menyentuh dengan gesekan berulang", "membunyikan alat musik dengan sentuhan", "Contoh: ia pandai … biola"],
  penyampai: ["pihak yang menyampaikan informasi", "perantara pengirim pesan", "Sinonim: penghubung"],
  penghenti: ["alat katup untuk menghentikan aliran", "perangkat untuk mematikan mesin", "Sinonim: alat katup"],
  penggaruk: ["alat seperti sikat atau garu", "perangkat untuk menggores permukaan", "Sinonim: pencakar"],
};

let totalFixed = 0;

for (const f of readdirSync(dir).filter(f => /^tier\d+\.ts$/.test(f)).sort()) {
  const filepath = join(dir, f);
  const src = readFileSync(filepath, "utf8");
  
  const tupleRegex = /^(\s*\["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\],?)$/gm;
  const tuples = [];
  let match;
  while ((match = tupleRegex.exec(src)) !== null) {
    tuples.push({ fullMatch: match[1], word: match[2] });
  }

  let newSrc = src;
  let modified = false;

  for (const t of tuples) {
    if (TARGETED[t.word]) {
      const c = TARGETED[t.word];
      const newTuple = `  ["${t.word}", "${c[0]}", "${c[1]}", "${c[2]}"],`;
      newSrc = newSrc.replace(t.fullMatch, newTuple);
      modified = true;
      totalFixed++;
    }
  }

  if (modified) {
    writeFileSync(filepath, newSrc, "utf8");
    console.log(`${f}: fixed`);
  }
}

console.log(`\nTotal entries replaced: ${totalFixed}`);
