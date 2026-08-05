import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity, ScrollView, Dimensions, Animated, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { selectWordPool } from "../../domain/usecases/wordPoolFilter";
import { ensureVocabularySeeded, initDatabase } from "../../data/sources/database";
import { supabase } from "../../data/sources/supabase";
import { triggerBoardCompletionSync } from "../../data/sources/syncEngine";
import { useAuth } from "../auth/useAuth";
import { displayNameFromMetadata } from "../../utils/userMetadata";
import UserAvatar from "../../presentation/components/common/UserAvatar";
import { boardRepository } from "../../data/repositories/boardRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { userRepository } from "../../data/repositories/userRepository";
import { isWordComplete, validateWord } from "../../domain/usecases/wordValidator";
import { calcTier, calcTierProgress, TIER_NAMES, XP_PENALTY_REVEAL } from "../../domain/usecases/xpEngine";
import type { WordCandidate } from "../../domain/entities/board";
import { loggerInfo } from "../../utils/logger";
import {
  serializeBoardProgress,
  deserializeBoardProgress,
  IN_PROGRESS_BOARD_ID,
} from "../../utils/boardProgress";

// Only used as a last-resort fallback if the local DB is unavailable.
const FALLBACK_WORDS: WordCandidate[] = [
  { word: "REACT", clue_1: "Library JavaScript buat UI", clue_2: "Dibuat oleh Meta", clue_3: "Framework frontend populer", tier_level: 1 },
  { word: "KOTAK", clue_1: "Bentuk segi empat", clue_2: "Benda berbentuk kubus", clue_3: "Kardus berbentuk ini", tier_level: 1 },
  { word: "KATA", clue_1: "Unit bahasa", clue_2: "Gabungan huruf", clue_3: "Elemen dari kalimat", tier_level: 1 },
  { word: "TEKA", clue_1: "Teka-teki", clue_2: "Permainan asah otak", clue_3: "Sinonim dari puzzle", tier_level: 1 },
  { word: "AKU", clue_1: "Diri sendiri", clue_2: "Kata ganti orang pertama", clue_3: "Saya", tier_level: 1 },
  { word: "AIR", clue_1: "Cairan bening", clue_2: "Minuman pokok", clue_3: "H2O", tier_level: 1 },
  { word: "API", clue_1: "Panas membara", clue_2: "Sumber nyala", clue_3: "Fenomena pembakaran", tier_level: 1 },
  { word: "MATI", clue_1: "Tidak hidup", clue_2: "Akhir kehidupan", clue_3: "Lawan dari hidup", tier_level: 1 },
  { word: "TALI", clue_1: "Benda untuk mengikat", clue_2: "Terbuat dari serat", clue_3: "Tali", tier_level: 1 },
  { word: "RATA", clue_1: "Permukaan datar", clue_2: "Tidak bergelombang", clue_3: "Datar", tier_level: 1 },
  { word: "KERA", clue_1: "Hewan primata", clue_2: "Monyet ekor panjang", clue_3: "Hewan lucu", tier_level: 1 },
  { word: "BUKU", clue_1: "Benda yang dibaca", clue_2: "Kumpulan kertas", clue_3: "Teman belajar", tier_level: 1 },
  { word: "RUMUS", clue_1: "Formula matematika", clue_2: "Pola perhitungan", clue_3: "Biasa ada di fisika", tier_level: 1 },
];

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardAutoShown = useRef(false);
  const pendingNavAction = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const prevZoomLevel = useRef(1);
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
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputLetter = useGameStore((s) => s.inputLetter);
  const filledLetters = useGameStore((s) => s.filledLetters);
  const hints = useGameStore((s) => s.hints);
  const wordsSolved = useGameStore((s) => s.wordsSolved);
  const currentXp = useGameStore((s) => s.currentXp);
  const totalXp = useGameStore((s) => s.totalXp);
  const boardResult = useGameStore((s) => s.boardResult);
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
      e.preventDefault();
      pendingNavAction.current = e.data.action;
      setShowQuitConfirm(true);
    });
    return unsubscribe;
  }, [navigation, board, boardResult]);

  // Simpan snapshot progres board yang sedang berjalan (belum selesai) ke
  // RxDB + Supabase, supaya bisa di-resume dari "Mulai Bermain".
  const saveInProgress = useCallback(async () => {
    const store = useGameStore.getState();
    if (!store.board) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await initDatabase();
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

    // Rekam kata-kata yang sudah terjawab di board ini ke riwayat penemuan
    // (dedup), supaya "Sejarah Saya" menampilkan semua kata yang sudah
    // dijawab — bukan cuma yang board-nya sampai selesai.
    const now = new Date().toISOString();
    for (const word of store.board.words) {
      if (!word.solved || !word.word_id) continue;
      const existing = await wordDiscoveryRepository.getByUserAndWord(user.id, word.word_id);
      if (existing) continue;
      await wordDiscoveryRepository.add({
        discovery_id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${word.word_id}`,
        user_id: user.id,
        word_id: word.word_id,
        discovered_at: now,
      });
    }

    await triggerBoardCompletionSync();
  }, []);

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

  // Load a fresh board from the vocabulary database (seeded from VOCABULARY_SEED).
  // Kalau ada board in-progress yang tersimpan, resume dulu dari sana.
  useEffect(() => {
    if (board) return;
    let cancelled = false;

    (async () => {
      try {
        // 1) Init local DB + seed vocabulary on first run
        await ensureVocabularySeeded();

        // 2) Coba resume board in-progress milik user ini
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

        // 3) Tidak ada progres tersimpan — generate papan baru sesuai tier.
        //    Kata yang sudah pernah ditemukan dikecualikan biar soal selalu fresh.
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
        loggerInfo("DB board generation failed — falling back to demo words", err);
        if (!cancelled) setBoard(generateBoard(FALLBACK_WORDS, 10, 1));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [board, setBoard, resumeProgress]);

  // Auto-solve check — skip words that were fully revealed (no XP for revealed words)
  const prevFilledRef = useRef(filledLetters);
  useEffect(() => {
    if (!board || boardResult) return;
    prevFilledRef.current = filledLetters;
    for (let i = 0; i < board.words.length; i++) {
      const word = board.words[i];
      if (word.solved) continue;
      if (!isWordComplete(word, filledLetters)) continue;

      // Skip words that were fully revealed — user used hints, no XP gain
      const hint = hints[String(i)];
      if (hint?.revealedCells?.length) {
        const allNonLocked = word.cells.filter((c) => !c.isLocked);
        const allRevealed = allNonLocked.every(
          (c) => hint.revealedCells.includes(`${c.row},${c.col}`)
        );
        if (allRevealed) {
          loggerInfo(`Word ${i} fully revealed — skipping auto-solve`);
          continue;
        }
      }

      const result = validateWord(word, i, filledLetters);
      if (result.isCorrect) {
        markWordSolved(i);
        loggerInfo(`Word ${i} CORRECT: ${word.word}`);
      }
    }
  }, [filledLetters, board, boardResult, markWordSolved, hints]);

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
        await initDatabase();

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
        //    Hanya kata dari vocabulary asli (punya word_id) — kata fallback demo
        //    tidak ada di tabel vocabulary, jadi tidak dicatat.
        for (const word of board.words) {
          if (!word.solved) continue;
          if (!word.word_id) continue;
          const existing = await wordDiscoveryRepository.getByUserAndWord(user.id, word.word_id);
          if (existing) continue;
          await wordDiscoveryRepository.add({
            discovery_id: `disc-${Date.now()}-${rand}-${word.word_id}`,
            user_id: user.id,
            word_id: word.word_id,
            discovered_at: now,
          });
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

        // 4) Push ke Supabase
        await triggerBoardCompletionSync();
      } catch (err) {
        loggerInfo("Gagal menyimpan hasil board", err);
      }
    })();
  }, [board, boardResult]);

  const currentTier = useMemo(() => calcTier(totalXp + currentXp), [totalXp, currentXp]);
  const tierName = useMemo(() => TIER_NAMES[Math.max(0, currentTier - 1)], [currentTier]);
  const tierProgress = useMemo(() => calcTierProgress(totalXp + currentXp), [totalXp, currentXp]);

  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

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
    return (
      <View style={[styles.container, styles.loadingWrap, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Menyusun papan kata…
        </Text>
      </View>
    );
  }
  if (boardResult) {
    return <CompletionOverlay result={boardResult} onPlayAgain={reset} />;
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
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backBtnText, { color: theme.colors.text }]}>‹</Text>
            </TouchableOpacity>
            <UserAvatar name={user?.displayName} avatarUrl={user?.avatarUrl} size={36} />
            <Text style={[styles.appTitle, { color: theme.colors.primary }]}>KotaKata AI</Text>
          </View>
          <View style={[styles.xpPill, { backgroundColor: "#ffd6ee" }]}>
            <Text style={[styles.xpPillText, { color: "#a02070" }]}>⭐ {totalXp + currentXp} XP</Text>
          </View>
        </View>

        {/* Level Info Card */}
        <View style={[styles.levelCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.levelInfo}>
            <Text style={[styles.levelLabel, { color: theme.colors.secondary }]}>LEVEL {currentTier}</Text>
            <Text style={[styles.levelName, { color: theme.colors.text }]}>{tierName}</Text>
          </View>
          <View style={styles.levelActions}>
            {/* Reset button — circular refresh icon */}
            <TouchableOpacity
              style={[styles.rstBtn, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => setShowResetConfirm(true)}
            >
              <Text style={[styles.rstBtnText, { color: theme.colors.secondary }]}>🔄</Text>
            </TouchableOpacity>
            {/* Progress ring — shows fill progress */}
            <View style={[styles.progressRing, { borderColor: theme.colors.border }]}>
              <View style={[styles.progressRingFill, { borderColor: theme.colors.primary }]} />
              <Text style={[styles.progressText, { color: theme.colors.primary }]}>
                {Math.round(fillProgress * 100)}%
              </Text>
            </View>
          </View>
        </View>

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
        {/* Clue Pill */}
        <View style={[styles.cluePill, { backgroundColor: "#0096cc" }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={goToPrevWord} style={styles.clueArrow}>
            <Text style={styles.clueArrowText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.clueContent}>
            <View style={styles.clueNumberBadge}>
              <Text style={styles.clueNumberText}>
                {selectedWord?.cells[0]?.number ?? "?"}
              </Text>
            </View>
            <View style={styles.clueTextWrap}>
              <Text style={styles.clueOrientation}>
                {selectedWord
                  ? `${selectedWord.orientation === "horizontal" ? "Mendatar" : "Menurun"} (${selectedWord.word.length} Huruf)`
                  : "Pilih kata di papan"}
              </Text>
              <Text style={styles.clueMain}>
                {selectedWord?.clue_1 ?? "Ketuk sel untuk memulai"}
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={goToNextWord} style={styles.clueArrow}>
            <Text style={styles.clueArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Action Bar + Zoom */}
        <View style={[styles.actionBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Zoom Controls (Left) */}
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={[styles.zoomBtnSmall, { backgroundColor: theme.colors.secondaryContainer, opacity: zoomLevel <= ZOOM_MIN ? 0.4 : 1 }]}
              activeOpacity={0.7}
              onPress={zoomOut}
              disabled={zoomLevel <= ZOOM_MIN}
            >
              <Text style={[styles.zoomBtnSmallText, { color: theme.colors.text }]}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={resetZoom}>
              <Text style={[styles.zoomLabel, { color: theme.colors.textSecondary }]}>{Math.round(zoomLevel * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomBtnSmall, { backgroundColor: theme.colors.secondaryContainer, opacity: zoomLevel >= ZOOM_MAX ? 0.4 : 1 }]}
              activeOpacity={0.7}
              onPress={zoomIn}
              disabled={zoomLevel >= ZOOM_MAX}
            >
              <Text style={[styles.zoomBtnSmallText, { color: theme.colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.actionDivider, { backgroundColor: theme.colors.border }]} />

          {/* Reveal Actions (Center) */}
          <View style={styles.revealGroup}>
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.7}
              onPress={() => selectedWordIndex !== null && setShowRevealLetterConfirm(true)}
            >
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => selectedWordIndex !== null && setShowRevealWordConfirm(true)}
            >
              <Text style={[styles.actionIcon, { color: theme.colors.secondary }]}>💡</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Keyboard Toggle (Right) */}
          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            onPress={() => setKeyboardVisible((v) => !v)}
          >
            <Text style={[styles.actionIcon, { opacity: keyboardVisible ? 1 : 0.4 }]}>⌨️</Text>
          </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600" },
  scrollContent: {},
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  backBtnText: { fontSize: 18, fontWeight: "600", lineHeight: 32, textAlign: "center" },
  appTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  xpPillText: { fontSize: 12, fontWeight: "700" },
  levelCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 4, padding: 14, borderRadius: 12, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 8 },
  levelInfo: { gap: 2 },
  levelLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  levelName: { fontSize: 18, fontWeight: "800" },
  levelActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  rstBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  rstBtnText: { fontSize: 16 },
  progressRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  progressRingFill: { position: "absolute", width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderLeftColor: "transparent", borderBottomColor: "transparent", transform: [{ rotate: "-90deg" }] },
  progressText: { fontSize: 10, fontWeight: "800" },
  zoomGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  zoomBtnSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  zoomBtnSmallText: { fontSize: 18, fontWeight: "700", lineHeight: 32, textAlign: "center" },
  zoomLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "center" },
  actionDivider: { width: 1, height: 24, marginHorizontal: 8 },
  revealGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  gridOuterWrapper: { marginBottom: 8, borderRadius: 12 },
  gridOuterCentered: { flexGrow: 1, justifyContent: "center" },
  gridScroll: { flexGrow: 0 },
  gridScrollContent: { flexGrow: 0 },
  gridCenterWrapper: { alignItems: "center", paddingHorizontal: 4, paddingVertical: 8 },
  bottomPanels: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  cluePill: { flexDirection: "row", alignItems: "center", borderRadius: 24, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8 },
  clueArrow: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  clueArrowText: { fontSize: 24, color: "#FFF", fontWeight: "300" },
  clueContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },
  clueNumberBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  clueNumberText: { fontSize: 14, fontWeight: "800", color: "#0096cc" },
  clueTextWrap: { flex: 1 },
  clueOrientation: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  clueMain: { fontSize: 14, color: "#FFF", fontWeight: "600", lineHeight: 19 },
  actionBar: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  actionItem: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 18 },
  keyboardWrapper: {},
});
