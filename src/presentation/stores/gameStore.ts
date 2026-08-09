import { create } from "zustand";
import type { Board, BoardWord, Orientation } from "../../domain/entities/board";
import { calcXpGain, calcTier, XP_PENALTY_CLUE_2, XP_PENALTY_CLUE_3, XP_PENALTY_REVEAL, TIER_NAMES } from "../../domain/usecases/xpEngine";
import { validateWord } from "../../domain/usecases/wordValidator";
import { loggerInfo } from "../../utils/logger";
import type { BoardProgressState } from "../../utils/boardProgress";

interface HintUsage {
  clue2Used: boolean;
  clue3Used: boolean;
  revealedCells: string[];
}

interface BoardResult {
  totalWords: number;
  wordsSolved: number;
  xpGained: number;
  previousTier: number;
  newTier: number;
  tierChanged: boolean;
  timeElapsed: number;
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
  totalXp: number; // cumulative XP across games
  sessionStartTime: number;
  boardResult: BoardResult | null;

  setBoard: (board: Board) => void;
  /** Kata soal dari AI (Main Mode AI) — dipakai sekali oleh GameScreen, lalu dibersihkan. */
  aiWords: Array<{ word: string; clue_1: string; clue_2?: string }> | null;
  setAiWords: (words: Array<{ word: string; clue_1: string; clue_2?: string }> | null) => void;
  /** True saat papan berasal dari Main Mode AI — XP sama sekali tidak dihitung. */
  aiMode: boolean;
  setAiMode: (aiMode: boolean) => void;
  selectCell: (row: number, col: number) => void;
  toggleOrientation: () => void;
  inputLetter: (letter: string) => void;
  deleteLetter: () => void;
  navigateToCell: (direction: "up" | "down" | "left" | "right") => void;
  dragToCell: (row: number, col: number) => void;
  goToPrevWord: () => void;
  goToNextWord: () => void;
  useClue2: (wordIndex: number) => void;
  useClue3: (wordIndex: number) => void;
  revealLetter: (wordIndex: number) => void;
  revealWord: (wordIndex: number) => void;
  markWordSolved: (wordIndex: number) => void;
  setTotalXp: (totalXp: number) => void;
  dismissResult: () => void;
  resumeProgress: (progress: BoardProgressState) => void;
  reset: () => void;
  resetBoard: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  board: null,
  aiWords: null,
  aiMode: false,
  loading: false,
  selectedCell: null,
  selectedWordIndex: null,
  inputOrientation: null,
  filledLetters: {},
  hints: {},
  currentXp: 0,
  wordsSolved: 0,
  totalXp: 0,
  sessionStartTime: 0,
  boardResult: null,

  setBoard: (board: Board) => {
    set({ board, loading: false, sessionStartTime: Date.now(), ...(getInitialFocus(board) ?? {}) });
  },

  // setAiWords HANYA mengisi kata soal — tidak menyentuh aiMode. Mode AI
  // di-set eksplisit lewat setAiMode(true) di MainMenu saat mulai Main Mode
  // AI, dan di-clear otomatis oleh reset(). Dengan begitu pembersihan kata
  // AI di GameScreen (setAiWords(null) setelah board terbentuk) tidak
  // membalik aiMode jadi false di tengah papan AI.
  setAiWords: (aiWords) => set({ aiWords }),

  setAiMode: (aiMode) => set({ aiMode }),

  resumeProgress: (progress: BoardProgressState) => {
    set({
      board: progress.board,
      loading: false,
      // Papan yang di-resume ikut membawa status mode AI-nya (progres board
      // AI yang disimpan otomatis tidak berubah jadi mode XP normal).
      aiMode: progress.aiMode ?? false,
      selectedCell: null,
      selectedWordIndex: null,
      inputOrientation: null,
      filledLetters: progress.filledLetters,
      hints: progress.hints,
      currentXp: progress.currentXp,
      wordsSolved: progress.wordsSolved,
      totalXp: progress.totalXp,
      sessionStartTime: Date.now(),
      boardResult: null,
      ...(getInitialFocus(progress.board) ?? {}),
    });
    loggerInfo("Board di-resume dari progres tersimpan");
  },

