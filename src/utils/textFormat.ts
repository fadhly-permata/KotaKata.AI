/**
 * Format teks clue — tanpa AI, murni aturan lokal.
 */

/** Karakter pengakhir kalimat (titik, tanda seru, tanya, elipsis). */
const SENTENCE_END = /[.!?…]/;
const IS_LETTER = /[a-zA-Z]/;

/**
 * Kapitalisasi huruf pertama setiap kalimat berdasarkan POSISI teks dan tanda
 * baca — bukan pekerjaan AI:
 * - huruf pertama teks → besar
 * - huruf pertama setelah `.`, `!`, `?`, `…` (+ spasi) → besar
 * - karakter lain TIDAK diubah (bukan sentence-case penuh)
 *
 * Contoh:
 *   "matahari bersinar. langit biru"  → "Matahari bersinin. Langit biru"
 *   "ibu kota indonesia?"             → "Ibu kota indonesia?"
 */
export function capitalizeSentences(text: string): string {
  let out = "";
  let capitalizeNext = true;
  for (const ch of text) {
    if (capitalizeNext && IS_LETTER.test(ch)) {
      out += ch.toUpperCase();
      capitalizeNext = false;
    } else {
      out += ch;
    }
    if (SENTENCE_END.test(ch)) capitalizeNext = true;
  }
  return out;
}
