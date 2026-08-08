import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity, ScrollView, Dimensions, Animated, ActivityIndicator, Modal, PanResponder } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import TooltipButton from "../../presentation/components/common/TooltipButton";
import ZoomIcon from "../../presentation/components/common/ZoomIcon";
import NextIcon from "../../presentation/components/common/NextIcon";
import KeyboardIcon from "../../presentation/components/common/KeyboardIcon";
import ListNumbersIcon from "../../presentation/components/common/ListNumbersIcon";
import NumberSquareIcon from "../../presentation/components/common/NumberSquareIcon";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { selectWordPool } from "../../domain/usecases/wordPoolFilter";
import { supabase } from "../../data/sources/supabase";
import { useAuth } from "../auth/useAuth";
import { displayNameFromMetadata } from "../../utils/userMetadata";
import UserAvatar from "../../presentation/components/common/UserAvatar";
import { boardRepository } from "../../data/repositories/boardRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { userRepository } from "../../data/repositories/userRepository";
import { isWordComplete, validateWord } from "../../domain/usecases/wordValidator";
import { calcTier, XP_PENALTY_CLUE_2, XP_PENALTY_CLUE_3, XP_PENALTY_REVEAL } from "../../domain/usecases/xpEngine";
import type { Board, BoardWord } from "../../domain/entities/board";
import { loggerInfo, loggerWarn } from "../../utils/logger";
import {
  serializeBoardProgress,
  deserializeBoardProgress,
  IN_PROGRESS_BOARD_ID,
} from "../../utils/boardProgress";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;
const CELL_GAP = 3;
const GRID_PADDING = 3;