  selectCell: (row: number, col: number) => {
    const { board } = get();
    if (!board) return;

    const cell = board.grid[row]?.[col];
    if (!cell || cell.isBlocked) return;

    const state = get();
    const wordsAtCell = getWordsAtCell(board, row, col);
    if (wordsAtCell.length === 0) return;

    // Pilih kata idx di cell ini. Kalau cell-nya terkunci (hurufnya sudah
    // terkunci dari kata lain yang solved) DAN kata itu BELUM solved, langsung
    // fokus ke cell pertama yang masih bisa diketik di kata itu. Kalau kata
    // sudah solved, fokus tetap di sel yang di-tap — kata solved hanya bisa
    // di-select/dilihat clue-nya, tidak bisa diedit.
    const focusWord = (idx: number) => {
      const word = board.words[idx];
      if (cell.isLocked && !word.solved) {
        const firstUnlocked = word.cells.find((c) => !c.isLocked);
        if (firstUnlocked) {
          set({
            selectedCell: { row: firstUnlocked.row, col: firstUnlocked.col },
            selectedWordIndex: idx,
            inputOrientation: word.orientation,
          });
          return;
        }
      }
      set({
        selectedCell: { row, col },
        selectedWordIndex: idx,
        inputOrientation: word.orientation,
      });
    };

    if (state.selectedCell?.row === row && state.selectedCell?.col === col) {
      // Cell yang sama di-tap lagi — pindah ke kata lain di cell ini. Prioritas
      // kata yang masih bisa dimainkan; kalau semuanya sudah selesai tetap bisa
      // pindah, supaya kata yang sudah terjawab bisa dipilih untuk dilihat.
      const otherIdx =
        wordsAtCell.find(
          (idx) => idx !== state.selectedWordIndex && isWordPlayable(board.words[idx]),
        ) ?? wordsAtCell.find((idx) => idx !== state.selectedWordIndex);
      if (otherIdx !== undefined) focusWord(otherIdx);
      return;
    }

    // Cell persimpangan (dilewati 2 kata yang masih bisa dimainkan): tap
    // SEKALI langsung mengganti orientasi. Kalau kata yang sedang aktif juga
    // melewati cell ini, pindah ke kata satunya (mendatar ↔ menurun) — jadi
    // user tidak perlu mengetuk dua kali untuk berpindah arah.
    const playableAtCell = wordsAtCell.filter((idx) => isWordPlayable(board.words[idx]));
    if (
      playableAtCell.length > 1 &&
      state.selectedWordIndex != null &&
      playableAtCell.includes(state.selectedWordIndex)
    ) {
      const otherIdx = playableAtCell.find((idx) => idx !== state.selectedWordIndex);
      if (otherIdx !== undefined) {
        focusWord(otherIdx);
        return;
      }
    }

    // Cell baru — pilih kata yang melewati cell ini. Lanjutkan kata yang
    // sedang aktif kalau masih melewati cell ini; kalau tidak, prioritaskan
    // mendatar, lalu kata playable pertama.
    const activeIdx = state.selectedWordIndex;
    let targetIdx: number | undefined;
    // Sel yang terkunci milik kata yang SUDAH SOLVED → pilih kata solved itu
    // (biar clue-nya bisa dilihat) dan fokus tetap di sel yang di-tap. Tidak
    // melompat ke kata persilangan yang masih bisa diketik — kata solved hanya
    // bisa di-select/fokus, bukan diedit.
    const solvedAtCell = wordsAtCell.filter((idx) => board.words[idx].solved);
    if (cell.isLocked && solvedAtCell.length > 0) {
      targetIdx = solvedAtCell[0];
    } else if (activeIdx != null && wordsAtCell.includes(activeIdx) && isWordPlayable(board.words[activeIdx])) {
      targetIdx = activeIdx;
    } else {
      targetIdx =
        wordsAtCell.find(
          (idx) => board.words[idx].orientation === "horizontal" && isWordPlayable(board.words[idx]),
        ) ??
        wordsAtCell.find((idx) => isWordPlayable(board.words[idx])) ??
        // Semua kata di cell ini sudah selesai — tetap bisa dipilih untuk melihat clue-nya.
        wordsAtCell[0];
    }
    if (targetIdx === undefined) return; // semua kata di cell ini sudah selesai

    focusWord(targetIdx);
  },

