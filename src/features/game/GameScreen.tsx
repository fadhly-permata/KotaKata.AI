import { useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import CrosswordGrid from "../../presentation/components/game/CrosswordGrid";
import InGameKeyboard from "../../presentation/components/game/InGameKeyboard";
import CluePanel from "../../presentation/components/game/CluePanel";
import { useGameStore } from "../../presentation/stores/gameStore";
import { generateBoard } from "../../domain/usecases/crosswordGenerator";
import { validateAllWords, isBoardComplete } from "../../domain/usecases/wordValidator";
import type { WordCandidate } from "../../domain/entities/board";

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
  const board = useGameStore((s) => s.board);
  const setBoard = useGameStore((s) => s.setBoard);
  const selectedCell = useGameStore((s) => s.selectedCell);
  const selectedWordIndex = useGameStore((s) => s.selectedWordIndex);
  const inputOrientation = useGameStore((s) => s.inputOrientation);
  const selectCell = useGameStore((s) => s.selectCell);
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputLetter = useGameStore((s) => s.inputLetter);
  const filledLetters = useGameStore((s) => s.filledLetters);

  // Generate board on mount
  useEffect(() => {
    if (!board) {
      const generated = generateBoard(DEMO_WORDS, 10);
      setBoard(generated);
    }
  }, []);

  // Selected word from the board
  const selectedWord = useMemo(() => {
    if (selectedWordIndex === null || !board) return null;
    return board.words[selectedWordIndex] ?? null;
  }, [selectedWordIndex, board]);

  // Word validation results
  const validationResults = useMemo(() => {
    if (!board) return [];
    return validateAllWords(board, filledLetters);
  }, [board, filledLetters]);

  const boardComplete = useMemo(() => {
    if (!board) return false;
    return isBoardComplete(board, filledLetters);
  }, [board, filledLetters, validationResults]);

  // Keyboard navigation (desktop/web)
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      {boardComplete && (
        <View style={[styles.completeBadge]}>
          <Text style={[styles.completeText, { color: theme.colors.primary }]}>
            ✅ Semua kata terpecahkan!
          </Text>
        </View>
      )}

      <View style={styles.keyboardWrapper}>
        <InGameKeyboard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gridWrapper: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  keyboardWrapper: { paddingTop: 4 },
  completeBadge: { alignItems: "center", paddingVertical: 4 },
  completeText: { fontSize: 14, fontWeight: "700" },
});
