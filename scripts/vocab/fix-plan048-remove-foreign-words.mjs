// ============================================================
// PLAN-048: Kosakata hanya bahasa Indonesia.
// - Ganti 9 kata asing / non-baku (start, lose, cheetah, maroon,
//   trottoar, qurban, fuchsia, olive, disorder) dengan kata
//   Indonesia (baku KBBI / lazim), tetap 1000 kata per tier.
// - Perbaiki 10 clue yang memuat kata bahasa Inggris mentah
//   (wine, topping, playing card, fuchsia, olive, rhinoceros,
//   butter, corn, maroon, sidewalk).
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const vocabDir = join(ROOT, "src", "data", "vocabulary");

// wordLama -> { word: kataBaru, c1, c2, c3 } (null = biarkan kolom lama)
const REPLACE = {
  // ---- tier2: start -> rintis (membuka jalan; permulaan) ----
  start: { word: "rintis", c1: "jalan kecil setapak di hutan", c2: "membuka jalan pertama kali", c3: "Sinonim: memelopori" },
  // ---- tier2: lose -> hempas (banting; jatuh keras) ----
  lose: { word: "hempas", c1: "membantingkan atau menjatuhkan dengan keras", c2: "terlempar jatuh dengan hebat", c3: "Sinonim: banting" },
  // ---- tier5: cheetah -> citah (baku KBBI) ----
  cheetah: { word: "citah", c1: null, c2: null, c3: null },
  // ---- tier1: maroon -> nila (warna biru tua; KBBI) ----
  maroon: { word: "nila", c1: "warna biru tua kehitaman", c2: "tumbuhan penghasil pewarna biru", c3: "Sinonim: biru pekat" },
  // ---- tier1: trottoar -> delima (buah; KBBI) ----
  trottoar: { word: "delima", c1: "buah merah berisi biji kecil banyak", c2: "buah yang bijinya seperti butiran permata merah", c3: "Sinonim: buah merah" },
  // ---- tier3: qurban -> kurban (baku KBBI) + clue anti-leak ----
  qurban: { word: "kurban", c1: "hewan yang disembelih pada hari raya Iduladha", c2: "berbagi daging hewan sembelihan", c3: "Sinonim: persembahan" },
  // ---- tier1: fuchsia -> fusia (baku KBBI) ----
  fuchsia: { word: "fusia", c1: null, c2: null, c3: null },
  // ---- tier1: olive -> jambon (warna merah muda; KBBI) ----
  olive: { word: "jambon", c1: "warna merah muda", c2: "warna seperti buah jambu", c3: "Sinonim: merah jambu" },
  // ---- tier10: disorder -> jengah (malu; segan; KBBI) ----
  disorder: { word: "jengah", c1: "merasa malu atau segan", c2: "canggung karena merasa tidak pantas", c3: "Sinonim: malu" },
};

// word -> [c1, c2, c3] yang hanya ingin diubah 1 kolom (null = biarkan)
const CLUE_FIX = {
  keju: [null, "bahan makanan yang lumer saat dipanggang", null],
  anggur: [null, "buah yang difermentasi menjadi minuman", null],
  kartu: [null, null, "Lembaran tipis bertanda angka"],
  magenta: [null, null, "Sinonim: warna fusia"],
  zaitun: [null, null, "Buah khas negara Timur Tengah"],
  badak: [null, null, "Sinonim: hewan bercula"],
  mentega: [null, null, "Sinonim: lemak susu"],
  jagung: [null, null, "Sinonim: serealia"],
  marun: [null, null, "Sinonim: merah tua"],
  trotoar: [null, null, "Sinonim: jalur pejalan kaki"],
};

const WORD_RE = /^  \["([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],$/gm;
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const files = ["tier1-part1.ts", "tier1.ts", "tier2.ts", "tier3.ts", "tier4-part3.ts", "tier5.ts", "tier10.ts"];
let replaced = 0;
let fixedClues = 0;
const notFound = [];

for (const f of files) {
  const path = join(vocabDir, f);
  const src = readFileSync(path, "utf8");
  let out = src.replace(WORD_RE, (full, word, c1, c2, c3) => {
    const r = REPLACE[word];
    if (r) {
      const n1 = r.c1 ?? c1;
      const n2 = r.c2 ?? c2;
      const n3 = r.c3 ?? c3;
      replaced++;
      return `  ["${r.word}", "${esc(n1)}", "${esc(n2)}", "${esc(n3)}"],`;
    }
    const f2 = CLUE_FIX[word];
    if (f2) {
      const n1 = f2[0] ?? c1;
      const n2 = f2[1] ?? c2;
      const n3 = f2[2] ?? c3;
      fixedClues++;
      return `  ["${word}", "${esc(n1)}", "${esc(n2)}", "${esc(n3)}"],`;
    }
    return full;
  });
  if (out !== src) {
    writeFileSync(path, out);
    console.log(`✍ ${f}: diperbarui`);
  }
}

console.log(`\n=== Kata diganti: ${replaced} | Clue diperbaiki: ${fixedClues} ===`);
