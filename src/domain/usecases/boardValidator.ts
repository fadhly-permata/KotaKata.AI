import type { Board, BoardCell } from "../entities/board";

export interface ValidationResult {
  valid: boolean;
  orphanWordIds: number[];
  overlapErrors: string[];
  message: string;
}

/**
 * Validates a generated crossword board.
 */
export function validateBoard(board: Board): ValidationResult {
  const errors: string[] = [];
  const orphanWordIds: number[] = [];

  // Check 1: Overlapping cells have matching letters
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      // Check if cell belongs to multiple words with conflicting letters
      const cell = board.grid[r][c];
      if (cell.isBlocked) continue;

      // Check adjacent horizontal and vertical for any word
      const hasHorizontal = cell.orientation === "horizontal" || cell.wordIndex >= 0;
      const hasVertical = cell.orientation === "vertical" || cell.wordIndex >= 0;
      if (!hasHorizontal && !hasVertical && cell.letter) {
        errors.push(`Cell (${r},${c}) has letter but belongs to no word`);
      }
    }
  }

  // Check 2: No orphan words - each word must intersect at least 1 other.
  // Sebuah kata bersilangan dengan kata lain bila ada sel-nya yang juga
  // merupakan sel kata lain dengan orientasi tegak lurus. Deteksi cukup
  // lewat tetangga tegak lurus yang terisi (bukan hanya sel pertama kata).
  for (let wi = 0; wi < board.words.length; wi++) {
    const word = board.words[wi];
    let intersections = 0;

    for (const cell of word.cells) {
      const hasPerpendicularNeighbor =
        word.orientation === "horizontal"
          ? (cell.row > 0 && !board.grid[cell.row - 1][cell.col].isBlocked) ||
            (cell.row < board.size - 1 && !board.grid[cell.row + 1][cell.col].isBlocked)
          : (cell.col > 0 && !board.grid[cell.row][cell.col - 1].isBlocked) ||
            (cell.col < board.size - 1 && !board.grid[cell.row][cell.col + 1].isBlocked);

      if (hasPerpendicularNeighbor) {
        const crossed = board.words.some(
          (other) =>
            other !== word &&
            other.orientation !== word.orientation &&
            other.cells.some((oc) => oc.row === cell.row && oc.col === cell.col),
        );
        if (crossed) {
          intersections++;
          break;
        }
      }
    }

    if (intersections === 0 && board.words.length > 1) {
      orphanWordIds.push(wi);
    }
  }

  if (orphanWordIds.length > 0) {
    errors.push(`Orphan words: ${orphanWordIds.map((i) => board.words[i]?.word).filter(Boolean).join(", ")}`);
  }

  // Check 3: All non-blocked cells belong to at least one word
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const cell = board.grid[r][c];
      if (!cell.isBlocked && cell.wordIndex === -1) {
        errors.push(`Cell (${r},${c}) has no word assignment`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    orphanWordIds,
    overlapErrors: errors,
    message: errors.length === 0 ? "Board valid" : `Invalid: ${errors.join("; ")}`,
  };
}
