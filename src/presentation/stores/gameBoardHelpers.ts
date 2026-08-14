import type { Board, BoardWord, Orientation } from "../../domain/entities/board";
import type { GameState } from "./gameStore";

/**
 * Helper murni (pure functions) untuk navigasi & pemilihan kata di papan
 * crossword. Dipisah dari `gameStore.ts` supaya store tetap ramping dan
 * logika papan bisa diuji tanpa menaruh state Zustand.
 *
 * Semua fungsi TIDAK mengubah board — hanya membaca & mengembalikan pilihan,
 * sehingga aman dipanggil dari mana saja.
 */

/** Kata yang masih bisa dimainkan (belum solved dan masih ada cell kosong). */
export function isWordPlayable(word: BoardWord): boolean {
  return !word.solved && word.cells.some((c) => !c.isLocked);
}

/**
 * Pilih index kata yang di-fokus saat kursor diarahkan ke (row, col):
 * lanjutkan kata yang sedang aktif kalau masih melewati cell itu; kalau tidak,
 * kata dengan orientasi yang sama dengan input saat ini; fallback kata pertama
 * yang tersedia di cell. Dipakai oleh navigasi panah & drag.
 */
export function pickWordIndexAtCell(
  board: Board,
  row: number,
  col: number,
  activeWordIndex: number | null,
  orientation: Orientation | null,
): number | null {
  const wordsAtCell = getWordsAtCell(board, row, col);
  if (wordsAtCell.length === 0) return null;
  if (activeWordIndex != null && wordsAtCell.includes(activeWordIndex)) {
    return activeWordIndex;
  }
  const sameOrientation = wordsAtCell.find((idx) => board.words[idx].orientation === orientation);
  return sameOrientation ?? wordsAtCell[0];
}

/**
 * Semua index kata (di board.words) yang melewati sebuah cell. Cell biasa
 * dilewati 1 kata; cell persimpangan dilewati 2 (satu mendatar, satu menurun).
 */
export function getWordsAtCell(board: Board, row: number, col: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < board.words.length; i++) {
    const w = board.words[i];
    if (w.orientation === "horizontal") {
      if (w.startRow === row && col >= w.startCol && col < w.startCol + w.word.length) {
        indices.push(i);
      }
    } else {
      if (w.startCol === col && row >= w.startRow && row < w.startRow + w.word.length) {
        indices.push(i);
      }
    }
  }
  return indices;
}

/** Auto-focus ke kata pertama yang belum selesai (urutan nomor clue). */
export function getInitialFocus(board: Board): Partial<GameState> | null {
  const sortedIndices = getSortedWordIndices(board);
  for (const idx of sortedIndices) {
    const word = board.words[idx];
    if (word.solved) continue;
    const firstUnlocked = word.cells.find((c) => !c.isLocked);
    if (firstUnlocked) {
      return {
        selectedCell: { row: firstUnlocked.row, col: firstUnlocked.col },
        selectedWordIndex: idx,
        inputOrientation: word.orientation,
      };
    }
  }
  return null;
}

/** Index kata di board.words, diurutkan berdasarkan nomor clue (bukan urutan array). */
export function getSortedWordIndices(board: Board): number[] {
  const wordNumbers = board.words.map((w) => w.cells[0]?.number ?? 999);
  return board.words
    .map((_, i) => i)
    .sort((a, b) => (wordNumbers[a] ?? 999) - (wordNumbers[b] ?? 999));
}

/** Sel berikutnya yang tidak blocked di arah tertentu (dipakai navigasi panah). */
export function getNextCell(
  board: Board,
  row: number,
  col: number,
  orientation: Orientation,
): { row: number; col: number } | null {
  if (orientation === "horizontal") {
    for (let c = col + 1; c < board.size; c++) {
      if (!board.grid[row][c].isBlocked) return { row, col: c };
    }
  } else {
    for (let r = row + 1; r < board.size; r++) {
      if (!board.grid[r][col].isBlocked) return { row: r, col };
    }
  }
  return null;
}

/** Sel sebelumnya yang tidak blocked di arah tertentu (dipakai navigasi panah). */
export function getPrevCell(
  board: Board,
  row: number,
  col: number,
  orientation: Orientation,
): { row: number; col: number } | null {
  if (orientation === "horizontal") {
    for (let c = col - 1; c >= 0; c--) {
      if (!board.grid[row][c].isBlocked) return { row, col: c };
    }
  } else {
    for (let r = row - 1; r >= 0; r--) {
      if (!board.grid[r][col].isBlocked) return { row: r, col };
    }
  }
  return null;
}

/** Kata berikutnya yang belum selesai (urutan nomor clue), untuk auto-advance. */
export function findNextUnsolvedWord(
  board: Board,
  currentWordIndex: number | null,
  filledLetters: Record<string, string>,
): BoardWord | null {
  const words = board.words;
  const startIdx = currentWordIndex ?? 0;

  // Build a map: wordIndex → clue number (from first cell's number)
  const wordNumbers = words.map((w) => w.cells[0]?.number ?? 999);

  // Create sorted indices by clue number
  const sortedIndices = words
    .map((_, i) => i)
    .sort((a, b) => (wordNumbers[a] ?? 999) - (wordNumbers[b] ?? 999));

  // Find where current word is in the sorted order
  let currentPos = 0;
  for (let i = 0; i < sortedIndices.length; i++) {
    if (sortedIndices[i] === startIdx) {
      currentPos = i;
      break;
    }
  }

  // Search forward from current position
  for (let offset = 1; offset < sortedIndices.length; offset++) {
    const idx = sortedIndices[(currentPos + offset) % sortedIndices.length];
    const word = words[idx];
    if (word.solved) continue;
    if (word.cells.every((c) => filledLetters[`${c.row},${c.col}`] || c.isLocked)) continue;
    return word;
  }

  return null;
}
