import { create } from "zustand";
import type { Board, Orientation } from "../../domain/entities/board";
import { calcXpGain, calcTier, XP_PENALTY_CLUE_2, XP_PENALTY_CLUE_3, XP_PENALTY_REVEAL, TIER_NAMES } from "../../domain/usecases/xpEngine";
import { validateWord } from "../../domain/usecases/wordValidator";
import { loggerInfo } from "../../utils/logger";
import type { BoardProgressState } from "../../utils/boardProgress";
// Helper murni navigasi & pemilihan kata papan — dipisah ke file sendiri
// supaya store tetap ramping dan logika papan mudah diuji.
import {
  isWordPlayable,
  pickWordIndexAtCell,
  getWordsAtCell,
  getInitialFocus,
  getSortedWordIndices,
  findNextUnsolvedWord,
} from "./gameBoardHelpers";

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

export interface GameState {
  board: Board | null;
  loading: boolean;
  selectedCell: { row: number; col: number } | null;
  selectedWordIndex: number | null;
  inputOrientation: Orientation | null;
  filledLetters: Record<string, string>;
  hints: Record<string, HintUsage>;
  /** Pemicu animasi zoom-out per sel yang baru di-reveal/diganti (key sel →
   *  counter). State transien UI — TIDAK di-persist. Setiap kali reveal
   *  mengisi/mengganti huruf di sebuah sel, counter-nya naik; CrosswordGrid
   *  memakai nilai ini untuk memainkan animasi supaya pemain melihat
   *  jawaban lama diganti jawaban baru. */
  revealedPulse: Record<string, number>;
  currentXp: number;
  wordsSolved: number;
  totalXp: number; // cumulative XP across games
  /** True saat profil cloud selesai disinkronkan ke store (RootNavigator).
   *  Dipakai notifikasi tier: jangan bandingkan tier sebelum data XP sejati
   *  dimuat — kalau tidak, toast "Naik ke Tier" palsu muncul saat app dibuka
   *  (totalXp 0 → XP profil). */
  profileReady: boolean;
  sessionStartTime: number;
  boardResult: BoardResult | null;

  setBoard: (board: Board) => void;
  /** Kata soal dari AI (Main Mode AI) — dipakai sekali oleh GameScreen, lalu dibersihkan. */
  aiWords: Array<{ word: string; clue_1: string; clue_2?: string }> | null;
  setAiWords: (words: Array<{ word: string; clue_1: string; clue_2?: string }> | null) => void;
  /** True saat papan berasal dari Main Mode AI — XP sama sekali tidak dihitung. */
  aiMode: boolean;
  setAiMode: (aiMode: boolean) => void;
  /** PLAN-107: papan NON-normal/non-boss (komunitas, buat soal sendiri) —
   *  TIDAK mengakumulasi XP sama sekali, seperti aiMode. */
  noXpMode: boolean;
  setNoXpMode: (noXpMode: boolean) => void;
  /** True saat papan berasal dari Tantangan Harian (PLAN-097) — selesai board
   *  mencatat streak harian. Di-clear oleh reset() seperti aiMode. */
  dailyMode: boolean;
  setDailyMode: (dailyMode: boolean) => void;
  /** True saat papan adalah LEVEL BOSS (PLAN-099) — ada batas waktu & bonus XP.
   *  Di-clear oleh reset() seperti mode lainnya. */
  bossMode: boolean;
  setBossMode: (bossMode: boolean) => void;
  setProfileReady: (ready: boolean) => void;
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
  noXpMode: false,
  dailyMode: false,
  bossMode: false,
  loading: false,
  selectedCell: null,
  selectedWordIndex: null,
  inputOrientation: null,
  filledLetters: {},
  hints: {},
  revealedPulse: {},
  currentXp: 0,
  wordsSolved: 0,
  totalXp: 0,
  profileReady: false,
  sessionStartTime: 0,
  boardResult: null,

  setBoard: (board: Board) => {
    set({ board, loading: false, sessionStartTime: Date.now(), ...(getInitialFocus(board) ?? {}) });
  },

  setProfileReady: (profileReady) => set({ profileReady }),

