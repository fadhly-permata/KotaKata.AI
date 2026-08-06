import type { Board } from "../domain/entities/board";

/** Penggunaan hint per kata — bentuknya sama dengan HintUsage di gameStore. */
export interface BoardProgressHints {
  clue2Used: boolean;
  clue3Used: boolean;
  revealedCells: string[];
}

/** Snapshot progres board yang sedang berjalan (belum selesai). */
export interface BoardProgressState {
  board: Board;
  filledLetters: Record<string, string>;
  hints: Record<string, BoardProgressHints>;
  currentXp: number;
  wordsSolved: number;
  totalXp: number;
}

/**
 * ID deterministik untuk board in-progress — setiap user maksimal punya
 * satu papan tersimpan yang bisa di-resume.
 */
export const IN_PROGRESS_BOARD_ID = (userId: string): string => `inprogress-${userId}`;

export function serializeBoardProgress(state: BoardProgressState): string {
  return JSON.stringify(state);
}

/**
 * Baca kembali snapshot progres dari layout_data. Mengembalikan null kalau
 * format tidak valid.
 *
 * Penting: JSON.stringify membuat SALINAN objek terpisah untuk board.grid dan
 * untuk tiap word.cells — termasuk di sel persimpangan yang sama. Re-link di
 * sini mengarahkan SEMUA word.cells[i] ke objek grid[row][col] yang sama,
 * sehingga identitas objek konsisten persis seperti papan fresh. Tanpa ini,
 * mutasi in-place (solved / isLocked) di word.cells tidak terlihat oleh
 * board.grid → sel kata yang sudah solved bisa diedit lagi lewat inputLetter
 * (yang membaca board.grid).
 */
export function deserializeBoardProgress(json: string): BoardProgressState | null {
  try {
    const parsed = JSON.parse(json) as BoardProgressState;
    if (!parsed?.board?.grid || !Array.isArray(parsed.board.words)) return null;

    for (const word of parsed.board.words) {
      for (let i = 0; i < word.cells.length; i++) {
        const cell = word.cells[i];
        const gridCell = parsed.board.grid[cell.row]?.[cell.col];
        if (!gridCell) return null;
        // Pakai objek grid sebagai kanonik → identitas sama untuk semua kata.
        word.cells[i] = gridCell;
      }
    }

    return {
      board: parsed.board,
      filledLetters: parsed.filledLetters ?? {},
      hints: parsed.hints ?? {},
      currentXp: parsed.currentXp ?? 0,
      wordsSolved: parsed.wordsSolved ?? 0,
      totalXp: parsed.totalXp ?? 0,
    };
  } catch {
    return null;
  }
}
