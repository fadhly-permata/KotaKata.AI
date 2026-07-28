import { useEffect, useMemo, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity, Animated, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CluePanel from "../../presentation/components/game/CluePanel";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { isWordComplete } from "../../domain/usecases/wordValidator";
import { calcTier, TIER_NAMES } from "../../domain/usecases/xpEngine";
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

export default function GameScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
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

  // Generate board on mount
  useEffect(() => {
    if (!board) {
      const generated = generateBoard(DEMO_WORDS, 10);
      setBoard(generated);
    }
  }, []);

  // Auto-detect completed words
  const prevFilledRef = useRef(filledLetters);
  useEffect(() => {
    if (!board || boardResult) return;

    const prev = prevFilledRef.current;
    prevFilledRef.current = filledLetters;

    for (let i = 0; i < board.words.length; i++) {
      const word = board.words[i];
      if (word.solved) continue;
      if (isWordComplete(word, filledLetters)) {
        markWordSolved(i);
        loggerInfo(`Word ${i} completed: ${word.word}`);
      }
    }
  }, [filledLetters, board, boardResult, markWordSolved]);

  const currentTier = useMemo(() => calcTier(totalXp), [totalXp]);
  const tierName = useMemo(() => TIER_NAMES[Math.max(0, currentTier - 1)], [currentTier]);

  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

  // Keyboard nav (desktop/web)
  useEffect(() => {
    if (Platform.OS !== "web") return;
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
  }, [navigateToCell, inputLetter]);

  if (!board) return null;

  if (boardResult) {
    return <CompletionOverlay result={boardResult} onPlayAgain={reset} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top bar with back button */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.6}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>
            ← Kembali
          </Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.colors.text }]}>KotaKata</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Tier info bar */}
      <View style={[styles.tierBar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.tierText, { color: theme.colors.textSecondary }]}>
          Tier {currentTier}: {tierName}
        </Text>
        <Text style={[styles.xpText, { color: theme.colors.primary }]}>
          +{currentXp} XP
        </Text>
      </View>

      <View style={styles.gridWrapper}>
        <CrosswordGrid
          board={board}
          selectedCell={selectedCell}
          selectedWordIndex={selectedWordIndex}
          inputOrientation={inputOrientation}
          onCellPress={selectCell}
          onToggleOrientation={() => useGameStore.getState().toggleOrientation()}
          filledLetters={new Map(Object.entries(filledLetters))}
        />
      </View>

      <CluePanel word={selectedWord} wordIndex={selectedWordIndex} />

      <View style={styles.keyboardWrapper}>
        <InGameKeyboard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    width: 70,
  },
  backBtnText: { fontSize: 14, fontWeight: "600" },
  topBarTitle: { fontSize: 15, fontWeight: "700" },
  tierBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tierText: { fontSize: 12, fontWeight: "600" },
  xpText: { fontSize: 12, fontWeight: "700" },
  gridWrapper: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  keyboardWrapper: { paddingTop: 4 },
});
