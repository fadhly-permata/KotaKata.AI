export type Orientation = "horizontal" | "vertical";

export interface BoardCell {
  row: number;
  col: number;
  letter: string;
  isBlocked: boolean;
  isLocked: boolean;
  /** Index into Board.words[] */
  wordIndex: number;
  orientation: Orientation;
  number?: number; // clue number displayed in the cell
}

export interface BoardWord {
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  orientation: Orientation;
  startRow: number;
  startCol: number;
  cells: BoardCell[];
  solved: boolean;
}

export interface Board {
  grid: BoardCell[][];
  words: BoardWord[];
  size: number;
  tierLevel: number;
}

export interface WordCandidate {
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  tier_level: number;
}

/**
 * Filter criteria for selecting words to generate a board.
 */
export interface WordPoolFilterParams {
  playerTier: number;
  excludedWordIds: string[];
  gridSize: number;
  minWords?: number;
}
