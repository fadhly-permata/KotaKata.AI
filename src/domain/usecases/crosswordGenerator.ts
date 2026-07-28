import type { Board, BoardCell, BoardWord, WordCandidate, Orientation } from "../entities/board";
import { loggerWarn } from "../../utils/logger";

const DEFAULT_SIZE = 10;

/** Generate a crossword board from a pool of word candidates */
export function generateBoard(
  candidates: WordCandidate[],
  size: number = DEFAULT_SIZE,
): Board {
  const words = [...candidates.filter((c) => c.word.length <= size)];
  if (words.length < 5) {
    loggerWarn("Too few candidates for board generation", words.length);
  }

  // Sort by length descending — longer words placed first for density
  const sorted = sortByLength(words);

  // Try multiple times with different starting positions
  for (let attempt = 0; attempt < 3; attempt++) {
    const grid = createEmptyGrid(size);
    const placed: PlacedWord[] = [];
    const shuffled = attempt > 0 ? shuffleArray(sorted) : sorted;

    if (tryPlaceWords(shuffled, grid, placed, size)) {
      return buildBoard(grid, placed, size);
    }
  }

  // Fallback: return whatever was placed
  const grid = createEmptyGrid(size);
  const placed: PlacedWord[] = [];
  tryPlaceWords(sorted, grid, placed, size, true);
  return buildBoard(grid, placed, size);
}

// ---- Internal Types ----

interface PlacedWord {
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  startRow: number;
  startCol: number;
  orientation: Orientation;
}

// ---- Grid Helpers ----

function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(""));
}

function cloneGrid(grid: string[][]): string[][] {
  return grid.map((r) => [...r]);
}

function isInBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

// ---- Backtracking Algorithm ----

function tryPlaceWords(
  candidates: WordCandidate[],
  grid: string[][],
  placed: PlacedWord[],
  size: number,
  greedy = false,
): boolean {
  if (candidates.length === 0) return placed.length >= 3;

  const [first, ...rest] = candidates;

  // First word: place in the middle
  if (placed.length === 0) {
    const mid = Math.floor(size / 2);
    const startCol = Math.max(0, mid - Math.floor(first.word.length / 2));

    if (canPlaceHorizontal(first.word, grid, mid, startCol, size)) {
      placeHorizontal(first.word, grid, mid, startCol);
      placed.push({
        word: first.word,
        clue_1: first.clue_1,
        clue_2: first.clue_2,
        clue_3: first.clue_3,
        startRow: mid,
        startCol,
        orientation: "horizontal",
      });
      if (tryPlaceWords(rest, grid, placed, size, greedy)) return true;
      removeHorizontal(grid, mid, startCol, first.word.length);
      placed.pop();
    }

    // Try vertical
    if (canPlaceVertical(first.word, grid, mid, startCol, size)) {
      placeVertical(first.word, grid, mid, startCol);
      placed.push({
        word: first.word,
        clue_1: first.clue_1,
        clue_2: first.clue_2,
        clue_3: first.clue_3,
        startRow: mid,
        startCol,
        orientation: "vertical",
      });
      if (tryPlaceWords(rest, grid, placed, size, greedy)) return true;
      removeVertical(grid, mid, startCol, first.word.length);
      placed.pop();
    }

    return false;
  }

  // Subsequent words: find intersections with placed words
  const positions = findAllIntersections(first.word, placed, grid, size);

  for (const pos of positions) {
    const testGrid = cloneGrid(grid);
    if (pos.orientation === "horizontal") {
      if (!canPlaceHorizontal(first.word, testGrid, pos.row, pos.col, size)) continue;
      placeHorizontal(first.word, testGrid, pos.row, pos.col);
    } else {
      if (!canPlaceVertical(first.word, testGrid, pos.row, pos.col, size)) continue;
      placeVertical(first.word, testGrid, pos.row, pos.col);
    }

    // Validate no accidental new words formed
    if (!validateGrid(testGrid, size, placed, first.word, pos)) continue;

    applyGrid(grid, testGrid);
    placed.push({
      word: first.word,
      clue_1: first.clue_1,
      clue_2: first.clue_2,
      clue_3: first.clue_3,
      startRow: pos.row,
      startCol: pos.col,
      orientation: pos.orientation,
    });

    if (tryPlaceWords(rest, grid, placed, size, greedy)) return true;

    // Backtrack
    restoreGrid(grid, placed, size);
    placed.pop();
  }

  // Greedy: skip this word if can't place
  if (greedy && placed.length >= 3) {
    return tryPlaceWords(rest, grid, placed, size, true);
  }

  return false;
}