  dismissResult: () => set({ boardResult: null }),

  toggleOrientation: () => {
    const { board, selectedCell, selectedWordIndex } = get();
    if (!board || !selectedCell) return;

    const wordsAtCell = getWordsAtCell(board, selectedCell.row, selectedCell.col);
    const otherIdx = wordsAtCell.find((idx) => idx !== selectedWordIndex);
    if (otherIdx === undefined) return;

    const otherWord = board.words[otherIdx];
    set({
      selectedWordIndex: otherIdx,
      inputOrientation: otherWord.orientation,
    });
  },

  inputLetter: (letter: string) => {
    const { board, selectedCell, inputOrientation, filledLetters, selectedWordIndex } = get();
    if (!board || !selectedCell || !inputOrientation) return;

    const key = `${selectedCell.row},${selectedCell.col}`;
    const cell = board.grid[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.isBlocked || cell.isLocked) return;

    const newLetters = { ...filledLetters, [key]: letter.toUpperCase() };
    set({ filledLetters: newLetters });

    // Try to advance within the current word / detect completion
    if (selectedWordIndex != null && board.words[selectedWordIndex]) {
      const word = board.words[selectedWordIndex];
      const currentIdx = word.cells.findIndex(
        (c) => c.row === selectedCell.row && c.col === selectedCell.col,
      );

      if (currentIdx === -1) return;

      // Find the next UNLOCKED cell in this word
      let nextUnlockedIdx = -1;
      for (let j = currentIdx + 1; j < word.cells.length; j++) {
        if (!word.cells[j].isLocked) {
          nextUnlockedIdx = j;
          break;
        }
      }

      if (nextUnlockedIdx !== -1) {
        // There's a next unlocked cell → advance to it
        const nextCell = word.cells[nextUnlockedIdx];
        set({ selectedCell: { row: nextCell.row, col: nextCell.col } });
      } else {
        // Reached the end — check if word is effectively complete
        // (all cells either filled by user or locked from another solved word)
        const effectivelyComplete = word.cells.every(
          (c) => newLetters[`${c.row},${c.col}`] || c.isLocked,
        );

        if (effectivelyComplete) {
          // Only lock cells if the answer is CORRECT
          const result = validateWord(word, selectedWordIndex, newLetters);
          if (result.isCorrect) {
            get().markWordSolved(selectedWordIndex);
          }

          // Auto-advance to next unsolved word (by clue number order)
          const nextWord = findNextUnsolvedWord(board, selectedWordIndex, newLetters);
          if (nextWord) {
            // Find the first unlocked cell in the next word
            const firstUnlocked = nextWord.cells.find((c) => !c.isLocked);
            if (firstUnlocked) {
              set({
                selectedCell: { row: firstUnlocked.row, col: firstUnlocked.col },
                selectedWordIndex: board.words.indexOf(nextWord),
                inputOrientation: nextWord.orientation,
              });
            }
          }
        }
      }
    }
  },

  deleteLetter: () => {
    const { board, selectedCell, inputOrientation, filledLetters } = get();
    if (!board || !selectedCell) return;

    const key = `${selectedCell.row},${selectedCell.col}`;
    const cell = board.grid[selectedCell.row]?.[selectedCell.col];
    const isLockedCell = cell?.isLocked ?? false;

    if (!isLockedCell && filledLetters[key]) {
      const newLetters = { ...filledLetters };
      delete newLetters[key];
      set({ filledLetters: newLetters });
    } else {
      // Find previous UNLOCKED cell in the current word
      const { selectedWordIndex } = get();
      if (selectedWordIndex != null && board.words[selectedWordIndex]) {
        const word = board.words[selectedWordIndex];
        const currentIdx = word.cells.findIndex(
          (c) => c.row === selectedCell.row && c.col === selectedCell.col,
        );
        if (currentIdx > 0) {
          let prevUnlockedIdx = -1;
          for (let j = currentIdx - 1; j >= 0; j--) {
            if (!word.cells[j].isLocked) {
              prevUnlockedIdx = j;
              break;
            }
          }
          if (prevUnlockedIdx !== -1) {
            const prevCell = word.cells[prevUnlockedIdx];
            const prevKey = `${prevCell.row},${prevCell.col}`;
            const newLetters = { ...filledLetters };
            delete newLetters[prevKey];
            set({ filledLetters: newLetters, selectedCell: { row: prevCell.row, col: prevCell.col } });
          }
        }
      }
    }
  },

