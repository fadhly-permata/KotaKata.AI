import { create } from "zustand";
import type { Board, Orientation } from "../../domain/entities/board";

interface HintUsage {
  clue2Used: boolean;
  clue3Used: boolean;
  revealedCells: string[];
}

interface GameState {
  board: Board | null;
  loading: boolean;
  selectedCell: { row: number; col: number } | null;
  selectedWordIndex: number | null;
  inputOrientation: Orientation | null;
  filledLetters: Record<string, string>;
  hints: Record<string, HintUsage>;
  currentXp: number;
  wordsSolved: number;

  setBoard: (board: Board) => void;
  selectCell: (row: number, col: number) => void;
  toggleOrientation: () => void;
  inputLetter: (letter: string) => void;
  deleteLetter: () => void;
  navigateToCell: (direction: "up" | "down" | "left" | "right") => void;
  useClue2: (wordIndex: number) => void;
  useClue3: (wordIndex: number) => void;
  revealLetter: (wordIndex: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  board: null,
  loading: false,
  selectedCell: null,
  selectedWordIndex: null,
  inputOrientation: null,
  filledLetters: {},
  hints: {},
  currentXp: 0,
  wordsSolved: 0,

  setBoard: (board: Board) => set({ board, loading: false }),

  selectCell: (row: number, col: number) => {
    const { board } = get();
    if (!board) return;

    const cell = board.grid[row]?.[col];
    if (!cell || cell.isBlocked) return;

    const state = get();
    if (state.selectedCell?.row === row && state.selectedCell?.col === col) {
      get().toggleOrientation();
      return;
    }

    const hasVertical = row > 0 && !board.grid[row - 1][col].isBlocked;
    let orientation: Orientation = "horizontal";
    if (hasVertical) orientation = "vertical";

    set({
      selectedCell: { row, col },
      inputOrientation: orientation,
      selectedWordIndex: cell.wordIndex,
    });
  },

  toggleOrientation: () => {
    const { inputOrientation } = get();
    set({
      inputOrientation: inputOrientation === "horizontal" ? "vertical" : "horizontal",
    });
  },

  inputLetter: (letter: string) => {
    const { board, selectedCell, inputOrientation, filledLetters } = get();
    if (!board || !selectedCell || !inputOrientation) return;

    const key = `${selectedCell.row},${selectedCell.col}`;
    const cell = board.grid[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.isBlocked || cell.isLocked) return;

    const newLetters = { ...filledLetters, [key]: letter.toUpperCase() };
    set({ filledLetters: newLetters });

    const nextPos = getNextCell(board, selectedCell.row, selectedCell.col, inputOrientation);
    if (nextPos) {
      const nextCell = board.grid[nextPos.row]?.[nextPos.col];
      if (nextCell && !nextCell.isBlocked) {
        set({ selectedCell: nextPos });
      }
    }
  },

  deleteLetter: () => {
    const { board, selectedCell, inputOrientation, filledLetters } = get();
    if (!board || !selectedCell) return;

    const key = `${selectedCell.row},${selectedCell.col}`;
    if (filledLetters[key]) {
      const newLetters = { ...filledLetters };
      delete newLetters[key];
      set({ filledLetters: newLetters });
    } else {
      const prevPos = getPrevCell(board, selectedCell.row, selectedCell.col, inputOrientation ?? "horizontal");
      if (prevPos) {
        const prevKey = `${prevPos.row},${prevPos.col}`;
        const newLetters = { ...filledLetters };
        delete newLetters[prevKey];
        set({ filledLetters: newLetters, selectedCell: prevPos });
      }
    }
  },

  navigateToCell: (direction: "up" | "down" | "left" | "right") => {
    const { board, selectedCell } = get();
    if (!board || !selectedCell) return;

    let { row, col } = selectedCell;
    switch (direction) {
      case "up": row = Math.max(0, row - 1); break;
      case "down": row = Math.min(board.size - 1, row + 1); break;
      case "left": col = Math.max(0, col - 1); break;
      case "right": col = Math.min(board.size - 1, col + 1); break;
    }

    const cell = board.grid[row]?.[col];
    if (cell && !cell.isBlocked) {
      set({
        selectedCell: { row, col },
        selectedWordIndex: cell.wordIndex,
        inputOrientation: cell.orientation,
      });
    }
  },

  useClue2: (wordIndex: number) => {
    const { hints } = get();
    set({
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue2Used: true, revealedCells: [] } },
      currentXp: Math.max(0, get().currentXp - 50),
    });
  },

  useClue3: (wordIndex: number) => {
    const { hints } = get();
    set({
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue3Used: true, revealedCells: [] } },
      currentXp: Math.max(0, get().currentXp - 100),
    });
  },

  revealLetter: (wordIndex: number) => {
    const { board, filledLetters, hints } = get();
    if (!board || !board.words[wordIndex]) return;

    const word = board.words[wordIndex];
    const unrevealed = word.cells.filter(
      (c: { row: number; col: number; isLocked: boolean }) => !filledLetters[`${c.row},${c.col}`] && !c.isLocked,
    );
    if (unrevealed.length === 0) return;

    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const key = `${target.row},${target.col}`;
    const offset = word.orientation === "vertical" ? target.row - word.startRow : target.col - word.startCol;
    const letter = word.word[offset];

    set({
      filledLetters: { ...filledLetters, [key]: letter },
      currentXp: Math.max(0, get().currentXp - 75),
      hints: {
        ...hints,
        [wordIndex]: {
          ...hints[wordIndex],
          revealedCells: [...(hints[wordIndex]?.revealedCells ?? []), key],
        },
      },
    });
  },

  reset: () =>
    set({
      board: null,
      loading: false,
      selectedCell: null,
      selectedWordIndex: null,
      inputOrientation: null,
      filledLetters: {},
      hints: {},
      currentXp: 0,
      wordsSolved: 0,
    }),
}));

function getNextCell(
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

function getPrevCell(
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