export default function GameScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRevealLetterConfirm, setShowRevealLetterConfirm] = useState(false);
  const [showRevealWordConfirm, setShowRevealWordConfirm] = useState(false);
  const [showRevealClueConfirm, setShowRevealClueConfirm] = useState(false);
  // Level clue yang sedang ditampilkan di pill (1 = utama, 2 = penjelasan, 3 = sinonim/antonim).
  const [clueLevel, setClueLevel] = useState<1 | 2 | 3>(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardAutoShown = useRef(false);
  const pendingNavAction = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const prevZoomLevel = useRef(1);
  const [boardLoadError, setBoardLoadError] = useState(false);
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

    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
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
  }, [selectedCell, zoomLevel, board, gridOffsetY, outerViewportH]);

  useEffect(() => {
    if (zoomLevel > 1) {
      // Wait for the zoom spring to settle before scrolling.
      const timeout = setTimeout(scrollToFocusedCell, 150);
      return () => clearTimeout(timeout);
    }
    // Zoom 1: scroll immediately so auto-focused cells stay visible while typing.
    scrollToFocusedCell();
  }, [selectedCell, zoomLevel, scrollToFocusedCell]);

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
      }),
      is_finished: false,
      updated_at: new Date().toISOString(),
    });

    // Rekam kata-kata yang sudah terjawab benar di board ini ke riwayat
    // penemuan (dedup), supaya "Sejarah Saya" menampilkan semua kata yang
    // sudah dijawab — bukan cuma yang board-nya sampai selesai.
    await recordSolvedDiscoveries();
  }, [recordSolvedDiscoveries]);

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
      try {
        // 1) Coba resume board in-progress milik user ini (dari Supabase)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const saved = await boardRepository.getInProgress(user.id);
          if (saved.length > 0) {
            const resumed = deserializeBoardProgress(saved[0].layout_data);
            if (resumed && !cancelled) {
              resumeProgress(resumed);
              return;
            }
          }
        }

        // 2) Tidak ada progres tersimpan — generate papan baru sesuai tier.
        //    SEMUA kata yang pernah ditemukan user ini (lintas tier, dari
        //    word_discoveries) dikecualikan server-side — tidak akan pernah
        //    muncul lagi di papan mana pun.
        const playerTier = calcTier(useGameStore.getState().totalXp);
        const discoveredWordIds = user
          ? await wordDiscoveryRepository.getDiscoveredWordIds(user.id)
          : [];
        const candidates = await selectWordPool({
          playerTier,
          excludedWordIds: discoveredWordIds,
          gridSize: 10,
        });
        const generated = generateBoard(candidates, 10, playerTier);
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

        // 3) XP kumulatif user + tier terbaru
        const prevUser = await userRepository.getById(user.id);
        const newTotalXp = (prevUser?.total_xp ?? 0) + boardResult.xpGained;
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

  const clue2Opened = !!selectedHintUsage?.clue2Used;
  const clue3Opened = !!selectedHintUsage?.clue3Used;
  const allCluesOpened = clue2Opened && clue3Opened;
  // Level clue berikutnya yang akan dibuka lewat tombol reveal clue (2 dulu, lalu 3).
  const nextClueToReveal: 2 | 3 = clue2Opened ? 3 : 2;
  const revealClueDisabled = clueActionsDisabled || allCluesOpened;

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

  // Konfirmasi reveal clue berikutnya (2 lalu 3). XP potong sekali lalu gratis.
  const confirmRevealClue = useCallback(() => {
    if (selectedWordIndex === null) return;
    if (nextClueToReveal === 2) {
      useClue2(selectedWordIndex);
      setClueLevel(2);
    } else {
      useClue3(selectedWordIndex);
      setClueLevel(3);
    }
    setShowRevealClueConfirm(false);
  }, [selectedWordIndex, nextClueToReveal, useClue2, useClue3]);

  useEffect(() => {
    if (Platform.OS !== "web" || !board) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { navigateToCell("up"); e.preventDefault(); }
      if (e.key === "ArrowDown") { navigateToCell("down"); e.preventDefault(); }
      if (e.key === "ArrowLeft") { navigateToCell("left"); e.preventDefault(); }
      if (e.key === "ArrowRight") { navigateToCell("right"); e.preventDefault(); }
      if (e.key === "Backspace") { useGameStore.getState().deleteLetter(); e.preventDefault(); }
      if (/^[a-zA-Z]$/.test(e.key)) { inputLetter(e.key); e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [board, navigateToCell, inputLetter]);

  if (!board) {
    if (boardLoadError) {
      return (
        <View style={[styles.container, styles.loadingWrap, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Gagal menyusun papan kata. Periksa koneksi internetmu, lalu coba lagi.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
            onPress={() => setRetryNonce((n) => n + 1)}
          >
            <Text style={styles.retryBtnText}>🔄 Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={[styles.container, styles.loadingWrap, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Menyusun papan kata…
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Scrollable area */}
      <ScrollView
        ref={outerScrollRef}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setOuterViewportH(e.nativeEvent.layout.height)}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.topBarLeft}>
            <TooltipButton
              tooltip="Kembali ke menu utama"
              icon="🏠"
              style={[styles.backBtn, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backBtnText, { color: theme.colors.text }]}>‹</Text>
            </TooltipButton>
            <UserAvatar name={user?.displayName} avatarUrl={user?.avatarUrl} size={36} />
            <Text style={[styles.appTitle, { color: theme.colors.primary }]}>KotaKata AI</Text>
          </View>
          <View style={[styles.xpPill, { backgroundColor: "#ffd6ee" }]}>
            <Text style={[styles.xpPillText, { color: "#a02070" }]}>⭐ {totalXp + currentXp} XP</Text>
          </View>
        </View>

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
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </ScrollView>

      {/* === Fixed Bottom Panels (always visible) === */}
      <View style={[styles.bottomPanels, { backgroundColor: theme.colors.background }]}>
        {/* Clue Pill: [<] [nomor] [>] | clue [switch] — geser kiri/kanan untuk ganti kata.
            Progress bar garis di tepi ATAS panel soal (pengganti progress ring lama). */}
        <View style={[styles.cluePill, { backgroundColor: "#0096cc" }]} {...cluePillPanResponder.panHandlers}>
          {/* Progress bar garis — lebar mengikuti fillProgress */}
          <View style={styles.cluePillProgress}>
            <View
              style={[
                styles.cluePillProgressFill,
                { width: `${Math.round(fillProgress * 100)}%` as any },
              ]}
            />
          </View>
          {/* Nav kata */}
          <TooltipButton tooltip="Kata sebelumnya" icon="◀️" activeOpacity={0.7} onPress={goToPrevWord} style={styles.clueArrow}>
            <NextIcon flipped size={17} color="#FFF" />
          </TooltipButton>
          <View style={styles.clueNumberBadge}>
            <Text style={styles.clueNumberText}>
              {selectedWord?.cells[0]?.number ?? "?"}
            </Text>
          </View>
          <TooltipButton tooltip="Kata berikutnya" icon="▶️" activeOpacity={0.7} onPress={goToNextWord} style={styles.clueArrow}>
            <NextIcon size={17} color="#FFF" />
          </TooltipButton>

          {/* Separator */}
          <View style={[styles.clueDivider, { backgroundColor: "rgba(255,255,255,0.35)" }]} />

          {/* Tombol ganti tampilan clue — ditaruh di DEPAN teks clue biar konteksnya jelas */}
          <TooltipButton
            tooltip={
              !canRotateClue
                ? "Buka petunjuk lain dulu untuk bisa mengganti tampilan clue"
                : clue3Opened
                  ? "Ganti tampilan clue (utama → penjelasan → sinonim)"
                  : "Ganti tampilan clue (utama ↔ penjelasan)"
            }
            icon="🔁"
            accessibilityLabel="Ganti tampilan clue"
            activeOpacity={0.7}
            onPress={() => canRotateClue && switchClue()}
            style={[styles.clueSwitchBtn, { opacity: canRotateClue ? 1 : 0.4 }]}
          >
            <NumberSquareIcon number={shownClueLevel} size={20} color="#FFF" />
          </TooltipButton>

          {/* Isi clue */}
          <View style={styles.clueContent}>
            <View style={styles.clueTextWrap}>
              <Text style={styles.clueOrientation}>{clueLevelLabel}</Text>
              <Text style={styles.clueMain} numberOfLines={2}>
                {clueLevelText}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Bar + Zoom */}
        <View style={[styles.actionBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Zoom Controls (Left) — kaca pembesar + / − */}
          <View style={styles.zoomGroup}>
            <TooltipButton
              tooltip="Perkecil tampilan papan (zoom out)"
              icon="🔍"
              style={[styles.zoomBtnSmall, { backgroundColor: theme.colors.secondaryContainer, opacity: zoomLevel <= ZOOM_MIN ? 0.4 : 1 }]}
              activeOpacity={0.7}
              onPress={zoomOut}
            >
              <ZoomIcon variant="out" size={18} color={theme.colors.text} />
            </TooltipButton>
            <TooltipButton
              tooltip="Atur ulang zoom ke 100%"
              icon="🔍"
              style={[styles.zoomResetBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              activeOpacity={0.7}
              onPress={resetZoom}
            >
              <Text style={[styles.zoomLabel, { color: theme.colors.textSecondary }]}>{Math.round(zoomLevel * 100)}%</Text>
            </TooltipButton>
            <TooltipButton
              tooltip="Perbesar tampilan papan (zoom in)"
              icon="🔍"
              style={[styles.zoomBtnSmall, { backgroundColor: theme.colors.secondaryContainer, opacity: zoomLevel >= ZOOM_MAX ? 0.4 : 1 }]}
              activeOpacity={0.7}
              onPress={zoomIn}
            >
              <ZoomIcon variant="in" size={18} color={theme.colors.text} />
            </TooltipButton>
          </View>

          {/* Divider */}
          <View style={[styles.actionDivider, { backgroundColor: theme.colors.border }]} />

          {/* Reveal Actions (Center) — label statis + 3 tombol icon */}
          <View style={styles.revealGroup}>
            <Text style={[styles.clueLabelText, { color: theme.colors.textSecondary }]}>Petunjuk</Text>

            {/* Reveal petunjuk — buka clue 2 dulu, lalu 3 (XP potong sekali) */}
            <TooltipButton
              tooltip={
                allCluesOpened
                  ? "Semua petunjuk sudah terbuka"
                  : nextClueToReveal === 2
                    ? `Petunjuk ke-2 — −${XP_PENALTY_CLUE_2} XP (sekali, lalu gratis)`
                    : `Petunjuk ke-3 — −${XP_PENALTY_CLUE_3} XP (sekali, lalu gratis)`
              }
              icon="📖"
              accessibilityLabel={
                allCluesOpened
                  ? "Semua petunjuk sudah terbuka"
                  : `Buka petunjuk ke-${nextClueToReveal}`
              }
              style={[
                styles.actionItem,
                {
                  backgroundColor: allCluesOpened ? theme.colors.surface : theme.colors.primary,
                  opacity: revealClueDisabled ? 0.4 : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => !revealClueDisabled && setShowRevealClueConfirm(true)}
            >
              <ListNumbersIcon size={18} color={allCluesOpened ? theme.colors.textSecondary : "#FFF"} />
              <View style={[styles.clueBadge, { backgroundColor: allCluesOpened ? theme.colors.border : "#FFF" }]}>
                <Text style={[styles.clueBadgeText, { color: allCluesOpened ? theme.colors.textSecondary : theme.colors.primary }]}>
                  {allCluesOpened ? "✓" : nextClueToReveal}
                </Text>
              </View>
            </TooltipButton>
            {/* Reveal letter */}
            <TooltipButton
              tooltip={`Buka satu huruf dari kata terpilih (−${XP_PENALTY_REVEAL} XP)`}
              icon="🔍"
              style={[styles.actionItem, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => selectedWordIndex !== null && setShowRevealLetterConfirm(true)}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.secondary }]}>🔍</Text>
            </TooltipButton>
            {/* Reveal word */}
            <TooltipButton
              tooltip={`Buka semua huruf kata — −${XP_PENALTY_REVEAL} XP (tanpa XP kata)`}
              icon="💡"
              style={[styles.actionItem, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => selectedWordIndex !== null && setShowRevealWordConfirm(true)}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.secondary }]}>💡</Text>
            </TooltipButton>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Reset (Right) — pindahan dari panel atas, di samping tombol keyboard */}
          <TooltipButton
            tooltip="Reset papan — kosongkan jawaban & XP"
            icon="🔄"
            style={[styles.rstBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={() => setShowResetConfirm(true)}
          >
            <Text style={[styles.rstBtnText, { color: theme.colors.secondary }]}>🔄</Text>
          </TooltipButton>

          {/* Keyboard Toggle (Right) — border bulat biar konsisten dengan tombol lain */}
          <TooltipButton
            tooltip={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
            icon="⌨️"
            accessibilityLabel={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
            style={[
              styles.actionItem,
              { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
            ]}
            activeOpacity={0.7}
            onPress={() => setKeyboardVisible((v) => !v)}
          >
            <KeyboardIcon size={24} />
          </TooltipButton>
        </View>
      </View>

      {keyboardVisible && (
        <View style={styles.keyboardWrapper}>
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
      />

      {/* Reveal clue confirmation — buka clue 2 lalu 3, potong XP sekali */}
      <ConfirmDialog
        visible={showRevealClueConfirm}
        title={`Buka Petunjuk Ke-${nextClueToReveal}?`}
        message={`Membuka petunjuk ke-${nextClueToReveal} akan mengurangi XP sebesar ${
          nextClueToReveal === 2 ? XP_PENALTY_CLUE_2 : XP_PENALTY_CLUE_3
        }. Lanjutkan?`}
        confirmText="Ya, Buka"
        cancelText="Batal"
        onConfirm={confirmRevealClue}
        onCancel={() => setShowRevealClueConfirm(false)}
        variant="danger"
        emoji={nextClueToReveal === 2 ? "📖" : "🔤"}
      />

      {/* Reveal letter confirmation */}
      <ConfirmDialog
        visible={showRevealLetterConfirm}
        title="Buka Satu Huruf?"
        message={`Menggunakan fitur ini akan mengurangi XP sebesar ${XP_PENALTY_REVEAL}. Lanjutkan?`}
        confirmText="Ya, Buka"
        cancelText="Batal"
        onConfirm={() => {
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
        message={`Menggunakan fitur ini akan mengurangi XP sebesar ${XP_PENALTY_REVEAL} dan kata yang terbuka tidak akan mendapat XP. Lanjutkan?`}
        confirmText="Ya, Buka Semua"
        cancelText="Batal"
        onConfirm={() => {
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
    </View>
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
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  backBtnText: { fontSize: 18, fontWeight: "600", lineHeight: 32, textAlign: "center" },
  appTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  xpPillText: { fontSize: 12, fontWeight: "700" },
  rstBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  rstBtnText: { fontSize: 16 },
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
  zoomGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  zoomBtnSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  zoomResetBtn: { height: 32, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, justifyContent: "center", alignItems: "center" },
  zoomLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "center" },
  actionDivider: { width: 1, height: 24, marginHorizontal: 8 },
  revealGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  gridOuterWrapper: { marginBottom: 8, borderRadius: 12 },
  gridOuterCentered: { flexGrow: 1, justifyContent: "center" },
  gridScroll: { flexGrow: 0 },
  gridScrollContent: { flexGrow: 0 },
  gridCenterWrapper: { alignItems: "center", paddingHorizontal: 4, paddingVertical: 8 },
  bottomPanels: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  cluePill: { flexDirection: "row", alignItems: "center", borderRadius: 24, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8, position: "relative", overflow: "hidden" },
  cluePillProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  cluePillProgressFill: { height: "100%", backgroundColor: "#FFD166" },
  clueArrow: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  clueSwitchBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    marginRight: 6,
  },
  clueDivider: { width: 1, height: 24, marginHorizontal: 6, borderRadius: 1 },
  clueContent: { flex: 1, paddingHorizontal: 2, minWidth: 0 },
  clueNumberBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", marginHorizontal: 2 },
  clueNumberText: { fontSize: 13, fontWeight: "800", color: "#0096cc" },
  clueTextWrap: { flex: 1 },
  clueOrientation: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  clueMain: { fontSize: 14, color: "#FFF", fontWeight: "600", lineHeight: 19 },
  actionBar: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  actionItem: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 18 },
  clueLabelText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3, marginRight: 4 },
  clueBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  clueBadgeText: { fontSize: 9, fontWeight: "800" },
  keyboardWrapper: {},
});
