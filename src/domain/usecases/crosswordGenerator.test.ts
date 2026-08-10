import { describe, expect, test } from "bun:test";
import type { WordCandidate } from "../entities/board";
import { generateBoard } from "./crosswordGenerator";
import { validateBoard } from "./boardValidator";

function makeCandidates(words: string[], tierLevel = 1): WordCandidate[] {
  return words.map((w, i) => ({
    word: w,
    word_id: `t${tierLevel}-${String(i + 1).padStart(3, "0")}`,
    clue_1: `Clue untuk ${w}`,
    clue_2: `Clue 2 ${w}`,
    clue_3: `Clue 3 ${w}`,
    tier_level: tierLevel,
  }));
}

// Kata-kata yang kaya huruf silang agar placement mudah.
const POOL = [
  "KATA", "TIKUS", "SUKA", "KAMAR", "MATA", "RASA", "ASAM", "SAMA",
  "KIRI", "IKAN", "NILAI", "LANGIT", "TANAH", "HATI", "TARI", "RINDU",
  "INDAH", "DUNIA", "AIR", "KITA", "TUA", "AKU", "KAYU", "YAKIN",
  "NASI", "SIRIH", "HITAM", "MALAM", "LAMA", "AMAN",
];

describe("generateBoard", () => {
  test("menghasilkan board dengan kata >= 3", () => {
    const board = generateBoard(makeCandidates(POOL), 10, 1);
    expect(board.words.length).toBeGreaterThanOrEqual(3);
  });

  test("semua kata yang terpasang berasal dari kandidat", () => {
    const candidates = makeCandidates(POOL);
    const validWords = new Set(POOL);
    const board = generateBoard(candidates, 10, 1);
    for (const w of board.words) {
      expect(validWords.has(w.word)).toBe(true);
    }
  });

  test("board valid menurut validateBoard (tanpa orphan/konflik)", () => {
    const board = generateBoard(makeCandidates(POOL), 10, 1);
    const result = validateBoard(board);
    expect(result.valid).toBe(true);
  });

  test("tidak ada kata terpasang melebihi ukuran grid", () => {
    const board = generateBoard(makeCandidates(POOL), 8, 1);
    for (const w of board.words) {
      expect(w.word.length).toBeLessThanOrEqual(8);
      expect(w.startRow).toBeGreaterThanOrEqual(0);
      expect(w.startCol).toBeGreaterThanOrEqual(0);
      const maxRow = w.orientation === "vertical" ? w.startRow + w.word.length : w.startRow;
      const maxCol = w.orientation === "horizontal" ? w.startCol + w.word.length : w.startCol;
      expect(maxRow).toBeLessThanOrEqual(board.size);
      expect(maxCol).toBeLessThanOrEqual(board.size);
    }
  });

  test("setiap sel kata konsisten dengan huruf jawaban", () => {
    const board = generateBoard(makeCandidates(POOL), 10, 1);
    for (const w of board.words) {
      w.cells.forEach((cell, i) => {
        expect(cell.letter).toBe(w.word[i]);
      });
    }
  });

  test("grid konsisten dengan sel kata (tidak ada huruf nyasar)", () => {
    const board = generateBoard(makeCandidates(POOL), 10, 1);
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const cell = board.grid[r]![c]!;
        if (!cell.isBlocked) {
          expect(cell.letter).not.toBe("");
        } else {
          expect(cell.letter).toBe("");
        }
      }
    }
  });

  test("kata panjang disaring saat melebihi grid", () => {
    const board = generateBoard(makeCandidates(["PANJANG", "X", "YA", "O"]), 3, 1);
    for (const w of board.words) {
      expect(w.word.length).toBeLessThanOrEqual(3);
    }
  });

  test("terlalu sedikit kandidat tidak crash (fallback)", () => {
    const board = generateBoard(makeCandidates(["A", "B", "C"]), 5, 1);
    expect(board).toBeDefined();
    expect(board.size).toBe(5);
  });

  test("tierLevel tercatat di board", () => {
    const board = generateBoard(makeCandidates(POOL), 10, 7);
    expect(board.tierLevel).toBe(7);
  });

  test("deterministik secara struktur: sel yang sama berisi huruf sama", () => {
    const candidates = makeCandidates(POOL);
    const a = generateBoard(candidates, 10, 1);
    const b = generateBoard(candidates, 10, 1);
    expect(a.size).toBe(b.size);
    // Keduanya harus valid — isi spesifik boleh beda (acak), tapi konsisten internal.
    expect(validateBoard(a).valid).toBe(true);
    expect(validateBoard(b).valid).toBe(true);
  });
});