  goToPrevWord: () => {
    const { board, selectedWordIndex } = get();
    if (!board) return;
    const sortedIndices = getSortedWordIndices(board);
    const currentPos = sortedIndices.indexOf(selectedWordIndex ?? -1);
    for (let offset = sortedIndices.length - 1; offset > 0; offset--) {
      const idx = sortedIndices[(currentPos + offset) % sortedIndices.length];
      const word = board.words[idx];
      // Kata yang sudah selesai (solved) dilewati; kata yang masih terisi penuh
      // tapi BELUM benar TETAP bisa difokus — supaya pemain bisa kembali ke
      // kata yang keliru lewat tombol navigasi soal di panel soal.
      if (word.solved) continue;
      const firstUnlocked = word.cells.find((c) => !c.isLocked);
      if (firstUnlocked) {
        set({
          selectedCell: { row: firstUnlocked.row, col: firstUnlocked.col },
          selectedWordIndex: idx,
          inputOrientation: word.orientation,
        });
        return;
      }
    }
  },

  goToNextWord: () => {
    const { board, selectedWordIndex } = get();
    if (!board) return;
    const sortedIndices = getSortedWordIndices(board);
    const currentPos = sortedIndices.indexOf(selectedWordIndex ?? -1);
    for (let offset = 1; offset < sortedIndices.length; offset++) {
      const idx = sortedIndices[(currentPos + offset) % sortedIndices.length];
      const word = board.words[idx];
      // Lihat catatan di goToPrevWord: kata terisi penuh tapi belum benar tetap
      // bisa difokus lewat navigasi soal.
      if (word.solved) continue;
      const firstUnlocked = word.cells.find((c) => !c.isLocked);
      if (firstUnlocked) {
        set({
          selectedCell: { row: firstUnlocked.row, col: firstUnlocked.col },
          selectedWordIndex: idx,
          inputOrientation: word.orientation,
        });
        return;
      }
    }
  },

  navigateToCell: (direction: "up" | "down" | "left" | "right") => {
    const { board, selectedCell } = get();
    if (!board || !selectedCell) return;

    const dr = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    const dc = direction === "left" ? -1 : direction === "right" ? 1 : 0;

    // Cari sel berikutnya yang MASIH BISA DIKETIK di arah itu. Sel terkunci
    // (isLocked — mis. dari reveal atau kata solved yang menyilang) dan sel
    // blocked dilewati, jadi tombol panah (virtual maupun keyboard fisik)
    // tidak "menyangkut" saat ada sel terkunci di tengah kata.
    let r = selectedCell.row + dr;
    let c = selectedCell.col + dc;
    let target: { row: number; col: number } | null = null;
    while (r >= 0 && r < board.size && c >= 0 && c < board.size) {
      const cell = board.grid[r]?.[c];
      if (cell && !cell.isBlocked && !cell.isLocked) {
        target = { row: r, col: c };
        break;
      }
      r += dr;
      c += dc;
    }
    if (!target) return;

    const targetIdx = pickWordIndexAtCell(
      board,
      target.row,
      target.col,
      get().selectedWordIndex,
      get().inputOrientation,
    );
    if (targetIdx === null) return;
    const targetWord = board.words[targetIdx];
    set({
      selectedCell: target,
      selectedWordIndex: targetIdx,
      inputOrientation: targetWord.orientation,
    });
  },

  // Drag/swipe di papan: kursor mengikuti jari. Semantik "cell baru" biasa
  // (tanpa toggle kata saat sel yang sama di-tap ulang) — kata aktif tetap
  // dipilih selama melewati cell tujuan.
  dragToCell: (row: number, col: number) => {
    const { board } = get();
    if (!board) return;
    const cell = board.grid[row]?.[col];
    if (!cell || cell.isBlocked || cell.isLocked) return;

    const targetIdx = pickWordIndexAtCell(
      board,
      row,
      col,
      get().selectedWordIndex,
      get().inputOrientation,
    );
    if (targetIdx === null) return;
    const targetWord = board.words[targetIdx];
    set({
      selectedCell: { row, col },
      selectedWordIndex: targetIdx,
      inputOrientation: targetWord.orientation,
    });
  },

