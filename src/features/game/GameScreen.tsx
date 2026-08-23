import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Modal, PanResponder, AppState, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import GameTopBar from "../../presentation/components/game/GameTopBar";
import CluePill from "../../presentation/components/game/CluePill";
import GameActionBar, {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from "../../presentation/components/game/GameActionBar";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { selectWordPool } from "../../domain/usecases/wordPoolFilter";
import { supabase } from "../../data/sources/supabase";
import { displayNameFromMetadata } from "../../utils/userMetadata";
import { boardRepository } from "../../data/repositories/boardRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { userRepository } from "../../data/repositories/userRepository";
import { isWordComplete, validateWord } from "../../domain/usecases/wordValidator";
import {
  calcTier,
  shouldUnlockAllTiers,
  XP_PENALTY_CLUE_2,
  XP_PENALTY_CLUE_3,
  XP_PENALTY_REVEAL,
} from "../../domain/usecases/xpEngine";
import type { Board, BoardWord, WordCandidate } from "../../domain/entities/board";
import { loggerInfo, loggerWarn } from "../../utils/logger";
import {
  serializeBoardProgress,
  deserializeBoardProgress,
  IN_PROGRESS_BOARD_ID,
} from "../../utils/boardProgress";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import { play, ensureAmbientPlaying } from "../../utils/sound";
import { buttonShadow, textOnPrimary } from "../../utils/skin";
import { playLetterPressFeedback, playDeleteFeedback } from "../../utils/soundFeedback";

const CELL_GAP = 3;
const GRID_PADDING = 3;
// Minimal jumlah soal (kata) per papan & rentang ukuran grid fleksibel.
// Grid mulai dari 10×10 dan naik bertahap sampai minimal 10 kata tertampung.
const MIN_WORDS = 10;
const MIN_GRID_SIZE = 10;
const MAX_GRID_SIZE = 14;
// Mode AI lebih toleran: provider AI kadang mengembalikan < 10 kata valid
// (validasi keras di requestAiWords menyaring banyak kata). Papan AI minimal
// 6 kata masih layak dimainkan — lebih baik daripada mode AI batal total.
const AI_MIN_WORDS = 6;

export default function GameScreen() {
  const { theme, isDark, setThemeMode, boardColors, boardBackground } = useTheme();
  const navigation = useNavigation();
  // Safe-area inset (status bar & navigation bar Android) — edge-to-edge wajib
  // di Android 15+, jadi konten game diberi padding inset supaya tidak tampak
  // "fullscreen" (masuk ke balik status bar / gesture bar) dan terlihat seperti
  // aplikasi umum. Web melaporkan insets 0, jadi tidak mengubah tampilan web.
  const insets = useSafeAreaInsets();
  // Lebar jendela — dipakai layout responsif panel aksi: di layar ponsel baris
  // kedua (Reset + Keyboard) bisa di-expand/collapse supaya tidak memakan banyak
  // layar; tablet/desktop tetap satu baris. Ambang 480px: semua HP (360–430px)
  // dapat 2 baris; tablet/desktop ≥ 480px satu baris.
  const { width: winW, height: winH } = useWindowDimensions();
  const compactBar = winW < 480;
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRevealLetterConfirm, setShowRevealLetterConfirm] = useState(false);
  const [showRevealWordConfirm, setShowRevealWordConfirm] = useState(false);
  const [showRevealClue2Confirm, setShowRevealClue2Confirm] = useState(false);
  const [showRevealClue3Confirm, setShowRevealClue3Confirm] = useState(false);
  // Level clue yang sedang ditampilkan di pill (1 = utama, 2 = penjelasan, 3 = sinonim/antonim).
  const [clueLevel, setClueLevel] = useState<1 | 2 | 3>(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardAutoShown = useRef(false);
  const pendingNavAction = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const prevZoomLevel = useRef(1);
  const [boardLoadError, setBoardLoadError] = useState(false);
  // Papan AI gagal disusun (soal dari provider tidak cukup) — pesan error
  // berbeda dari gagal muat papan normal (bukan soal koneksi).
  const [aiBoardFailed, setAiBoardFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const outerScrollRef = useRef<ScrollView>(null);
  const prevSelectedCell = useRef<{ row: number; col: number } | null>(null);
  const quittingRef = useRef(false);
  // Position of the grid inside the outer scroll content + outer viewport size,
  // used to keep the focused cell visible at zoom level 1.
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [outerViewportH, setOuterViewportH] = useState(0);

  const board = useGameStore((s) => s.board);
  const setBoard = useGameStore((s) => s.setBoard);
  const selectedCell = useGameStore((s) => s.selectedCell);
  const selectedWordIndex = useGameStore((s) => s.selectedWordIndex);
  const inputOrientation = useGameStore((s) => s.inputOrientation);
  const selectCell = useGameStore((s) => s.selectCell);
  const dragToCell = useGameStore((s) => s.dragToCell);
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputLetter = useGameStore((s) => s.inputLetter);
  const filledLetters = useGameStore((s) => s.filledLetters);
  const hints = useGameStore((s) => s.hints);
  const wordsSolved = useGameStore((s) => s.wordsSolved);
  const currentXp = useGameStore((s) => s.currentXp);
  const totalXp = useGameStore((s) => s.totalXp);
  const boardResult = useGameStore((s) => s.boardResult);
  const dismissResult = useGameStore((s) => s.dismissResult);
  const markWordSolved = useGameStore((s) => s.markWordSolved);
  const reset = useGameStore((s) => s.reset);
  const resetBoard = useGameStore((s) => s.resetBoard);
  const goToPrevWord = useGameStore((s) => s.goToPrevWord);
  const goToNextWord = useGameStore((s) => s.goToNextWord);
  const revealLetter = useGameStore((s) => s.revealLetter);
  const revealWord = useGameStore((s) => s.revealWord);
  const useClue2 = useGameStore((s) => s.useClue2);
  const useClue3 = useGameStore((s) => s.useClue3);
  const resumeProgress = useGameStore((s) => s.resumeProgress);
  const aiMode = useGameStore((s) => s.aiMode);
  const revealedPulse = useGameStore((s) => s.revealedPulse);

  // Show keyboard on first tap to a cell
  const handleCellPress = useCallback((row: number, col: number) => {
    selectCell(row, col);
    if (!keyboardAutoShown.current) {
      keyboardAutoShown.current = true;
      setKeyboardVisible(true);
    }
  }, [selectCell]);

  // Drag/swipe di papan: kursor mengikuti jari. Keyboard juga ikut muncul di
  // interaksi pertama (sama seperti tap).
  const handleCellDrag = useCallback(
    (row: number, col: number) => {
      dragToCell(row, col);
      if (!keyboardAutoShown.current) {
        keyboardAutoShown.current = true;
        setKeyboardVisible(true);
      }
    },
    [dragToCell],
  );

  // Swipe kiri/kanan pada pill clue untuk ganti kata (geser seperti carousel).
  const cluePillPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx < -30) goToNextWord();
          else if (gesture.dx > 30) goToPrevWord();
        },
      }),
    [goToNextWord, goToPrevWord],
  );

  // Fill progress: % of active (non-blocked) cells that have been filled
  const fillProgress = useMemo(() => {
    if (!board) return 0;
    let totalActive = 0;
    let filled = 0;
    for (const row of board.grid) {
      for (const cell of row) {
        if (cell.isBlocked) continue;
        totalActive++;
        const key = `${cell.row},${cell.col}`;
        if (filledLetters[key] || cell.isLocked) filled++;
      }
    }
    return totalActive > 0 ? filled / totalActive : 0;
  }, [board, filledLetters]);

  // Semua sel sudah terisi tapi masih ada kata yang belum benar — tampilkan
  // peringatan biar user tidak mengira halaman stuck (progress 100% tapi
  // papan belum selesai).
  const allFilledNotComplete = useMemo(() => {
    if (!board || boardResult) return false;
    return fillProgress >= 1 && !board.words.every((w) => w.solved);
  }, [board, boardResult, fillProgress]);

  // Keep the focused cell visible: scroll the inner (zoomed) grid at zoom > 1,
  // and the outer page ScrollView at zoom 1 so auto-focus never hides the cell.
  const scrollToFocusedCell = useCallback(() => {
    if (!selectedCell || !board) return;
    if (prevSelectedCell.current?.row === selectedCell.row && prevSelectedCell.current?.col === selectedCell.col) return;
    prevSelectedCell.current = selectedCell;

    const screenWidth = winW;
    const screenHeight = winH;
    const outerMargin = 8;
    const availableWidth = screenWidth - outerMargin;
    const gapsTotal = CELL_GAP * (board.size - 1);
    const borderTotal = 2;
    const paddingTotal = GRID_PADDING * 2;
    const fixedSpace = gapsTotal + borderTotal + paddingTotal;
    const baseCellSize = Math.floor((availableWidth - fixedSpace) / board.size);
    const cellSize = Math.floor(baseCellSize * zoomLevel);

    const cellCenterX = GRID_PADDING + selectedCell.col * (cellSize + CELL_GAP) + cellSize / 2;
    const cellCenterY = GRID_PADDING + selectedCell.row * (cellSize + CELL_GAP) + cellSize / 2;

    if (zoomLevel > 1 && scrollViewRef.current) {
      const gridSize = cellSize * board.size + CELL_GAP * (board.size - 1) + GRID_PADDING * 2;
      const scrollX = Math.max(0, Math.min(cellCenterX - screenWidth / 2, gridSize - screenWidth));
      const scrollY = Math.max(0, cellCenterY - 150);
      scrollViewRef.current.scrollTo({ x: scrollX, y: scrollY, animated: true });
      return;
    }

    // Zoom level 1: the outer vertical ScrollView owns scrolling. Bring the
    // focused cell into the middle of the visible area.
    if (!outerScrollRef.current) return;
    const cellYInContent = gridOffsetY + cellCenterY;
    const viewport = outerViewportH > 0 ? outerViewportH : screenHeight;
    const targetY = Math.max(0, cellYInContent - viewport / 2);
    const maxScroll = Math.max(0, gridOffsetY + cellSize * board.size + CELL_GAP * (board.size - 1) + GRID_PADDING * 2 - viewport);
    outerScrollRef.current.scrollTo({ y: Math.min(targetY, maxScroll), animated: true });
  }, [selectedCell, zoomLevel, board, gridOffsetY, outerViewportH, winW, winH]);

  useEffect(() => {
    if (zoomLevel > 1) {
      // Wait for the zoom spring to settle before scrolling.
      const timeout = setTimeout(scrollToFocusedCell, 150);
      return () => clearTimeout(timeout);
    }
    // Zoom 1: scroll immediately so auto-focused cells stay visible while typing.
    scrollToFocusedCell();
  }, [selectedCell, zoomLevel, scrollToFocusedCell]);

  // Backsound tema: saat masuk ke dalam game, pastikan suara latar diputar
  // (PLAN-028). Di web ini berada dalam konteks gestur user (ketukan tombol
  // "Mulai Bermain"), jadi browser lebih mungkin menyetujui autoplay — kalau
  // sebelumnya diblokir, langsung dicoba lagi.
  useEffect(() => {
    ensureAmbientPlaying();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateZoom = useCallback((newZoom: number) => {
    const oldZoom = prevZoomLevel.current;
    if (oldZoom === newZoom) return;
    
    const ratio = oldZoom / newZoom;
    zoomAnim.setValue(ratio);
    Animated.spring(zoomAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();
    
    prevZoomLevel.current = newZoom;
    setZoomLevel(newZoom);
  }, [zoomAnim]);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(ZOOM_MAX, prev + ZOOM_STEP);
      animateZoom(newZoom);
      return newZoom;
    });
  }, [animateZoom]);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(ZOOM_MIN, prev - ZOOM_STEP);
      animateZoom(newZoom);
      return newZoom;
    });
  }, [animateZoom]);

  const resetZoom = useCallback(() => {
    animateZoom(1);
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, [animateZoom]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (quittingRef.current) return;
      if (!board || boardResult) return;
      // Papan sudah selesai (semua kata solved) — hasilnya sudah tersimpan,
      // izinkan keluar tanpa dialog simpan progres.
      if (board.words.every((w) => w.solved)) return;
      e.preventDefault();
      pendingNavAction.current = e.data.action;
      setShowQuitConfirm(true);
    });
    return unsubscribe;
  }, [navigation, board, boardResult]);

  /**
   * Rekam SEMUA kata yang sudah terjawab benar (solved + punya word_id) di
   * board ini ke riwayat penemuan, lalu tunggu sampai tersimpan di Supabase.
   * Dedup ada di repository, jadi aman dipanggil berulang / saat kata sudah
   * tercatat. Ini backfill andal — dipakai saat board selesai, keluar game,
   * atau kembali ke menu, supaya "Sejarah Saya" tidak pernah kehilangan kata.
   */
  const recordSolvedDiscoveries = useCallback(async () => {
    const store = useGameStore.getState();
    if (!store.board) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // Kirim SEMUA kata yang solved (word_id boleh kosong — mis. board lama /
    // resume snapshot yang dibuat sebelum generator membawa word_id).
    // word_id di-resolve dari teks kata di dalam repository, jadi tidak ada
    // satu pun kata terjawab yang terlewat dari "Sejarah Saya".
    const solvedWords = store.board.words.filter((w) => w.solved);
    if (solvedWords.length === 0) return;
    await wordDiscoveryRepository.recordDiscoveriesForWords(user.id, solvedWords);
    await wordDiscoveryRepository.flushDiscoveries();
  }, []);

  // Simpan snapshot progres board yang sedang berjalan (belum selesai) ke
  // Supabase, supaya bisa di-resume dari "Mulai Bermain".
  const saveInProgress = useCallback(async () => {
    const store = useGameStore.getState();
    if (!store.board) return;
    // JANGAN simpan board yang sudah selesai sebagai in-progress. Board tamat
    // hanya boleh ada di riwayat (is_finished=true). Tanpa guard ini, setelah
    // user menutup overlay hasil (dismissResult), auto-save bisa menyimpan
    // snapshot board 100% solved sebagai is_finished=false → "Mulai Bermain"
    // berikutnya me-resume papan yang sudah tamat (bug: game nyangkut padahal
    // sudah terjawab semua).
    if (store.board.words.every((w) => w.solved)) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await boardRepository.save({
      board_id: IN_PROGRESS_BOARD_ID(user.id),
      user_id: user.id,
      tier_at_generation: store.board.tierLevel,
      grid_size: store.board.size,
      layout_data: serializeBoardProgress({
        board: store.board,
        filledLetters: store.filledLetters,
        hints: store.hints,
        currentXp: store.currentXp,
        wordsSolved: store.wordsSolved,
        totalXp: store.totalXp,
        aiMode: store.aiMode,
      }),
      is_finished: false,
      updated_at: new Date().toISOString(),
    });

    // Rekam kata-kata yang sudah terjawab benar di board ini ke riwayat
    // penemuan (dedup), supaya "Sejarah Saya" menampilkan semua kata yang
    // sudah dijawab — bukan cuma yang board-nya sampai selesai.
    await recordSolvedDiscoveries();
  }, [recordSolvedDiscoveries]);

  // ─── Auto-simpan progres board ───
  // Sebelumnya papan hanya tersimpan saat user keluar lewat dialog konfirmasi
  // (beforeRemove). Kalau tab di-refresh / ditutup (web) atau app di-background
  // (native), progres yang belum selesai HILANG — masuk lagi dari "Mulai
  // Bermain" selalu membuat papan baru. Di sini progres disimpan otomatis:
  //  - debounce 500ms setiap ada perubahan (huruf, hint, XP, kata solved), dan
  //  - flush langsung saat pagehide/beforeunload (web) / background (native) /
  //    unmount, supaya simpanan terakhir tidak tertinggal di timer.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedKeyRef = useRef<string>("");

  // Kunci dedup: snapshot state game yang relevan untuk disimpan.
  const saveKey = useCallback(() => {
    const store = useGameStore.getState();
    return JSON.stringify([
      store.filledLetters,
      store.hints,
      store.wordsSolved,
      store.currentXp,
    ]);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    const store = useGameStore.getState();
    if (!store.board || store.boardResult) return;
    const key = saveKey();
    if (key === lastSavedKeyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      // Re-check DI SAAT FIRE (bukan cuma saat di-schedule). Kalau papan sudah
      // selesai / boardResult sudah muncul sejak timer dipasang, JANGAN simpan:
      // kalau tidak, papan yang baru selesai bisa tersimpan LAGI sebagai
      // in-progress (is_finished=false) SETELAH baris in-progress dihapus di
      // penyelesaian → "Mulai Bermain" berikutnya me-resume papan yang sudah
      // tamat (bug: game lama masih nyangkut padahal sudah terjawab semua).
      const s = useGameStore.getState();
      if (!s.board || s.boardResult) return;
      lastSavedKeyRef.current = key;
      void saveInProgress().catch((err) =>
        loggerInfo("Auto-simpan progres gagal", err),
      );
    }, 500);
  }, [saveInProgress, saveKey]);

  // Simpan SEKARANG kalau masih ada perubahan yang belum tersimpan.
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const store = useGameStore.getState();
    if (!store.board || store.boardResult) return;
    const key = saveKey();
    if (key === lastSavedKeyRef.current) return;
    lastSavedKeyRef.current = key;
    void saveInProgress().catch((err) =>
      loggerInfo("Simpan progres terakhir gagal", err),
    );
  }, [saveInProgress, saveKey]);

  // 1) Auto-simpan (debounce) setiap ada perubahan state game. Begitu papan
  //    SELESAI (boardResult terisi), batalkan timer yang masih menggantung —
  //    mencegah papan tamat tersimpan ulang sebagai in-progress.
  useEffect(() => {
    if (boardResult) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }
    if (!board) return;
    scheduleAutoSave();
  }, [filledLetters, hints, wordsSolved, currentXp, board, boardResult, scheduleAutoSave]);

  // 2) Flush saat halaman web ditutup/di-refresh & saat app native di-background.
  useEffect(() => {
    if (!board) return;
    if (Platform.OS === "web") {
      window.addEventListener("pagehide", flushSave);
      window.addEventListener("beforeunload", flushSave);
      return () => {
        window.removeEventListener("pagehide", flushSave);
        window.removeEventListener("beforeunload", flushSave);
      };
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") flushSave();
    });
    return () => sub.remove();
  }, [board, flushSave]);

  // 3) Flush saat layar Game dilepas (navigasi keluar tanpa dialog).
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [flushSave]);

  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    quittingRef.current = true;
    const navAction = pendingNavAction.current;
    pendingNavAction.current = null;

    const finishQuit = () => {
      reset();
      if (navAction) navigation.dispatch(navAction);
    };

    saveInProgress()
      .then(finishQuit)
      .catch((err) => {
        loggerInfo("Gagal menyimpan progres saat keluar", err);
        finishQuit();
      });
  }, [navigation, reset, saveInProgress]);

  const handleCancelQuit = useCallback(() => {
    setShowQuitConfirm(false);
    pendingNavAction.current = null;
  }, []);

  // Load a fresh board from the vocabulary database.
  // Kalau ada board in-progress yang tersimpan, resume dulu dari sana.
  // TANPA fallback kata demo: kalau query gagal, tampilkan layar error dengan
  // tombol Coba Lagi (retryNonce) — tidak ada jalur yang memunculkan ulang
  // kata yang sudah ditemukan.
  useEffect(() => {
    if (board) return;
    let cancelled = false;

    (async () => {
      setBoardLoadError(false);
      setAiBoardFailed(false);
      try {
        const totalXp = useGameStore.getState().totalXp;
        const playerTier = calcTier(totalXp);
        // PLAN-046: XP ≥ 800.000 → pool kata SEMUA tier (1–10); kata yang
        // sudah ditemukan tetap dikecualikan (aturan word_discoveries).
        const allTiers = shouldUnlockAllTiers(totalXp);

        // ── Mode AI: kata dibuat provider AI (lewat "Main Mode AI"). Board
        //    AI selalu fresh — tidak me-resume progres normal. Kata AI tanpa
        //    word_id tidak dicatat ke "Sejarah Saya" (repository me-resolve
        //    word_id dari teks kata, jadi kata yang cocok tetap tercatat). ──
        const aiWords = useGameStore.getState().aiWords;
        if (aiWords && aiWords.length > 0) {
          const candidates: WordCandidate[] = aiWords.map((w) => ({
            word: w.word,
            clue_1: w.clue_1,
            clue_2: w.clue_2,
            clue_3: w.clue_2,
            tier_level: playerTier,
          }));
          let generated: Board | null = null;
          // Papan AI menerima minimal AI_MIN_WORDS kata (lebih kecil dari papan
          // normal) — provider AI bisa saja mengembalikan sedikit kata valid.
          for (let size = MIN_GRID_SIZE; size <= MAX_GRID_SIZE && !generated; size++) {
            const attempt = generateBoard(candidates, size, playerTier);
            if (attempt.words.length >= AI_MIN_WORDS) generated = attempt;
          }
          if (!generated) generated = generateBoard(candidates, MAX_GRID_SIZE, playerTier);
          // Kata AI dipakai SEKALI — sesudahnya kembali ke mode normal supaya
          // "Main Lagi" / "Mulai Bermain" berikutnya tidak memakai papan AI.
          useGameStore.getState().setAiWords(null);
          if (cancelled) return;
          if (!generated || generated.words.length < AI_MIN_WORDS) {
            // Papan AI gagal disusun — mode AI batal. Tanpa reset aiMode, tombol
            // "Coba Lagi" akan menghasilkan papan NORMAL yang tetap berjalan
            // dalam Mode AI (XP sama sekali tidak dihitung untuk papan normal).
            useGameStore.getState().setAiMode(false);
            setBoardLoadError(true);
            setAiBoardFailed(true);
            return;
          }
          setBoard(generated);
          return;
        }

        // 1) Coba resume board in-progress milik user ini (dari Supabase)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const saved = await boardRepository.getInProgress(user.id);
          if (saved.length > 0) {
            const resumed = deserializeBoardProgress(saved[0].layout_data);
            // Self-heal data lama: kalau snapshot in-progress ternyata sudah
            // 100% solved (sisa bug lama yang menyimpan papan tamat sebagai
            // in-progress), jangan di-resume — hapus & buat papan baru.
            if (resumed && resumed.board.words.every((w) => w.solved)) {
              await boardRepository.delete(IN_PROGRESS_BOARD_ID(user.id));
              void recordSolvedDiscoveries();
              // lanjut ke generate papan baru di bawah
            } else if (resumed && !cancelled) {
              resumeProgress(resumed);
              return;
            }
          }
        }

        // 2) Tidak ada progres tersimpan — generate papan baru sesuai tier.
        //    XP < 800.000: SEMUA kata yang pernah ditemukan user ini dikecualikan
        //    server-side (`not.in`) — tidak muncul lagi. XP ≥ 800.000 (allTiers,
        //    PLAN-095 arahan pemilik): tanpa eksklusi — boleh soal apa pun,
        //    dari tier mana pun.
        const discoveredWordIds = user
          ? await wordDiscoveryRepository.getDiscoveredWordIds(user.id)
          : [];
        // Pool diambil SEKALI (generator menyaring panjang kata per ukuran grid
        // di dalamnya), lalu ukuran grid dibuat FLEKSIBEL: mulai 10×10, naik
        // bertahap sampai minimal MIN_WORDS soal tertampung (bisa > 10).
        const candidates = await selectWordPool({
          playerTier,
          excludedWordIds: discoveredWordIds,
          gridSize: MAX_GRID_SIZE,
          allTiers,
        });
        let generated: Board | null = null;
        for (let size = MIN_GRID_SIZE; size <= MAX_GRID_SIZE && !generated; size++) {
          const attempt = generateBoard(candidates, size, playerTier);
          if (attempt.words.length >= MIN_WORDS) generated = attempt;
        }
        if (!generated) {
          generated = generateBoard(candidates, MAX_GRID_SIZE, playerTier);
        }
        if (!cancelled) setBoard(generated);
      } catch (err) {
        loggerWarn("Gagal menyusun papan kata", err);
        if (!cancelled) setBoardLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [board, setBoard, resumeProgress, retryNonce]);

  // Auto-solve check — skip words that were fully revealed (no XP for revealed words)
  // ─── Efek suara saat papan selesai: fanfare kemenangan (sekali per hasil). ───
  const winPlayedRef = useRef(false);
  useEffect(() => {
    if (boardResult && !winPlayedRef.current) {
      winPlayedRef.current = true;
      play("win");
    }
    if (!boardResult) winPlayedRef.current = false;
  }, [boardResult]);

  const prevFilledRef = useRef(filledLetters);
  useEffect(() => {
    if (!board || boardResult) return;
    prevFilledRef.current = filledLetters;
    for (let i = 0; i < board.words.length; i++) {
      const word = board.words[i];
      if (word.solved) continue;
      if (!isWordComplete(word, filledLetters)) continue;

      // Catatan: tidak ada lagi skip untuk kata full-reveal — kata itu tetap
      // di-solve (biar papan bisa selesai, tidak stuck di 100%), dan soal XP
      // ditangani di markWordSolved (full-reveal = 0 XP).
      const result = validateWord(word, i, filledLetters);
      if (result.isCorrect) {
        markWordSolved(i);
        loggerInfo(`Word ${i} CORRECT: ${word.word}`);
      }
    }
  }, [filledLetters, board, boardResult, markWordSolved]);

  // Rekam kata yang baru terjawab ke riwayat penemuan SEGERA — tidak menunggu
  // board selesai atau keluar. Tanpa ini, kalau user menutup tab / refresh di
  // tengah permainan, kata yang sudah dijawab tidak pernah masuk "Sejarah Saya".
  // Dedup lokal + cloud ada di recordDiscoveriesForWords, jadi aman dipanggil
  // berulang (perubahan filledLetters bisa memicu lebih dari sekali).
  const lastBoardRef = useRef<Board | null>(null);
  const prevSolvedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!board) return;
    // Identitas kata untuk deteksi "baru solved": word_id, atau teks kata
    // sebagai fallback (board lama yang word_id-nya null).
    const wordKey = (w: BoardWord): string => w.word_id ?? `text:${w.word}`;
    const solvedKeys = board.words.filter((w) => w.solved).map(wordKey);

    // Papan baru (termasuk resume): seed daftar solved — kata yang sudah solved
    // sejak awal tidak di-rekam di sini (di-backfill saat board selesai).
    if (lastBoardRef.current !== board) {
      lastBoardRef.current = board;
      prevSolvedIdsRef.current = solvedKeys;
      return;
    }

    const newlySolved = solvedKeys.filter((id) => !prevSolvedIdsRef.current.includes(id));
    if (newlySolved.length === 0) return;
    prevSolvedIdsRef.current = solvedKeys;

    const newlySolvedSet = new Set(newlySolved);
    const newlySolvedWords = board.words.filter((w) => w.solved && newlySolvedSet.has(wordKey(w)));
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await wordDiscoveryRepository.recordDiscoveriesForWords(user.id, newlySolvedWords);
        // Tunggu push ke Supabase selesai — kalau user langsung pindah ke
        // halaman Sejarah, riwayat terbaru sudah tersimpan sebelum halaman
        // itu membaca cloud.
        await wordDiscoveryRepository.flushDiscoveries();
      } catch (err) {
        loggerWarn("Gagal merekam kata yang baru terjawab", err);
      }
    })();
  }, [board, filledLetters]);

  // Persist hasil board: simpan board selesai + kata yang ditemukan + XP user,
  // lalu push semua ke Supabase (syncToCloud).
  useEffect(() => {
    if (!boardResult || !board) return;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();
        const rand = Math.random().toString(36).slice(2, 8);

        // 0) Papan sudah selesai — hapus snapshot in-progress (kalau ada),
        //    supaya "Mulai Bermain" berikutnya bikin papan baru, bukan me-resume yang tamat.
        await boardRepository.delete(IN_PROGRESS_BOARD_ID(user.id));

        // 1) Board yang selesai (is_finished = true)
        await boardRepository.save({
          board_id: `board-${Date.now()}-${rand}`,
          user_id: user.id,
          tier_at_generation: board.tierLevel,
          grid_size: board.size,
          layout_data: JSON.stringify({
            words: board.words.map((w) => ({
              word: w.word,
              word_id: w.word_id ?? null,
              clue_1: w.clue_1,
              clue_2: w.clue_2 ?? null,
              clue_3: w.clue_3 ?? null,
              orientation: w.orientation,
              startRow: w.startRow,
              startCol: w.startCol,
            })),
            size: board.size,
            tierLevel: board.tierLevel,
          }),
          is_finished: true,
          updated_at: now,
        });

        // 2) Kata-kata yang terpecahkan → riwayat penemuan (word discoveries).
        //    Blok try TERPISAH: kalau penyimpanan board / XP gagal, pencatatan
        //    Sejarah tetap jalan — jangan sampai error di atas menggagalkan
        //    recordDiscoveriesForWords (ini penyebab Sejarah tidak bertambah).
        try {
          await recordSolvedDiscoveries();
        } catch (discoveryErr) {
          loggerWarn("Gagal merekam discovery saat board selesai", discoveryErr);
        }

        // 3) XP kumulatif user + tier terbaru. DILEWATI total di Main Mode AI:
        //    mode ini tidak boleh menyentuh XP sama sekali (tambah, kurangi,
        //    maupun updated_at yang dipakai urutan leaderboard).
        if (!useGameStore.getState().aiMode) {
          const prevUser = await userRepository.getById(user.id);
          // xpGained adalah XP neto sesi — BISA negatif kalau penalti
          // clue/reveal lebih besar dari XP kata. Penalti ini NYATA: total XP
          // akun ikut berkurang (hanya di-clamp agar tidak negatif, dan kata
          // full-reveal tidak memberi XP).
          const newTotalXp = Math.max(0, (prevUser?.total_xp ?? 0) + boardResult.xpGained);
          const sessionName = displayNameFromMetadata(user.user_metadata);
          await userRepository.upsert({
            user_id: user.id,
            display_name: prevUser?.display_name ?? sessionName ?? "Pemain",
            email: prevUser?.email,
            total_xp: newTotalXp,
            current_tier: calcTier(newTotalXp),
            coins: prevUser?.coins ?? 0,
            updated_at: now,
          });
          useGameStore.getState().setTotalXp(newTotalXp);
        }
      } catch (err) {
        loggerInfo("Gagal menyimpan hasil board", err);
      }
    })();
  }, [board, boardResult, recordSolvedDiscoveries]);

  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

  const selectedHintUsage = selectedWordIndex !== null ? hints[String(selectedWordIndex)] : undefined;
  // Tombol clue nonaktif saat tidak ada kata terpilih / kata sudah selesai.
  const clueActionsDisabled = selectedWordIndex === null || selectedWord?.solved === true;

  // Jumlah sel pada kata terpilih yang masih bisa diisi/diganti oleh reveal
  // (kosong, atau berisi huruf salah). Kalau 0, reveal tidak akan mengubah
  // apa pun — tombolnya dinonaktifkan supaya pemain tidak membuka dialog
  // konfirmasi (dan tidak ada XP yang terpotong tanpa efek).
  const revealTargets = useMemo(() => {
    if (!selectedWord) return 0;
    return selectedWord.cells.filter((c) => {
      if (c.isLocked) return false;
      const offset =
        selectedWord.orientation === "vertical"
          ? c.row - selectedWord.startRow
          : c.col - selectedWord.startCol;
      const correct = selectedWord.word[offset]?.toUpperCase();
      return filledLetters[`${c.row},${c.col}`]?.toUpperCase() !== correct;
    }).length;
  }, [selectedWord, filledLetters]);

  const revealLetterDisabled = clueActionsDisabled || revealTargets === 0;
  const revealWordDisabled = clueActionsDisabled || revealTargets === 0;

  const clue2Opened = !!selectedHintUsage?.clue2Used;
  const clue3Opened = !!selectedHintUsage?.clue3Used;
  const allCluesOpened = clue2Opened && clue3Opened;
  // PLAN-057: tombol Clue 2 & Clue 3 dipisah — masing-masing punya disabled sendiri.
  const clue2Disabled = clueActionsDisabled || clue2Opened;
  const clue3Disabled = clueActionsDisabled || clue3Opened || !clue2Opened;

  // Level clue yang benar-benar ditampilkan di pill: kalau clueLevel menunjuk
  // ke clue yang belum dibuka untuk kata saat ini (mis. baru pindah kata),
  // turunkan ke level tertinggi yang tersedia — mencegah satu-frame flicker
  // menampilkan clue yang belum dibuka sebelum effect reset jalan.
  const shownClueLevel: 1 | 2 | 3 =
    clueLevel === 2 && !clue2Opened
      ? 1
      : clueLevel === 3 && !clue3Opened
        ? clue2Opened
          ? 2
          : 1
        : clueLevel;

  // Isi pill clue mengikuti level yang sedang aktif (1/2/3).
  const clueLevelLabel =
    shownClueLevel === 1
      ? selectedWord
        ? `${selectedWord.orientation === "horizontal" ? "Mendatar" : "Menurun"} (${selectedWord.word.length} Huruf)`
        : "Pilih kata di papan"
      : shownClueLevel === 2
        ? "Penjelasan Lain"
        : "Sinonim / Antonim";
  const clueLevelText =
    shownClueLevel === 1
      ? selectedWord?.clue_1 ?? "Ketuk sel untuk memulai"
      : shownClueLevel === 2
        ? selectedWord?.clue_2 ?? selectedWord?.clue_1 ?? ""
        : selectedWord?.clue_3 ?? selectedWord?.clue_1 ?? "";

  // Tombol rotate clue SELALU tampil di pill. Kemampuan rotate mengikuti
  // jumlah clue yang sudah dibuka untuk kata itu:
  //   - belum ada clue lain dibuka / tidak ada kata → tombol nonaktif
  //   - clue 2 dibuka → rotate 1 ↔ 2
  //   - clue 3 dibuka → rotate 1 → 2 → 3 → 1 (loop)
  const canRotateClue = selectedWord !== null && (clue2Opened || clue3Opened);

  // Kembali ke clue utama setiap pindah kata (clue yang dibuka bersifat
  // permanen per kata, jadi pill selalu mulai dari clue utama di kata baru).
  useEffect(() => {
    setClueLevel(1);
  }, [selectedWordIndex]);

  const switchClue = useCallback(() => {
    setClueLevel((l) => {
      if (clue3Opened) return l >= 3 ? 1 : ((l + 1) as 1 | 2 | 3);
      if (clue2Opened) return l === 1 ? 2 : 1;
      return l;
    });
  }, [clue2Opened, clue3Opened]);

  // PLAN-057: konfirmasi reveal clue 2 & 3 terpisah.
  const confirmRevealClue2 = useCallback(() => {
    if (selectedWordIndex === null) return;
    play("hint");
    useClue2(selectedWordIndex);
    setClueLevel(2);
    setShowRevealClue2Confirm(false);
  }, [selectedWordIndex, useClue2]);

  const confirmRevealClue3 = useCallback(() => {
    if (selectedWordIndex === null) return;
    play("hint");
    useClue3(selectedWordIndex);
    setClueLevel(3);
    setShowRevealClue3Confirm(false);
  }, [selectedWordIndex, useClue3]);

  useEffect(() => {
    if (Platform.OS !== "web" || !board) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { play("tap"); navigateToCell("up"); e.preventDefault(); }
      if (e.key === "ArrowDown") { play("tap"); navigateToCell("down"); e.preventDefault(); }
      if (e.key === "ArrowLeft") { play("tap"); navigateToCell("left"); e.preventDefault(); }
      if (e.key === "ArrowRight") { play("tap"); navigateToCell("right"); e.preventDefault(); }
      if (e.key === "Backspace") { playDeleteFeedback(); useGameStore.getState().deleteLetter(); e.preventDefault(); }
      if (/^[a-zA-Z]$/.test(e.key)) {
        playLetterPressFeedback(useGameStore.getState().selectedWordIndex, e.key);
        inputLetter(e.key);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [board, navigateToCell, inputLetter]);

  if (!board) {
    if (boardLoadError) {
      return (
        <View style={[styles.container, styles.loadingWrap, { backgroundColor: boardBackground.color }]}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {aiBoardFailed
              ? "Soal dari AI tidak cukup untuk menyusun papan. Coba main mode normal, atau panggil AI lagi dari menu utama."
              : "Gagal menyusun papan kata. Periksa koneksi internetmu, lalu coba lagi."}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              setRetryNonce((n) => n + 1);
            }}
          >
            <Text style={[styles.retryBtnText, { color: textOnPrimary(theme) }]}>🔄 Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={[styles.container, styles.loadingWrap, { backgroundColor: boardBackground.color }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Menyusun papan kata…
        </Text>
      </View>
    );
  }
  return (
    <ScreenFade background={boardBackground} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Scrollable area */}
      <ScrollView
        ref={outerScrollRef}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setOuterViewportH(e.nativeEvent.layout.height)}
      >
        <GameTopBar
          colors={theme.colors}
          isDark={isDark}
          onToggleTheme={() => {
            play("tap");
            void setThemeMode(isDark ? "light" : "dark");
          }}
          aiMode={aiMode}
          compactBar={compactBar}
          totalXp={totalXp}
          currentXp={currentXp}
          fillProgress={fillProgress}
          topInset={Platform.OS === "web" ? 0 : insets.top}
          shadow={theme.shadow}
          onBack={() => {
            play("tap");
            navigation.goBack();
          }}
        />

        {/* Peringatan: semua sel terisi tapi masih ada kata yang belum benar */}
        {allFilledNotComplete && (
          <View
            style={[
              styles.wrongHint,
              { backgroundColor: theme.colors.error + "1A", borderColor: theme.colors.error },
            ]}
          >
            <Text style={[styles.wrongHintText, { color: theme.colors.error }]}>
              ⚠️ Semua sel sudah terisi — masih ada kata yang belum benar. Periksa kembali jawabanmu.
            </Text>
          </View>
        )}

        {/* Crossword Grid (Scrollable + Zoomable) */}
        <View
          style={zoomLevel <= 1 ? [styles.gridOuterWrapper, styles.gridOuterCentered] : styles.gridOuterWrapper}
          onLayout={(e) => setGridOffsetY(e.nativeEvent.layout.y)}
        >
          <Animated.View style={{ transform: [{ scale: zoomAnim }] }}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.gridScroll}
              contentContainerStyle={styles.gridScrollContent}
              horizontal={zoomLevel > 1}
              showsHorizontalScrollIndicator={zoomLevel > 1}
              showsVerticalScrollIndicator={zoomLevel > 1}
              bounces={true}
            >
              <View style={styles.gridCenterWrapper}>
                <CrosswordGrid
                  board={board}
                  selectedCell={selectedCell}
                  selectedWordIndex={selectedWordIndex}
                  inputOrientation={inputOrientation}
                  onCellPress={handleCellPress}
                  onCellDrag={handleCellDrag}
                  onToggleOrientation={() => useGameStore.getState().toggleOrientation()}
                  filledLetters={new Map(Object.entries(filledLetters))}
                  zoomLevel={zoomLevel}
                  revealedPulse={revealedPulse}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </ScrollView>

      {/* === Fixed Bottom Panels (always visible) === */}
      {/* paddingBottom mengikuti inset navigation bar (native) supaya panel
          aksi tidak tertutup gesture bar Android. Saat keyboard virtual tampil,
          inset dipindah ke wrapper keyboard (yang berada paling bawah). */}
      <View
        style={[
          styles.bottomPanels,
          {
            // Transparan supaya latar (gradien/gambar) tema papan tetap
            // terlihat di balik clue pill & action bar (keduanya punya warna
            // panel sendiri).
            backgroundColor: "transparent",
            paddingBottom: keyboardVisible ? 8 : 8 + (Platform.OS === "web" ? 0 : insets.bottom),
          },
        ]}
      >
        <CluePill
          panHandlers={cluePillPanResponder.panHandlers}
          onPrevWord={() => {
            play("tap");
            goToPrevWord();
          }}
          onNextWord={() => {
            play("tap");
            goToNextWord();
          }}
          wordNumber={selectedWord?.cells[0]?.number ?? "?"}
          canRotateClue={canRotateClue}
          clue3Opened={clue3Opened}
          shownClueLevel={shownClueLevel}
          clueLevelLabel={clueLevelLabel}
          clueLevelText={clueLevelText}
          onSwitchClue={() => {
            play("tap");
            switchClue();
          }}
        />

        <GameActionBar
          colors={boardColors}
          shadow={theme.shadow}
          zoomLevel={zoomLevel}
          onZoomOut={() => {
            play("tap");
            zoomOut();
          }}
          onResetZoom={() => {
            play("tap");
            resetZoom();
          }}
          onZoomIn={() => {
            play("tap");
            zoomIn();
          }}
          clue2Opened={clue2Opened}
          clue3Opened={clue3Opened}
          allCluesOpened={allCluesOpened}
          aiMode={aiMode}
          clue2Disabled={clue2Disabled}
          onRevealClue2={() => {
            play("tap");
            setShowRevealClue2Confirm(true);
          }}
          clue3Disabled={clue3Disabled}
          onRevealClue3={() => {
            play("tap");
            setShowRevealClue3Confirm(true);
          }}
          revealLetterDisabled={revealLetterDisabled}
          onRevealLetter={() => {
            play("tap");
            setShowRevealLetterConfirm(true);
          }}
          revealWordDisabled={revealWordDisabled}
          onRevealWord={() => {
            play("tap");
            setShowRevealWordConfirm(true);
          }}
          keyboardVisible={keyboardVisible}
          onToggleKeyboard={() => {
            play("tap");
            setKeyboardVisible((v) => !v);
          }}
          onReset={() => {
            play("tap");
            setShowResetConfirm(true);
          }}
        />
      </View>

      {keyboardVisible && (
        <View style={[styles.keyboardWrapper, { paddingBottom: Platform.OS === "web" ? 0 : insets.bottom }]}>
          <InGameKeyboard />
        </View>
      )}

      {/* Quit confirmation */}
      <ConfirmDialog
        visible={showQuitConfirm}
        title="Keluar Permainan?"
        message="Progres permainan akan disimpan — kamu bisa melanjutkannya kapan saja dari Mulai Bermain."
        confirmText="Ya, Simpan & Keluar"
        cancelText="Lanjut Main"
        onConfirm={handleConfirmQuit}
        onCancel={handleCancelQuit}
        variant="danger"
        emoji="🚪"
        confirmIcon="💾"
        cancelIcon="🎮"
      />

      {/* Reset board confirmation */}
      <ConfirmDialog
        visible={showResetConfirm}
        title="Reset Permainan?"
        message="Semua jawaban yang sudah terisi akan dikosongkan dan XP akan di-reset. Apa kamu yakin?"
        confirmText="Ya, Reset"
        cancelText="Batal"
        onConfirm={() => { resetBoard(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)}
        variant="danger"
        emoji="🔄"
        confirmIcon="🗑️"
        cancelIcon="↩️"
      />

      {/* PLAN-057: Reveal clue 2 confirmation (terpisah) */}
      <ConfirmDialog
        visible={showRevealClue2Confirm}
        title="Buka Petunjuk Ke-2?"
        message={
          aiMode
            ? "Membuka petunjuk ke-2? Mode AI: tidak ada XP yang dihitung."
            : `Membuka petunjuk ke-2 akan mengurangi XP sebesar ${XP_PENALTY_CLUE_2}. Lanjutkan?`
        }
        confirmText="Ya, Buka"
        cancelText="Batal"
        onConfirm={confirmRevealClue2}
        onCancel={() => setShowRevealClue2Confirm(false)}
        variant="danger"
        emoji="📖"
      />

      {/* PLAN-057: Reveal clue 3 confirmation (terpisah) */}
      <ConfirmDialog
        visible={showRevealClue3Confirm}
        title="Buka Petunjuk Ke-3?"
        message={
          aiMode
            ? "Membuka petunjuk ke-3? Mode AI: tidak ada XP yang dihitung."
            : `Membuka petunjuk ke-3 akan mengurangi XP sebesar ${XP_PENALTY_CLUE_3}. Lanjutkan?`
        }
        confirmText="Ya, Buka"
        cancelText="Batal"
        onConfirm={confirmRevealClue3}
        onCancel={() => setShowRevealClue3Confirm(false)}
        variant="danger"
        emoji="🔤"
      />

      {/* Reveal letter confirmation */}
      <ConfirmDialog
        visible={showRevealLetterConfirm}
        title="Buka Satu Huruf?"
        message={
          aiMode
            ? "Buka satu huruf dari kata terpilih? Mode AI: tidak ada XP yang dihitung."
            : `Menggunakan fitur ini akan mengurangi XP sebesar ${XP_PENALTY_REVEAL}. Lanjutkan?`
        }
        confirmText="Ya, Buka"
        cancelText="Batal"
        onConfirm={() => {
          play("hint");
          if (selectedWordIndex !== null) revealLetter(selectedWordIndex);
          setShowRevealLetterConfirm(false);
        }}
        onCancel={() => setShowRevealLetterConfirm(false)}
        variant="danger"
        emoji="🔍"
      />

      {/* Reveal word confirmation */}
      <ConfirmDialog
        visible={showRevealWordConfirm}
        title="Buka Semua Huruf?"
        message={
          aiMode
            ? "Buka semua huruf kata terpilih? Mode AI: tidak ada XP yang dihitung."
            : `Menggunakan fitur ini akan mengurangi XP sebesar ${XP_PENALTY_REVEAL} dan kata yang terbuka tidak akan mendapat XP. Lanjutkan?`
        }
        confirmText="Ya, Buka Semua"
        cancelText="Batal"
        onConfirm={() => {
          play("hint");
          if (selectedWordIndex !== null) revealWord(selectedWordIndex);
          setShowRevealWordConfirm(false);
        }}
        onCancel={() => setShowRevealWordConfirm(false)}
        variant="danger"
        emoji="💡"
      />

      {/* Popup selesai — dialog di ATAS papan (papan yang sudah selesai tetap
          terlihat di belakang, seperti sebelumnya). Tombol: Lihat Papan /
          Beranda / Main Lagi. */}
      <Modal
        transparent
        visible={!!boardResult}
        animationType="fade"
        onRequestClose={dismissResult}
      >
        {boardResult && (
          <CompletionOverlay
            result={boardResult}
            aiMode={aiMode}
            onPlayAgain={reset}
            onViewBoard={dismissResult}
            onHome={() => {
              // Flush semua jawaban yang sudah benar ke Sejarah DULU, baru
              // reset & kembali — supaya tidak ada kata yang hilang saat user
              // langsung pindah ke menu utama. Error tetap dicatat ke log
              // aplikasi, bukan ditelan diam-diam.
              recordSolvedDiscoveries()
                .catch((err) => {
                  loggerWarn("Gagal menyimpan jawaban saat ke Beranda", err);
                })
                .finally(() => {
                  reset();
                  navigation.goBack();
                });
            }}
          />
        )}
      </Modal>

    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  errorEmoji: { fontSize: 40 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  scrollContent: {},
  wrongHint: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  wrongHintText: { fontSize: 12, fontWeight: "600", flexShrink: 1, lineHeight: 17 },
  gridOuterWrapper: { marginBottom: 8, borderRadius: 12 },
  gridOuterCentered: { flexGrow: 1, justifyContent: "center" },
  gridScroll: { flexGrow: 0 },
  gridScrollContent: { flexGrow: 0 },
  gridCenterWrapper: { alignItems: "center", paddingHorizontal: 4, paddingVertical: 8 },
  // Panel bawah (clue pill + action bar) TIDAK boleh disusutkan — kalau
  // Yoga mengecilkan area ini saat keyboard virtual tampil di HP, pill clue
  // ikut terdesak dan teks soal panjang terpotong. Tinggi panel mengikuti
  // isi (auto-height); ScrollView papan di atasnya yang fleksibel.
  bottomPanels: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, flexShrink: 0 },
  // Keyboard virtual juga tidak boleh disusutkan (tombol punya tinggi tetap
  // 46px); kalau ruang sempit, ScrollView papan yang mengecil.
  keyboardWrapper: { flexShrink: 0 },
});