  // setAiWords HANYA mengisi kata soal — tidak menyentuh aiMode. Mode AI
  // di-set eksplisit lewat setAiMode(true) di MainMenu saat mulai Main Mode
  // AI, dan di-clear otomatis oleh reset(). Dengan begitu pembersihan kata
  // AI di GameScreen (setAiWords(null) setelah board terbentuk) tidak
  // membalik aiMode jadi false di tengah papan AI.
  setAiWords: (aiWords) => set({ aiWords }),

  setAiMode: (aiMode) => set({ aiMode }),

  setNoXpMode: (noXpMode) => set({ noXpMode }),

  setDailyMode: (dailyMode) => set({ dailyMode }),

  setBossMode: (bossMode) => set({ bossMode }),

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
      // Pulse animasi bersifat transien (tidak ikut disimpan) — sel yang
      // di-reveal di sesi sebelumnya tidak perlu dianimasikan ulang.
      revealedPulse: {},
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
    // Mode AI & mode non-XP (PLAN-107: papan komunitas/buat soal sendiri):
    // tidak ada kalkulasi XP sama sekali (tambah maupun kurangi).
    const noXp = get().aiMode || get().noXpMode;
    const xpGain = noXp ? 0 : fullyRevealed ? 0 : calcXpGain(word.word.length, board.tierLevel);
    const newWordsSolved = get().wordsSolved + 1;
    const newCurrentXp = noXp ? 0 : get().currentXp + xpGain;

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
          // XP neto sesi BISA negatif: penalti clue/reveal adalah penalti nyata
          // yang mengurangi total XP akun saat papan selesai (di-clamp ≥ 0 di
          // GameScreen). Overlay menampilkan "−N XP" untuk neto negatif, dan
          // tier bisa turun (dialog "murung" muncul di main menu).
          xpGained: newCurrentXp,
          previousTier,
          newTier,
          // Mode AI: tier tidak pernah berubah (tidak ada XP yang dihitung).
          tierChanged: !(get().aiMode || get().noXpMode) && previousTier !== newTier,
          timeElapsed,
        },
      });
    }
  },

  useClue2: (wordIndex: number) => {
    const { hints, currentXp, aiMode, noXpMode } = get();
    const xpBlocked = aiMode || noXpMode;
    const alreadyUsed = hints[wordIndex]?.clue2Used ?? false;
    set({
      // Catatan: revealedCells TIDAK di-reset — kalau di-reset, aturan
      // "kata yang full-revealed tidak dapat XP" (cek di GameScreen) bisa
      // ter-bypass hanya dengan membuka clue.
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue2Used: true } },
      // XP hanya dipotong saat clue pertama kali dibuka — buka berikutnya gratis.
      // Mode AI: tidak ada pengurangan XP.
      // XP hanya dipotong saat clue pertama kali dibuka — buka berikutnya gratis.
      // currentXp boleh negatif: penalti adalah PENALTI NYATA — neto sesi
      // (bisa minus) dipakai menghitung XP akun saat papan selesai, sehingga
      // pemakaian clue/reveal benar-benar mengurangi XP (dan bisa menurunkan
      // tier). Kalau di-clamp di sini, penalti jadi tidak terlihat sama sekali.
      currentXp: xpBlocked ? currentXp : alreadyUsed ? currentXp : currentXp - XP_PENALTY_CLUE_2,
    });
  },

  useClue3: (wordIndex: number) => {
    const { hints, currentXp, aiMode, noXpMode } = get();
    const xpBlocked = aiMode || noXpMode;
    const alreadyUsed = hints[wordIndex]?.clue3Used ?? false;
    set({
      // revealedCells tidak di-reset (lihat komentar di useClue2).
      hints: { ...hints, [wordIndex]: { ...hints[wordIndex], clue3Used: true } },
      // XP hanya dipotong saat clue pertama kali dibuka — buka berikutnya gratis.
      // Mode AI: tidak ada pengurangan XP.
      currentXp: xpBlocked ? currentXp : alreadyUsed ? currentXp : currentXp - XP_PENALTY_CLUE_3,
    });
  },

  revealLetter: (wordIndex: number) => {
    const { board, filledLetters, hints, aiMode, noXpMode } = get();
    const xpBlocked = aiMode || noXpMode;
    if (!board || !board.words[wordIndex]) return;

    const word = board.words[wordIndex];
    // Sel yang PERLU diisi/diganti: belum terkunci DAN belum memuat huruf yang
    // benar. Sel kosong → diisi; sel berisi huruf SALAH → diganti dengan huruf
    // yang benar (sebelumnya reveal cuma mengisi sel kosong, jadi saat semua
    // sel sudah terisi tidak ada yang berubah padahal XP tetap dipotong).
    const needsReplace = word.cells.filter((c) => {
      if (c.isLocked) return false;
      const offset =
        word.orientation === "vertical" ? c.row - word.startRow : c.col - word.startCol;
      const correct = word.word[offset]?.toUpperCase();
      return filledLetters[`${c.row},${c.col}`]?.toUpperCase() !== correct;
    });
    // Tidak ada satu pun sel yang perlu diganti (semua huruf sudah benar /
    // terkunci) → reveal tidak melakukan apa-apa, JANGAN potong XP.
    if (needsReplace.length === 0) return;

    const target = needsReplace[Math.floor(Math.random() * needsReplace.length)];
    const key = `${target.row},${target.col}`;
    const offset =
      word.orientation === "vertical" ? target.row - word.startRow : target.col - word.startCol;
    const letter = word.word[offset];

    // Lock the revealed cell so user can't edit it (per PRD §4.3)
    target.isLocked = true;

    set({
      filledLetters: { ...filledLetters, [key]: letter },
      // Mode AI: reveal gratis (tidak ada pengurangan XP).
      currentXp: xpBlocked ? get().currentXp : get().currentXp - XP_PENALTY_REVEAL,
      hints: {
        ...hints,
        [wordIndex]: {
          ...hints[wordIndex],
          revealedCells: [...(hints[wordIndex]?.revealedCells ?? []), key],
        },
      },
      // Naikkan counter animasi sel ini supaya hurufnya "zoom out" di grid.
      revealedPulse: {
        ...get().revealedPulse,
        [key]: (get().revealedPulse[key] ?? 0) + 1,
      },
    });
  },

  revealWord: (wordIndex: number) => {
    const { board, filledLetters, hints, aiMode, noXpMode } = get();
    const xpBlocked = aiMode || noXpMode;
    if (!board || !board.words[wordIndex]) return;

    const word = board.words[wordIndex];
    const newLetters = { ...filledLetters };
    const newRevealed: string[] = [];
    const pulse = { ...get().revealedPulse };

    for (const cell of word.cells) {
      if (cell.isLocked) continue;
      const key = `${cell.row},${cell.col}`;
      const offset =
        word.orientation === "vertical" ? cell.row - word.startRow : cell.col - word.startCol;
      const correct = word.word[offset]?.toUpperCase();
      // Sel yang sudah berisi huruf BENAR tidak perlu diubah — lewati.
      if (newLetters[key]?.toUpperCase() === correct) continue;
      // Isi sel kosong ATAU ganti huruf yang salah dengan huruf yang benar.
      newLetters[key] = word.word[offset];
      newRevealed.push(key);
      // Lock the revealed cell so user can't edit it (per PRD §4.3)
      cell.isLocked = true;
      // Counter animasi zoom-out untuk sel yang hurufnya berubah.
      pulse[key] = (pulse[key] ?? 0) + 1;
    }

    // Tidak ada sel yang diganti (semua sudah benar / terkunci) → reveal
    // batal total, XP TIDAK dipotong.
    if (newRevealed.length === 0) return;

    set({
      filledLetters: newLetters,
      // Mode AI: reveal gratis (tidak ada pengurangan XP).
      currentXp: xpBlocked ? get().currentXp : get().currentXp - XP_PENALTY_REVEAL,
      hints: {
        ...hints,
        [wordIndex]: {
          ...hints[wordIndex],
          revealedCells: [...(hints[wordIndex]?.revealedCells ?? []), ...newRevealed],
        },
      },
      revealedPulse: pulse,
    });
  },

  setTotalXp: (totalXp: number) => set({ totalXp }),

  reset: () =>
    set((state) => ({
      board: null,
      aiWords: null,
      aiMode: false,
      noXpMode: false,
      dailyMode: false,
      bossMode: false,
      loading: false,
      selectedCell: null,
      selectedWordIndex: null,
      inputOrientation: null,
      filledLetters: {},
      hints: {},
      revealedPulse: {},
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
      revealedPulse: {},
      currentXp: 0,
      wordsSolved: 0,
    });
  },
}));

