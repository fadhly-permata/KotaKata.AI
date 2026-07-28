import type { Board, BoardWord } from "../entities/board";

export interface WordValidationResult {
  wordIndex: number;
  word: string;
  isCorrect: boolean;
  filled: string;
  expected: string;
  correctLetters: number;
}

/**
 * Check if a specific word has been fully filled.
 */
export function isWordComplete(
  word: BoardWord,
  filledLetters: Record<string, string>,
): boolean {
  return word.cells.every((c) => {
    const letter = filledLetters[`${c.row},${c.col}`];
    return letter != null && letter !== "";
  });
}

/**
 * Check if a fully filled word is correct.
 */
export function validateWord(
  word: BoardWord,
  wordIndex: number,
  filledLetters: Record<string, string>,
): WordValidationResult {
  const filled = word.cells
    .map((c) => filledLetters[`${c.row},${c.col}`] || "")
    .join("");

  const isCorrect = filled.toUpperCase() === word.word.toUpperCase();
  const correctLetters = word.word
    .split("")
    .filter((letter, i) => letter.toUpperCase() === filled[i]?.toUpperCase())
    .length;

  return {
    wordIndex,
    word: word.word,
    isCorrect,
    filled,
    expected: word.word,
    correctLetters,
  };
}

/**
 * Find all completed words and return their validation results.
 */
export function validateAllWords(
  board: Board,
  filledLetters: Record<string, string>,
): WordValidationResult[] {
  return board.words
    .map((w, i) => ({ word: w, index: i }))
    .filter(({ word }) => isWordComplete(word, filledLetters))
    .map(({ word, index }) => validateWord(word, index, filledLetters));
}

/**
 * Check if the entire board is solved (all words correct).
 */
export function isBoardComplete(
  board: Board,
  filledLetters: Record<string, string>,
): boolean {
  return board.words.every((w, i) => {
    if (!isWordComplete(w, filledLetters)) return false;
    const result = validateWord(w, i, filledLetters);
    return result.isCorrect;
  });
}
