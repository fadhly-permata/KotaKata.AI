import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { isWordComplete, validateWord } from "../../domain/usecases/wordValidator";
import { calcTier, calcTierProgress, TIER_NAMES } from "../../domain/usecases/xpEngine";
import type { WordCandidate } from "../../domain/entities/board";
import { loggerInfo } from "../../utils/logger";

const DEMO_WORDS: WordCandidate[] = [
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

export default function GameScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(
    Platform.OS !== "web" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const pendingNavAction = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevSelectedCell = useRef<{ row: number; col: number } | null>(null);

  const board = useGameStore((s) => s.board);
  const setBoard = useGameStore((s) => s.setBoard);
  const selectedCell = useGameStore((s) => s.selectedCell);
  const selectedWordIndex = useGameStore((s) => s.selectedWordIndex);
  const inputOrientation = useGameStore((s) => s.inputOrientation);
  const selectCell = useGameStore((s) => s.selectCell);
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputLetter = useGameStore((s) => s.inputLetter);
  const filledLetters = useGameStore((s) => s.filledLetters);
  const wordsSolved = useGameStore((s) => s.wordsSolved);
  const currentXp = useGameStore((s) => s.currentXp);
  const totalXp = useGameStore((s) => s.totalXp);
  const boardResult = useGameStore((s) => s.boardResult);
  const markWordSolved = useGameStore((s) => s.markWordSolved);
  const reset = useGameStore((s) => s.reset);
  const goToPrevWord = useGameStore((s) => s.goToPrevWord);
  const goToNextWord = useGameStore((s) => s.goToNextWord);
  const revealLetter = useGameStore((s) => s.revealLetter);
  const useClue2 = useGameStore((s) => s.useClue2);
  const useClue3 = useGameStore((s) => s.useClue3);

  // Auto-center focused cell
  const scrollToFocusedCell = useCallback(() => {
    if (!selectedCell || !scrollViewRef.current || !board) return;
    if (prevSelectedCell.current?.row === selectedCell.row && prevSelectedCell.current?.col === selectedCell.col) return;
    prevSelectedCell.current = selectedCell;

    const { width: screenWidth } = Dimensions.get("window");
    const baseCellSize = Math.floor((screenWidth - 16) / board.size);
    const cellSize = Math.floor(baseCellSize * zoomLevel);
    const gap = 3;
    const padding = 3;

    const cellCenterX = padding + selectedCell.col * (cellSize + gap) + cellSize / 2;
    const cellCenterY = padding + selectedCell.row * (cellSize + gap) + cellSize / 2;

    const gridWidth = cellSize * board.size + padding * 2;
    const viewportWidth = screenWidth;

    const scrollX = Math.max(0, Math.min(cellCenterX - viewportWidth / 2, gridWidth - viewportWidth));
    const scrollY = Math.max(0, cellCenterY - 150);

    scrollViewRef.current.scrollTo({ x: scrollX, y: scrollY, animated: true });
  }, [selectedCell, zoomLevel, board]);

  useEffect(() => {
    if (zoomLevel > 1) {
      const timeout = setTimeout(scrollToFocusedCell, 150);
      return () => clearTimeout(timeout);
    }
  }, [selectedCell, zoomLevel, scrollToFocusedCell]);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (!board || boardResult) return;
      e.preventDefault();
      pendingNavAction.current = e.data.action;
      setShowQuitConfirm(true);
    });
    return unsubscribe;
  }, [navigation, board, boardResult]);

  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    reset();
    if (pendingNavAction.current) {
      navigation.dispatch(pendingNavAction.current);
      pendingNavAction.current = null;
    }
  }, [navigation, reset]);

  const handleCancelQuit = useCallback(() => {
    setShowQuitConfirm(false);
    pendingNavAction.current = null;
  }, []);

  useEffect(() => {
    if (!board) {
      const generated = generateBoard(DEMO_WORDS, 10);
      setBoard(generated);
    }
  }, []);

  const prevFilledRef = useRef(filledLetters);
  useEffect(() => {
    if (!board || boardResult) return;
    prevFilledRef.current = filledLetters;
    for (let i = 0; i < board.words.length; i++) {
      const word = board.words[i];
      if (word.solved) continue;
      if (!isWordComplete(word, filledLetters)) continue;
      const result = validateWord(word, i, filledLetters);
      if (result.isCorrect) {
        markWordSolved(i);
        loggerInfo(`Word ${i} CORRECT: ${word.word}`);
      }
    }
  }, [filledLetters, board, boardResult, markWordSolved]);

  const currentTier = useMemo(() => calcTier(totalXp), [totalXp]);
  const tierName = useMemo(() => TIER_NAMES[Math.max(0, currentTier - 1)], [currentTier]);
  const tierProgress = useMemo(() => calcTierProgress(totalXp), [totalXp]);

  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

  const hasPhysicalKeyboard = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "web" || !board) return;
    if ("keyboard" in navigator) {
      (navigator as any).keyboard.getLayoutMap().then((layout: any) => {
        if (layout && layout.size > 0) {
          hasPhysicalKeyboard.current = true;
          setKeyboardVisible(false);
        }
      }).catch(() => {});
    }
    const handleKey = (e: KeyboardEvent) => {
      if (!hasPhysicalKeyboard.current && /^[a-zA-Z0-9]$/.test(e.key)) {
        hasPhysicalKeyboard.current = true;
        setKeyboardVisible(false);
      }
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

  if (!board) return null;
  if (boardResult) {
    return <CompletionOverlay result={boardResult} onPlayAgain={reset} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
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
            <View style={[styles.avatar, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>K</Text>
            </View>
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
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.iconBtnText}>🔀</Text>
            </TouchableOpacity>
            <View style={[styles.progressRing, { borderColor: theme.colors.border }]}>
              <View style={[styles.progressRingFill, { borderColor: theme.colors.primary }]} />
              <Text style={[styles.progressText, { color: theme.colors.primary }]}>
                {Math.round(tierProgress * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Crossword Grid (Scrollable + Zoomable) */}
        <View style={styles.gridOuterWrapper}>
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
                onCellPress={selectCell}
                onToggleOrientation={() => useGameStore.getState().toggleOrientation()}
                filledLetters={new Map(Object.entries(filledLetters))}
                zoomLevel={zoomLevel}
              />
            </View>
          </ScrollView>
        </View>

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
              <Text style={styles.clueMain} numberOfLines={1}>
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
              onPress={() => selectedWordIndex !== null && revealLetter(selectedWordIndex)}
            >
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => selectedWordIndex !== null && useClue2(selectedWordIndex)}
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
      </ScrollView>

      {keyboardVisible && (
        <View style={styles.keyboardWrapper}>
          <InGameKeyboard />
        </View>
      )}

      <ConfirmDialog
        visible={showQuitConfirm}
        title="Keluar Permainan?"
        message="Progres permainan saat ini akan hilang jika kamu keluar. Apa kamu yakin?"
        confirmText="Ya, Keluar"
        cancelText="Lanjut Main"
        onConfirm={handleConfirmQuit}
        onCancel={handleCancelQuit}
        variant="danger"
        emoji="🚪"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  backBtnText: { fontSize: 18, fontWeight: "600", lineHeight: 32, textAlign: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "800" },
  appTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  xpPillText: { fontSize: 12, fontWeight: "700" },
  levelCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 8 },
  levelInfo: { gap: 2 },
  levelLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  levelName: { fontSize: 18, fontWeight: "800" },
  levelActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  iconBtnText: { fontSize: 16 },
  progressRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  progressRingFill: { position: "absolute", width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderLeftColor: "transparent", borderBottomColor: "transparent", transform: [{ rotate: "-90deg" }] },
  progressText: { fontSize: 10, fontWeight: "800" },
  zoomGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  zoomBtnSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  zoomBtnSmallText: { fontSize: 18, fontWeight: "700", lineHeight: 32, textAlign: "center" },
  zoomLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "center" },
  actionDivider: { width: 1, height: 24, marginHorizontal: 8 },
  revealGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  gridOuterWrapper: { marginBottom: 8, overflow: "hidden", borderRadius: 12 },
  gridScroll: { flexGrow: 0 },
  gridScrollContent: { flexGrow: 0 },
  gridCenterWrapper: { alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 4 },
  cluePill: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 10 },
  clueArrow: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  clueArrowText: { fontSize: 24, color: "#FFF", fontWeight: "300" },
  clueContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },
  clueNumberBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  clueNumberText: { fontSize: 14, fontWeight: "800", color: "#0096cc" },
  clueTextWrap: { flex: 1 },
  clueOrientation: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  clueMain: { fontSize: 14, color: "#FFF", fontWeight: "600" },
  actionBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  actionItem: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 18 },
  keyboardWrapper: {},
});
