// Debug: kenapa minimal-repair fallback menolak baris mekanik-only?
const decode = (s) =>
  s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");

const modernize = (s) =>
  s
    .replace(/\byg\b/g, "yang")
    .replace(/\bdgn\b/g, "dengan")
    .replace(/\bdng\b/g, "dengan")
    .replace(/\btt\b/g, "tentang")
    .replace(/\bkpd\b/g, "kepada")
    .replace(/\bsbg\b/g, "sebagai")
    .replace(/\bdr\b/g, "dari")
    .replace(/\btsb\b/g, "tersebut")
    .replace(/\bspt\b/g, "seperti")
    .replace(/\bud\b/g, "untuk")
    .replace(/\butk\b/g, "untuk")
    .replace(/\bpd\b/g, "pada")
    .replace(/\bkrn\b/g, "karena")
    .replace(/\bmsl\b/g, "misalnya")
    .replace(/\bdl\b/g, "dalam")
    .replace(/\bsdh\b/g, "sudah")
    .replace(/\bthd\b/g, "terhadap")
    .replace(/\bdll\b/g, "dan lain-lain")
    .replace(/\bdsb\b/g, "dan sebagainya");

function hasUnbalancedParen(t) {
  if (!t) return false;
  let depth = 0;
  for (const ch of t) {
    if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth < 0) return true; }
  }
  return depth !== 0;
}

const BROKEN_FRAG_RE = /^[a-z·]{1,16}[),;:]$/i;
function isJunk(t) {
  if (!t) return true;
  const s = t.trim();
  if (s.length < 4) return true;
  if (BROKEN_FRAG_RE.test(s)) return true;
  if (hasUnbalancedParen(s)) return true;
  if (/^(kata kerja|kata benda|kata sifat|kata keterangan|sebagainya|dan sebagainya|dan lain|verba|nomina|adjektiva|adverbia|perihal)\b/i.test(s)) return true;
  if (/^(hal yang berkaitan dengan|berkaitan dengan adanya|berkaitan dengan kegiatan)\b/i.test(s)) return true;
  if (/^[a-z·]{2,16}\s*\)/.test(s)) return true;
  if (/^(?:v|n|a|adv)(?=[A-ZÀ-Ý])/.test(s)) return true;
  if (/\s-{1,2}\s/.test(s)) return true;
  return false;
}

function minimalRepair(t) {
  if (!t) return "";
  let s = modernize(decode(t).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  s = s.replace(/\s--\s/g, " … ").replace(/\s-\s/g, " … ").replace(/--\s*$/, "").trim();
  if (hasUnbalancedParen(s)) {
    let depth = 0;
    let lastOpen = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") { depth++; lastOpen = i; }
      else if (s[i] === ")") depth--;
    }
    if (depth > 0 && lastOpen > -1) {
      const head = s.slice(0, lastOpen + 1);
      const tail = s.slice(lastOpen + 1).replace(/[,;:\s]+$/, "");
      s = /(?:dan sebagainya|dll|dsb)$/i.test(tail) ? `${head}${tail})` : `${head}${tail}, dan sebagainya)`;
    } else {
      s = s.replace(/\)+\s*$/, "").replace(/,+\s*$/, "").trim();
    }
  }
  s = s.replace(/[;,:,.…]+\s*$/g, "").trim();
  return s.length >= 3 ? s : "";
}

const normForCompare = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/gi, "");
function containsOverlap(a, b) {
  if (!a || !b) return false;
  const na = normForCompare(a);
  const nb = normForCompare(b);
  if (na === nb) return true;
  if (na.length >= 12 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}
function nearSame(a, b) {
  if (!a || !b) return false;
  const x = normForCompare(a);
  const y = normForCompare(b);
  return x === y || (x.length >= 12 && y.length >= 12 && (x.startsWith(y) || y.startsWith(x)));
}
function overlapPairs(cols) {
  const p = [];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      if (containsOverlap(cols[i], cols[j]) || nearSame(cols[i], cols[j])) p.push(`${i}${j}`);
    }
  return p;
}

