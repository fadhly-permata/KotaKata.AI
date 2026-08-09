import { useGameStore } from "../presentation/stores/gameStore";
import { isWordComplete, validateWord } from "../domain/usecases/wordValidator";
import { play } from "./sound";

/**
 * Feedback suara saat huruf diketik di papan.
 *
 * DIPANGGIL SEBELUM inputLetter(): store bisa langsung mengunci kata &
 * menggeser kursor ke kata berikutnya setelah huruf terakhir, jadi status
 * kata yang sedang diketik harus diprediksi dari state sebelum mutasi.
 *
 * Aturan:
 *  - huruf biasa        → "letter" (pop)
 *  - kata jadi penuh    → "word"  kalau benar (ding-ding naik)
 *                      → "error" kalau salah (dengung rendah halus)
 */
export function playLetterPressFeedback(wordIndexAtPress: number | null, letter: string): void {
  const store = useGameStore.getState();
  const board = store.board;
  if (!board || wordIndexAtPress == null) {
    play("letter");
    return;
  }
  const wordIndex = wordIndexAtPress;
  const word = board.words[wordIndex];
  if (!word) {
    play("letter");
    return;
  }
  // Kata sudah selesai — input tidak akan mengubah apa pun (mis. mengetik di
  // sel yang tidak aktif), tetap bunyi pop sebagai konfirmasi ketukan.
  if (word.solved) {
    play("letter");
    return;
  }

  const sel = store.selectedCell;
  if (!sel) {
    play("letter");
    return;
  }
  const cell = board.grid[sel.row]?.[sel.col];
  // Sel terkunci/blocked: inputLetter akan menolak — jangan berbunyi.
  if (!cell || cell.isBlocked || cell.isLocked) return;

  // Prediksi papan setelah huruf ini masuk.
  const predicted = { ...store.filledLetters, [`${sel.row},${sel.col}`]: letter.toUpperCase() };
  if (isWordComplete(word, predicted)) {
    const correct = validateWord(word, wordIndex, predicted).isCorrect;
    play(correct ? "word" : "error");
  } else {
    play("letter");
  }
}

/** Feedback hapus huruf / tombol navigasi keyboard virtual. */
export function playDeleteFeedback(): void {
  play("tap");
}