// ---- Intersection Finder ----

function findAllIntersections(
  word: string,
  placed: PlacedWord[],
  grid: string[][],
  size: number,
): Array<{ row: number; col: number; orientation: Orientation }> {
  const results: Array<{ row: number; col: number; orientation: Orientation }> = [];

  for (const placedWord of placed) {
    for (let i = 0; i < placedWord.word.length; i++) {
      const letter = placedWord.word[i];
      const wordLetterIdx = word.indexOf(letter);
      if (wordLetterIdx === -1) continue;

      // Letter matches — try crossing at this point
      if (placedWord.orientation === "horizontal") {
        const crossRow = placedWord.startRow - wordLetterIdx;
        const crossCol = placedWord.startCol + i;

        // Vertical word crossing horizontal placed word
        if (isInBounds(crossRow, crossCol, size) &&
            crossRow + word.length - 1 < size &&
            crossRow >= 0) {
          results.push({ row: crossRow, col: crossCol, orientation: "vertical" });
        }
      } else {
        const crossRow = placedWord.startRow + i;
        const crossCol = placedWord.startCol - wordLetterIdx;

        // Horizontal word crossing vertical placed word
        if (isInBounds(crossRow, crossCol, size) &&
            crossCol + word.length - 1 < size &&
            crossCol >= 0) {
          results.push({ row: crossRow, col: crossCol, orientation: "horizontal" });
        }
      }
    }
  }

  return shuffleArray(results);
}

// ---- Placement Checks ----

function canPlaceHorizontal(
  word: string,
  grid: string[][],
  row: number,
  col: number,
  size: number,
): boolean {
  if (col + word.length > size) return false;

  for (let i = 0; i < word.length; i++) {
    const cell = grid[row][col + i];
    if (cell !== "" && cell !== word[i]) return false;

    // No adjacent parallel words on the same axis
    if (i === 0 && col > 0 && grid[row][col - 1] !== "") return false;
    if (i === word.length - 1 && col + word.length < size && grid[row][col + word.length] !== "") return false;

    // For NEW cells (not crossing an existing word), ensure perpendicular
    // neighbors are empty — prevents vertical words from touching the
    // horizontal word's sides and creating a merged visual appearance.
    if (cell === "") {
      if (row > 0 && grid[row - 1][col + i] !== "") return false;
      if (row < size - 1 && grid[row + 1][col + i] !== "") return false;
    }
  }

  return true;
}

function canPlaceVertical(
  word: string,
  grid: string[][],
  row: number,
  col: number,
  size: number,
): boolean {
  if (row + word.length > size) return false;

  for (let i = 0; i < word.length; i++) {
    const cell = grid[row + i][col];
    if (cell !== "" && cell !== word[i]) return false;

    // No adjacent parallel words on the same axis
    if (i === 0 && row > 0 && grid[row - 1][col] !== "") return false;
    if (i === word.length - 1 && row + word.length < size && grid[row + word.length][col] !== "") return false;

    // For NEW cells (not crossing an existing word), ensure perpendicular
    // neighbors are empty — prevents horizontal words from touching the
    // vertical word's sides and creating a merged visual appearance.
    if (cell === "") {
      if (col > 0 && grid[row + i][col - 1] !== "") return false;
      if (col < size - 1 && grid[row + i][col + 1] !== "") return false;
    }
  }

  return true;
}

function placeHorizontal(word: string, grid: string[][], row: number, col: number) {
  for (let i = 0; i < word.length; i++) {
    grid[row][col + i] = word[i];
  }
}

function placeVertical(word: string, grid: string[][], row: number, col: number) {
  for (let i = 0; i < word.length; i++) {
    grid[row + i][col] = word[i];
  }
}

function removeHorizontal(grid: string[][], row: number, col: number, len: number) {
  for (let i = 0; i < len; i++) {
    grid[row][col + i] = "";
  }
}

function removeVertical(grid: string[][], row: number, col: number, len: number) {
  for (let i = 0; i < len; i++) {
    grid[row + i][col] = "";
  }
}

// ---- Validation ----

