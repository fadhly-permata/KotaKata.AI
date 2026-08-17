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
  /** ID dari tabel vocabulary (mis. "t1-001") — dipakai untuk riwayat penemuan kata */
  word_id?: string;
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
  word_id?: string;
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
  /**
   * Mode SEMUA tier (PLAN-046): pool kata diambil dari tier 1–10 tanpa batas
   * tier — dipakai pemain dengan XP ≥ 800.000. Kata yang sudah ditemukan
   * (excludedWordIds) tetap dikecualikan dari tier mana pun.
   */
  allTiers?: boolean;
}
