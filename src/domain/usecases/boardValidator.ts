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

  // Check 2: No orphan words - each word must intersect at least 1 other
  for (let wi = 0; wi < board.words.length; wi++) {
    const word = board.words[wi];
    let intersections = 0;

    for (const cell of word.cells) {
      // Check if this cell is also part of another word (perpendicular)
      if (word.orientation === "horizontal") {
        if (cell.row > 0 && !board.grid[cell.row - 1][cell.col].isBlocked) continue;
        if (cell.row < board.size - 1 && !board.grid[cell.row + 1][cell.col].isBlocked) {
          // Cell has vertical neighbor = intersection possible
          for (const otherWord of board.words) {
            if (otherWord === word) continue;
            if (otherWord.orientation === "vertical") {
              for (const oc of otherWord.cells) {
                if (oc.row === cell.row && oc.col === cell.col) {
                  intersections++;
                  break;
                }
              }
            }
            if (intersections > 0) break;
          }
        }
      } else {
        if (cell.col > 0 && !board.grid[cell.row][cell.col - 1].isBlocked) continue;
        if (cell.col < board.size - 1 && !board.grid[cell.row][cell.col + 1].isBlocked) {
          for (const otherWord of board.words) {
            if (otherWord === word) continue;
            if (otherWord.orientation === "horizontal") {
              for (const oc of otherWord.cells) {
                if (oc.row === cell.row && oc.col === cell.col) {
                  intersections++;
                  break;
                }
              }
            }
            if (intersections > 0) break;
          }
        }
      }
      if (intersections > 0) break;
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
