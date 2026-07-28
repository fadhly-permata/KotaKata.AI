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
    if (!validateGrid(testGrid, size)) continue;

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
    // No adjacent parallel words (avoid creating accidental words)
    if (i === 0 && col > 0 && grid[row][col - 1] !== "") return false;
    if (i === word.length - 1 && col + word.length < size && grid[row][col + word.length] !== "") return false;
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
    // No adjacent parallel words
    if (i === 0 && row > 0 && grid[row - 1][col] !== "") return false;
    if (i === word.length - 1 && row + word.length < size && grid[row + word.length][col] !== "") return false;
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

function validateGrid(grid: string[][], size: number): boolean {
  // Check for accidental NEW words on the opposite axis
  // This is called AFTER a word is placed, so existing runs from placed words
  // are expected. Only flag runs that weren't there before.
  // Since we check canPlaceHorizontal/ canPlaceVertical which already prevent
  // adjacent parallel words, the primary concern is accidental perpendicular
  // words at non-intersection points. The most reliable check: ensure no
  // single cell UNCONNECTED to a placed word has a neighbor on both sides.
  
  // Simplified: just check that no cell has filled neighbors on both
  // adjacent perpendicular positions without being part of the current word.
  // This is a lightweight version that catches real accidents.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") continue;
      
      // Check horizontal: if this cell and two adjacent to it are filled,
      // it might be an accidental word. But we only flag if none of the
      // adjacent perpendicular cells are also filled (making it a real word).
      if (c > 0 && c < size - 1) {
        if (grid[r][c - 1] !== "" && grid[r][c + 1] !== "") {
          // Three in a row horizontally — this is expected for placed words.
          // Only flag as accident if it's ALSO disconnected vertically
          if (r > 0 && r < size - 1) {
            if (grid[r - 1][c] === "" && grid[r + 1][c] === "") {
              // Check if this is truly isolated (doesn't connect to any
              // perpendicular word via shared letter)
              return false;
            }
          }
        }
      }
      
      // Check vertical
      if (r > 0 && r < size - 1) {
        if (grid[r - 1][c] !== "" && grid[r + 1][c] !== "") {
          if (c > 0 && c < size - 1) {
            if (grid[r][c - 1] === "" && grid[r][c + 1] === "") {
              return false;
            }
          }
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
