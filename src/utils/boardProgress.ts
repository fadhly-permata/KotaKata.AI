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
 * format tidak valid. Sel-sel grid di-relink ulang ke objek yang sama dengan
 * word.cells supaya mutasi in-place (solved / isLocked) tetap terlihat di
 * rendering grid.
 */
export function deserializeBoardProgress(json: string): BoardProgressState | null {
  try {
    const parsed = JSON.parse(json) as BoardProgressState;
    if (!parsed?.board?.grid || !Array.isArray(parsed.board.words)) return null;

    for (const word of parsed.board.words) {
      for (const cell of word.cells) {
        const gridCell = parsed.board.grid[cell.row]?.[cell.col];
        if (!gridCell) return null;
        parsed.board.grid[cell.row][cell.col] = cell;
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
