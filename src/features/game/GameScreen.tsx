import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Platform, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CompletionOverlay from "../../presentation/components/game/CompletionOverlay";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { isWordComplete, validateWord } from "../../domain/usecases/wordValidator";
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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  // Auto-detect physical keyboard on mount: desktop/laptop → hide, mobile → show
  const [keyboardVisible, setKeyboardVisible] = useState(
    Platform.OS !== "web" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const pendingNavAction = useRef<any>(null);

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

  // Block back navigation when game is in progress
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

  // Generate board on mount
  useEffect(() => {
    if (!board) {
      const generated = generateBoard(DEMO_WORDS, 10);
      setBoard(generated);
    }
  }, []);

  // Auto-detect correctly completed words
  const prevFilledRef = useRef(filledLetters);
  useEffect(() => {
    if (!board || boardResult) return;

    const prev = prevFilledRef.current;
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

  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

  // Keyboard nav (desktop/web) + auto-detect physical keyboard
  const hasPhysicalKeyboard = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "web" || !board) return;

    // 1) Use Keyboard API to detect physical keyboard (incl. Bluetooth)
    if ("keyboard" in navigator) {
      (navigator as any).keyboard
        .getLayoutMap()
        .then((layout: any) => {
          if (layout && layout.size > 0) {
            hasPhysicalKeyboard.current = true;
            setKeyboardVisible(false);
          }
        })
        .catch(() => {});
    }

    // 2) Fallback: detect on first physical keypress
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

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [board, navigateToCell, inputLetter]);

  if (!board) return null;

  if (boardResult) {
    return <CompletionOverlay result={boardResult} onPlayAgain={reset} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      {/* Compact toolbar: ◀ 🔍 ▶ clue_text 🎹 */}
      <View style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity activeOpacity={0.5} onPress={goToPrevWord} style={styles.toolBtn}>
          <Text style={[styles.toolBtnText, { color: theme.colors.primary }]}>◀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => selectedWordIndex !== null && revealLetter(selectedWordIndex)}
          style={[styles.toolBtn, { borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 6 }]}
        >
          <Text style={styles.toolIcon}>🔍</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.5} onPress={goToNextWord} style={styles.toolBtn}>
          <Text style={[styles.toolBtnText, { color: theme.colors.primary }]}>▶</Text>
        </TouchableOpacity>

        {/* Clue text — flexible, truncated */}
        <View style={styles.clueArea}>
          <Text
            style={[styles.clueText, { color: theme.colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedWord
              ? `${selectedWord.clue_1}`
              : "Ketuk kata di papan"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => setKeyboardVisible((v) => !v)}
          style={[styles.toolBtn, { opacity: keyboardVisible ? 1 : 0.5 }]}
        >
          <Text style={styles.toolIcon}>⌨️</Text>
        </TouchableOpacity>
      </View>

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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  toolBtn: {
    width: 34,
    height: 30,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  toolBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  toolIcon: {
    fontSize: 16,
  },
  clueArea: {
    flex: 1,
    paddingHorizontal: 4,
  },
  clueText: {
    fontSize: 12,
    lineHeight: 16,
  },
  keyboardWrapper: { paddingTop: 4 },
});
