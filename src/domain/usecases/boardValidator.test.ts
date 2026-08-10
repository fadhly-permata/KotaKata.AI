import { describe, expect, test } from "bun:test";
import type { Board, BoardCell, BoardWord } from "../entities/board";
import { validateBoard } from "./boardValidator";
import { generateBoard } from "./crosswordGenerator";
import type { WordCandidate } from "../entities/board";

function makeCandidates(words: string[]): WordCandidate[] {
  return words.map((w, i) => ({
    word: w,
    word_id: `t1-${String(i + 1).padStart(3, "0")}`,
    clue_1: `Clue ${w}`,
    tier_level: 1,
  }));
}

/** Bangun board sintetis valid 2 kata bersilangan (KAT mendatar × TIK menurun). */
function buildValidBoard(): Board {
  const cells: BoardCell[][] = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => ({
      row: r,
      col: c,
      letter: "",
      isBlocked: true,
      isLocked: false,
      wordIndex: -1,
      orientation: "horizontal" as const,
      number: undefined,
    })),
  );

  // Kata 1: KAT horizontal di baris 0
  cells[0]![0]!.letter = "K";
  cells[0]![1]!.letter = "A";
  cells[0]![2]!.letter = "T";
  // Kata 2: TIK vertikal di kolom 2
  cells[1]![2]!.letter = "I";
  cells[2]![2]!.letter = "K";

  const kat = [cells[0]![0]!, cells[0]![1]!, cells[0]![2]!];
  const tik = [cells[0]![2]!, cells[1]![2]!, cells[2]![2]!];
  kat.forEach((c, i) => {
    c.isBlocked = false;
    c.wordIndex = 0;
    c.orientation = "horizontal";
  });
  tik.forEach((c, i) => {
    c.isBlocked = false;
    c.wordIndex = 1;
    c.orientation = "vertical";
  });

  const words: BoardWord[] = [
    {
      word: "KAT",
      clue_1: "c1",
      orientation: "horizontal",
      startRow: 0,
      startCol: 0,
      cells: kat,
      solved: false,
    },
    {
      word: "TIK",
      clue_1: "c2",
      orientation: "vertical",
      startRow: 0,
      startCol: 2,
      cells: tik,
      solved: false,
    },
  ];

  return { grid: cells, words, size: 3, tierLevel: 1 };
}

describe("validateBoard", () => {
  test("board valid → valid true", () => {
    const result = validateBoard(buildValidBoard());
    expect(result.valid).toBe(true);
    expect(result.orphanWordIds).toHaveLength(0);
  });

  test("board hasil generateBoard selalu valid", () => {
    const pool = ["KATA", "TIKUS", "SUKA", "KAMAR", "MATA", "RASA", "IKAN", "LANGIT"];
    for (let i = 0; i < 5; i++) {
      const board = generateBoard(makeCandidates(pool), 10, 1);
      expect(validateBoard(board).valid).toBe(true);
    }
  });

  test("sel punya huruf tapi bukan bagian kata → error", () => {
    const board = buildValidBoard();
    // Sel (2,0) diberi huruf tapi wordIndex -1
    const cell = board.grid[2]![0]!;
    cell.letter = "Z";
    cell.isBlocked = false;
    cell.wordIndex = -1;
    const result = validateBoard(board);
    expect(result.valid).toBe(false);
    expect(result.overlapErrors.join(" ")).toMatch(/belongs to no word|no word assignment/i);
  });

  test("sel non-blocked tanpa word assignment → error", () => {
    const board = buildValidBoard();
    const cell = board.grid[1]![1]!;
    cell.isBlocked = false;
    const result = validateBoard(board);
    expect(result.valid).toBe(false);
    expect(result.overlapErrors.join(" ")).toMatch(/no word assignment/i);
  });

  test("board dengan satu kata (tidak bersilangan) tidak dianggap orphan", () => {
    const board = buildValidBoard();
    const result = validateBoard(board);
    expect(result.orphanWordIds).toHaveLength(0);
  });
});
