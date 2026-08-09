// ============================================================
// KotaKata AI — Generator efek suara (sintesis murni, tanpa deps)
// Membuat WAV PCM 16-bit mono 22050 Hz pendek di assets/sfx/.
// Jalankan: node scripts/generate-sfx.mjs
// Hasil: tap / letter / word / error / win / popup / hint
// ============================================================
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "assets", "sfx");
const RATE = 22050;
const TAU = Math.PI * 2;

/** Envelope eksponensial: naik cepat, meluruh halus (hindari klik). */
function envelope(i, n, { attack = 0.004, release = 0.3 } = {}) {
  const t = i / RATE;
  const attackT = Math.min(1, t / Math.max(0.001, attack));
  const releaseT = Math.min(1, (n - i) / RATE / Math.max(0.01, release));
  return Math.min(attackT, releaseT);
}

/** Nada tunggal. type: sine | soft (sine + harmonik lembut). */
function tone({
  freq,
  dur,
  vol = 0.4,
  attack,
  release = 0.3,
  type = "sine",
  freqEnd,
}) {
  const n = Math.floor(RATE * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = freqEnd ? freq + (freqEnd - freq) * (i / n) : freq;
    const phase = TAU * f * t;
    let s;
    if (type === "soft") {
      // Nada hangat: fundamental + harmonik ke-2 & ke-3 yang melemah.
      s = Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase);
    } else {
      s = Math.sin(phase);
    }
    out[i] = s * vol * envelope(i, n, { attack, release });
  }
  return out;
}

/** Gabung beberapa segmen dengan jeda kecil (detik). */
function concat(...segments) {
  const gap = Math.floor(RATE * 0.02);
  const total = segments.reduce((a, s) => a + s.length, 0) + gap * (segments.length - 1);
  const out = new Float32Array(total);
  let pos = 0;
  for (const seg of segments) {
    out.set(seg, pos);
    pos += seg.length + gap;
  }
  return out;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), Buffer.concat([header, data]));
  console.log(
    `  ${name.padEnd(12)} ${(data.length / 1024).toFixed(1).padStart(6)} KB  ${Math.round(
      (samples.length / RATE) * 1000,
    )} ms`,
  );
}

console.log("Membuat efek suara →", OUT);

// ── tap: klik lembut untuk tombol ──
writeWav("tap.wav", tone({ freq: 1000, dur: 0.06, vol: 0.3, release: 0.22 }));

// ── letter: "pop" kecil saat huruf diletakkan ──
writeWav(
  "letter.wav",
  tone({ freq: 640, freqEnd: 500, dur: 0.08, vol: 0.32, type: "soft", release: 0.28 }),
);

// ── word: "ding-ding" naik — kata terjawab benar ──
writeWav(
  "word.wav",
  concat(
    tone({ freq: 660, dur: 0.09, vol: 0.34, release: 0.25 }),
    tone({ freq: 880, dur: 0.13, vol: 0.36, release: 0.32 }),
  ),
);

// ── error: dengung rendah halus — kata penuh tapi salah ──
writeWav(
  "error.wav",
  tone({ freq: 196, dur: 0.22, vol: 0.28, type: "soft", release: 0.35 }),
);

// ── win: arpeggio ceria C5-E5-G5-C6 ──
writeWav(
  "win.wav",
  concat(
    tone({ freq: 523.25, dur: 0.11, vol: 0.34, release: 0.22 }),
    tone({ freq: 659.25, dur: 0.11, vol: 0.34, release: 0.22 }),
    tone({ freq: 783.99, dur: 0.11, vol: 0.34, release: 0.22 }),
    tone({ freq: 1046.5, dur: 0.2, vol: 0.38, release: 0.4 }),
  ),
);

// ── popup: "whoosh" naik — dialog/popup muncul ──
writeWav(
  "popup.wav",
  tone({ freq: 320, freqEnd: 920, dur: 0.14, vol: 0.25, type: "soft", release: 0.3 }),
);

// ── hint: kilau dua nada tinggi — petunjuk/reveal ──
writeWav(
  "hint.wav",
  concat(
    tone({ freq: 880, dur: 0.07, vol: 0.3, release: 0.25 }),
    tone({ freq: 1174.66, dur: 0.12, vol: 0.32, release: 0.32 }),
  ),
);

console.log("Selesai ✅");