  markWordSolved: (wordIndex: number) => {
    const { board } = get();
    if (!board) return;
    const word = board.words[wordIndex];
    if (!word || word.solved) return;

    word.solved = true;
    // Lock all cells in this word so they can't be edited
    for (const cell of word.cells) {
      cell.isLocked = true;
    }
    // Kata yang SEMUA hurufnya dibuka lewat reveal (hint) tetap dianggap solved
    // (supaya papan bisa selesai — tidak stuck di 100%) tapi tidak dapat XP.
    const hint = get().hints[String(wordIndex)];
    const fullyRevealed =
      !!hint?.revealedCells?.length &&
      word.cells.every((c) => hint.revealedCells.includes(`${c.row},${c.col}`));
    // Mode AI: tidak ada kalkulasi XP sama sekali (tambah maupun kurangi).
    const xpGain = get().aiMode ? 0 : fullyRevealed ? 0 : calcXpGain(word.word.length, board.tierLevel);
    const newWordsSolved = get().wordsSolved + 1;
    const newCurrentXp = get().aiMode ? 0 : get().currentXp + xpGain;

    // Catatan: totalXp TIDAK ikut ditambah di sini. totalXp adalah XP kumulatif
    // lintas papan — di-update sekali saja saat board selesai (GameScreen) atau
    // saat session login (RootNavigator). Kalau ikut ditambah tiap kata, XP saat
    // reset/quit menjadi membengkak (tidak pernah balik ke nilai awal).
    loggerInfo(`Word solved: ${word.word} (+${xpGain} XP)`);

    set({
      wordsSolved: newWordsSolved,
      currentXp: newCurrentXp,
    });

    // Check if board is now complete
    const completed = board.words.every((w) => w.solved);
    if (completed) {
      const previousTier = board.tierLevel;
      const newTier = calcTier(get().totalXp + newCurrentXp);
      const timeElapsed = Date.now() - get().sessionStartTime;

      loggerInfo(`Board completed! Tier: ${previousTier} → ${newTier}`);

      set({
        boardResult: {
          totalWords: board.words.length,
          wordsSolved: newWordsSolved,
          xpGained: newCurrentXp,
          previousTier,
          newTier,
          // Mode AI: tier tidak pernah berubah (tidak ada XP yang dihitung).
          tierChanged: !get().aiMode && previousTier !== newTier,
          timeElapsed,
        },
      });
    }
  },