const wb = (w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
const leaksAnswer = (clue, word) => (clue ? wb(word).test(clue) : false);

const CASES = {
  varietas: ["kelompok tanaman (seperti perdu) dl jenis atau spesies tertentu yang dapat dibedakan dari kelompok lain berdasarkan suatu sifat atau sifat tertentu", "Istilah pertanian kelompok tanaman seperti perdu dalam jenis atau spesies tertentu yang dapat dibedakan dari kelompok lain berdasarkan suatu sifat atau sifat tertentu", "ragam bahasa"],
  prasasti: ["piagam (yang tertulis pd batu, tembaga", "piagam yang tertulis pada batu, tembaga, dan sebagainya", "Sinonim: epigraf"],
  insentif: ["tambahan penghasilan (uang, barang", "sebagainya yang diberikan untuk meningkatkan gairah kerja", "uang perangsang"],
  pengarah: ["orang yang memberi arahan (dalam diskusi, konferensi", "sebagainya", "Sinonim: pemitar"],
  apoteker: ["ahli dl ilmu obat-obatan; yang berwenang membuat obat untuk dijual", "ahli dalam ilmu obat-obatan", "hal yang berkaitan dengan dl ilmu obat-obatan"],
  monogami: ["sistem yang hanya memperbolehkan seorang laki-laki mempunyai satu istri pd jangka waktu tertentu", "hal yang berkaitan dengan yang hanya memperbolehkan seorang laki-laki mempunyai satu istri pd jangka waktu tertentu", "sistem yang hanya memperbolehkan seorang laki-laki mempunyai satu istri pada jangka waktu tertentu"],
  horoskop: ["pengamatan posisi bintang-bintang pd waktu tertentu, seperti pd hari lahir seseorang", "pengamatan posisi bintang-bintang pada waktu tertentu, seperti pada hari lahir seseorang, dengan tujuan meramalkan masa depannya", "peta bintang kelahiran seseorang, yang memperlihatkan posisi bintang-bintang tersebut"],
  garnisun: ["bagian angkatan bersenjata yang mempunyai kedudukan atau tempat pertahanan yang tetap (dl sebuah benteng pertahanan atau sebuah kota)", "[Mil] 1 bagian angkatan bersenjata yang mempunyai kedudukan atau tempat pertahanan yang tetap dalam sebuah benteng pertahanan atau sebuah kota", "tempat kedudukan tentara"],
};

for (const [word, oldClues] of Object.entries(CASES)) {
  const [a, b, c] = oldClues.map((t) => minimalRepair(t ?? ""));
  const clean = [a, b, c].every((v) => v && v.trim().length >= 4 && !isJunk(v) && !leaksAnswer(v, word));
  const oldPairs = overlapPairs(oldClues);
  const newPairs = overlapPairs([a, b, c]);
  const newCollision = newPairs.some((p) => !oldPairs.includes(p));
  const c1Bad = /^(sinonim|antonim|contoh)\b/i.test(a);
  const paren = hasUnbalancedParen(a) || hasUnbalancedParen(b) || hasUnbalancedParen(c);
  const accept = clean && !c1Bad && !paren && !newCollision;
  console.log(`\n== ${word} ==`);
  console.log("  a:", JSON.stringify(a));
  console.log("  b:", JSON.stringify(b));
  console.log("  c:", JSON.stringify(c));
  console.log("  clean:", clean, "c1Bad:", c1Bad, "paren:", paren, "oldPairs:", oldPairs, "newPairs:", newPairs, "newCollision:", newCollision, "→ accept:", accept);
  if (!clean) {
    console.log("  reject-reason: clean");
    [a, b, c].forEach((v, i) => {
      if (!v) console.log(`    c${i + 1}: EMPTY`);
      else if (v.trim().length < 4) console.log(`    c${i + 1}: SHORT (${v.trim().length})`);
      else if (isJunk(v)) console.log(`    c${i + 1}: JUNK -> "${v.trim().slice(0, 60)}"`);
      else if (leaksAnswer(v, word)) console.log(`    c${i + 1}: LEAK -> "${v.trim().slice(0, 60)}"`);
    });
  }
}