function validateGrid(
  grid: string[][],
  size: number,
  placed: PlacedWord[],
  newWord: string,
  newPos: { row: number; col: number; orientation: Orientation },
): boolean {
  // We only want to catch truly accidental 3+ letter sequences.
  // The adjacency checks in canPlaceHorizontal/Vertical already prevent
  // words from being adjacent on the same axis, so the only risk is
  // forming an accidental perpendicular word.
  //
  // Strategy: for every filled cell, check if there are 3+ consecutive
  // filled cells in any direction that DON'T belong to any placed word.
  // We do this by tracking cells that belong to known words.
  
  const wordCells = new Set<string>();
  for (const pw of placed) {
    for (let i = 0; i < pw.word.length; i++) {
      const r = pw.orientation === "horizontal" ? pw.startRow : pw.startRow + i;
      const c = pw.orientation === "horizontal" ? pw.startCol + i : pw.startCol;
      wordCells.add(`${r},${c}`);
    }
  }
  // Add the new word's cells
  for (let i = 0; i < newWord.length; i++) {
    const r = newPos.orientation === "horizontal" ? newPos.row : newPos.row + i;
    const c = newPos.orientation === "horizontal" ? newPos.col + i : newPos.col;
    wordCells.add(`${r},${c}`);
  }

  // Check for any filled cell that has 3+ consecutive filled neighbors
  // in a direction where none of those cells are in wordCells
  for (let r = 0; r < size; r++) {
    // Check horizontal runs
    let runStart = -1;
    for (let c = 0; c <= size; c++) {
      const filled = c < size && grid[r][c] !== "";
      if (filled && runStart === -1) runStart = c;
      if (!filled && runStart !== -1) {
        const runLen = c - runStart;
        if (runLen >= 3) {
          // Check if ALL cells in this run are part of known words
          const allKnown = Array.from({ length: runLen }, (_, i) => `${r},${runStart + i}`)
            .every((k) => wordCells.has(k));
          if (!allKnown) return false;
        }
        runStart = -1;
      }
    }

    // Check vertical runs
    for (let c = 0; c < size; c++) {
      runStart = -1;
      for (let r2 = 0; r2 <= size; r2++) {
        const filled = r2 < size && grid[r2][c] !== "";
        if (filled && runStart === -1) runStart = r2;
        if (!filled && runStart !== -1) {
          const runLen = r2 - runStart;
          if (runLen >= 3) {
            const allKnown = Array.from({ length: runLen }, (_, i) => `${runStart + i},${c}`)
              .every((k) => wordCells.has(k));
            if (!allKnown) return false;
          }
          runStart = -1;
        }
      }
    }
  }

  return true;
}

// ---- Grid State Management ----

function applyGrid(dest: string[][], src: string[][]) {
  for (let r = 0; r < dest.length; r++) {
    for (let c = 0; c < dest[r].length; c++) {
      if (src[r][c] !== "") dest[r][c] = src[r][c];
    }
  }
}

function restoreGrid(grid: string[][], placed: PlacedWord[], size: number) {
  // Clear entire grid
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = "";
    }
  }
  // Re-place remaining words
  for (const pw of placed) {
    if (pw.orientation === "horizontal") {
      placeHorizontal(pw.word, grid, pw.startRow, pw.startCol);
    } else {
      placeVertical(pw.word, grid, pw.startRow, pw.startCol);
    }
  }
}

// ---- Board Builder ----

function buildBoard(grid: string[][], placed: PlacedWord[], size: number): Board {
  // Build cells
  const cells: BoardCell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      row: r,
      col: c,
      letter: grid[r][c] || "",
      isBlocked: grid[r][c] === "",
      isLocked: false,
      wordIndex: -1,
      orientation: "horizontal" as Orientation,
      number: undefined,
    })),
  );

  // Build BoardWord entries
  const boardWords: BoardWord[] = placed.map((pw, idx) => {
    const wordCells: BoardCell[] = [];
    for (let i = 0; i < pw.word.length; i++) {
      const r = pw.orientation === "horizontal" ? pw.startRow : pw.startRow + i;
      const c = pw.orientation === "horizontal" ? pw.startCol + i : pw.startCol;
      const cell = cells[r][c];
      cell.wordIndex = idx;
      cell.orientation = pw.orientation;
      cell.isBlocked = false;
      wordCells.push(cell);
    }
    return {
      word: pw.word,
      clue_1: pw.clue_1,
      clue_2: pw.clue_2,
      clue_3: pw.clue_3,
      orientation: pw.orientation,
      startRow: pw.startRow,
      startCol: pw.startCol,
      cells: wordCells,
      solved: false,
    };
  });

  // Assign clue numbers
  let number = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!cells[r][c].isBlocked && (
        (c === 0 || cells[r][c - 1].isBlocked) ||
        (r === 0 || cells[r - 1][c].isBlocked)
      )) {
        cells[r][c].number = number++;
      }
    }
  }

  return { grid: cells, words: boardWords, size, tierLevel: 1 };
}

// ---- Utilities ----

function sortByLength(candidates: WordCandidate[]): WordCandidate[] {
  return [...candidates].sort((a, b) => b.word.length - a.word.length);
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