  useClue2: (wordIndex: number) => {
    const { hints, currentXp, aiMode } = get();
    const alreadyUsed = hints[wordIndex]?.clue2Used ?? false;
    set({
      // Catatan: revealedCells TIDAK di-reset — kalau di-reset, aturan
      // "kata yang full-revealed tidak dapat XP" (cek di GameScreen) bisa
      // ter-bypass hanya dengan membuka clue.
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue2Used: true } },
      // XP hanya dipotong saat clue pertama kali dibuka — buka berikutnya gratis.
      // Mode AI: tidak ada pengurangan XP.
      currentXp: aiMode ? currentXp : alreadyUsed ? currentXp : currentXp - XP_PENALTY_CLUE_2,
    });
  },

  useClue3: (wordIndex: number) => {
    const { hints, currentXp, aiMode } = get();
    const alreadyUsed = hints[wordIndex]?.clue3Used ?? false;
    set({
      // revealedCells tidak di-reset (lihat komentar di useClue2).
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue3Used: true } },
      // XP hanya dipotong saat clue pertama kali dibuka — buka berikutnya gratis.
      // Mode AI: tidak ada pengurangan XP.
      currentXp: aiMode ? currentXp : alreadyUsed ? currentXp : currentXp - XP_PENALTY_CLUE_3,
    });
  },

  revealLetter: (wordIndex: number) => {
    const { board, filledLetters, hints, aiMode } = get();
    if (!board || !board.words[wordIndex]) return;

    const word = board.words[wordIndex];
    const unrevealed = word.cells.filter(
      (c) => !filledLetters[`${c.row},${c.col}`] && !c.isLocked,
    );
    if (unrevealed.length === 0) return;

    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const key = `${target.row},${target.col}`;
    const offset = word.orientation === "vertical" ? target.row - word.startRow : target.col - word.startCol;
    const letter = word.word[offset];

    // Lock the revealed cell so user can't edit it (per PRD §4.3)
    target.isLocked = true;

    set({
      filledLetters: { ...filledLetters, [key]: letter },
      // Mode AI: reveal gratis (tidak ada pengurangan XP).
      currentXp: aiMode ? get().currentXp : get().currentXp - XP_PENALTY_REVEAL,
      hints: {
        ...hints,
        [wordIndex]: {
          ...hints[wordIndex],
          revealedCells: [...(hints[wordIndex]?.revealedCells ?? []), key],
        },
      },
    });
  },

  revealWord: (wordIndex: number) => {
    const { board, filledLetters, hints, aiMode } = get();
    if (!board || !board.words[wordIndex]) return;

    const word = board.words[wordIndex];
    const newLetters = { ...filledLetters };
    const newRevealed: string[] = [];

    for (const cell of word.cells) {
      const key = `${cell.row},${cell.col}`;
      if (!newLetters[key] && !cell.isLocked) {
        const offset = word.orientation === "vertical" ? cell.row - word.startRow : cell.col - word.startCol;
        newLetters[key] = word.word[offset];
        newRevealed.push(key);
        // Lock the revealed cell so user can't edit it (per PRD §4.3)
        cell.isLocked = true;
      }
    }

    set({
      filledLetters: newLetters,
      // Mode AI: reveal gratis (tidak ada pengurangan XP).
      currentXp: aiMode ? get().currentXp : get().currentXp - XP_PENALTY_REVEAL,
      hints: {
        ...hints,
        [wordIndex]: {
          ...hints[wordIndex],
          revealedCells: [...(hints[wordIndex]?.revealedCells ?? []), ...newRevealed],
        },
      },
    });
  },

  setTotalXp: (totalXp: number) => set({ totalXp }),

  reset: () =>
    set((state) => ({
      board: null,
      aiWords: null,
      aiMode: false,
      loading: false,
      selectedCell: null,
      selectedWordIndex: null,
      inputOrientation: null,
      filledLetters: {},
      hints: {},
      currentXp: 0,
      wordsSolved: 0,
      sessionStartTime: 0,
      boardResult: null,
      // totalXp sengaja dipertahankan — itu XP kumulatif pemain lintas papan.
      totalXp: state.totalXp,
    })),

  resetBoard: () => {
    const { board } = get();
    if (!board) return;
    // Unlock all cells and clear filled letters
    for (const word of board.words) {
      word.solved = false;
      for (const cell of word.cells) {
        cell.isLocked = false;
      }
    }
    set({
      filledLetters: {},
      hints: {},
      currentXp: 0,
      wordsSolved: 0,
    });
  },
}));

/** Kata yang masih bisa dimainkan (belum solved dan masih ada cell kosong). */
function isWordPlayable(word: BoardWord): boolean {
  return !word.solved && word.cells.some((c) => !c.isLocked);
}

/**
 * Pilih index kata yang di-fokus saat kursor diarahkan ke (row, col):
 * lanjutkan kata yang sedang aktif kalau masih melewati cell itu; kalau tidak,
 * kata dengan orientasi yang sama dengan input saat ini; fallback kata pertama
 * yang tersedia di cell. Dipakai oleh navigasi panah & drag.
 */
function pickWordIndexAtCell(
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
function getWordsAtCell(board: Board, row: number, col: number): number[] {
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
function getInitialFocus(board: Board): Partial<GameState> | null {
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

function getSortedWordIndices(board: Board): number[] {
  const wordNumbers = board.words.map((w) => w.cells[0]?.number ?? 999);
  return board.words
    .map((_, i) => i)
    .sort((a, b) => (wordNumbers[a] ?? 999) - (wordNumbers[b] ?? 999));
}

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

function findNextUnsolvedWord(
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
