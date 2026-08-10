import { describe, expect, test } from "bun:test";
import type { Board, BoardCell, BoardWord } from "../entities/board";
import {
  isBoardComplete,
  isWordComplete,
  validateAllWords,
  validateWord,
} from "./wordValidator";

/** Bangun board kecil 2 kata (mendatar + menurun) yang saling bersilangan. */
function buildSampleBoard(): Board {
  const cells: BoardCell[][] = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => ({
      row: r,
      col: c,
      letter: "",
      isBlocked: false,
      isLocked: false,
      wordIndex: -1,
      orientation: "horizontal" as const,
      number: undefined,
    })),
  );

  // "KATA" horizontal di baris 0: K-A-T-A
  const horizCells = [cells[0][0], cells[0][1], cells[0][2], cells[0][3] ?? cells[0][2]];
  void horizCells;
  // Board 3x3 tidak muat 4 huruf; pakai kata 3 huruf.
  const kataCells = [cells[0][0], cells[0][1], cells[0][2]];
  kataCells.forEach((c) => (c.orientation = "horizontal"));

  const apiCells = [cells[0][2], cells[1][2], cells[2][2]];
  apiCells.forEach((c) => (c.orientation = "vertical"));

  const words: BoardWord[] = [
    {
      word: "KAT",
      clue_1: "clue 1",
      orientation: "horizontal",
      startRow: 0,
      startCol: 0,
      cells: kataCells,
      solved: false,
    },
    {
      word: "TIK",
      clue_1: "clue 2",
      orientation: "vertical",
      startRow: 0,
      startCol: 2,
      cells: apiCells,
      solved: false,
    },
  ];

  return { grid: cells, words, size: 3, tierLevel: 1 };
}

describe("isWordComplete", () => {
  test("kata kosong tidak lengkap", () => {
    const board = buildSampleBoard();
    expect(isWordComplete(board.words[0]!, {})).toBe(false);
  });

  test("kata terisi penuh dianggap lengkap", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "K", "0,1": "A", "0,2": "T" };
    expect(isWordComplete(board.words[0]!, filled)).toBe(true);
  });

  test("kata terisi sebagian tidak lengkap", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "K", "0,1": "A" };
    expect(isWordComplete(board.words[0]!, filled)).toBe(false);
  });
});

describe("validateWord", () => {
  test("jawaban benar terdeteksi", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "K", "0,1": "A", "0,2": "T" };
    const res = validateWord(board.words[0]!, 0, filled);
    expect(res.isCorrect).toBe(true);
    expect(res.word).toBe("KAT");
    expect(res.filled).toBe("KAT");
    expect(res.correctLetters).toBe(3);
  });

  test("jawaban salah terdeteksi", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "K", "0,1": "A", "0,2": "X" };
    const res = validateWord(board.words[0]!, 0, filled);
    expect(res.isCorrect).toBe(false);
    expect(res.correctLetters).toBe(2);
  });

  test("case-insensitive (huruf kecil diterima)", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "k", "0,1": "a", "0,2": "t" };
    const res = validateWord(board.words[0]!, 0, filled);
    expect(res.isCorrect).toBe(true);
  });

  test("sel kosong dianggap salah", () => {
    const board = buildSampleBoard();
    // Sel tengah kosong → string gabungan jadi "KT" (hanya K yang cocok posisinya)
    const filled = { "0,0": "K", "0,1": "", "0,2": "T" };
    const res = validateWord(board.words[0]!, 0, filled);
    expect(res.isCorrect).toBe(false);
    expect(res.correctLetters).toBe(1);
  });
});

describe("validateAllWords", () => {
  test("hanya kata lengkap yang divalidasi", () => {
    const board = buildSampleBoard();
    // KAT lengkap; TIK belum terisi sama sekali → hanya 1 hasil
    const filled = { "0,0": "K", "0,1": "A", "0,2": "T" };
    const results = validateAllWords(board, filled);
    expect(results).toHaveLength(1);
    expect(results[0]!.word).toBe("KAT");
  });

  test("semua kata benar saat board penuh", () => {
    const board = buildSampleBoard();
    const filled = {
      "0,0": "K", "0,1": "A", "0,2": "T",
      "1,2": "I", "2,2": "K",
    };
    const results = validateAllWords(board, filled);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.isCorrect)).toBe(true);
  });
});

describe("isBoardComplete", () => {
  test("board belum penuh → tidak selesai", () => {
    const board = buildSampleBoard();
    const filled = { "0,0": "K", "0,1": "A", "0,2": "T" };
    expect(isBoardComplete(board, filled)).toBe(false);
  });

  test("board penuh & benar → selesai", () => {
    const board = buildSampleBoard();
    const filled = {
      "0,0": "K", "0,1": "A", "0,2": "T",
      "1,2": "I", "2,2": "K",
    };
    expect(isBoardComplete(board, filled)).toBe(true);
  });

  test("board penuh tapi ada yang salah → tidak selesai", () => {
    const board = buildSampleBoard();
    const filled = {
      "0,0": "K", "0,1": "A", "0,2": "T",
      "1,2": "X", "2,2": "K",
    };
    expect(isBoardComplete(board, filled)).toBe(false);
  });
});
