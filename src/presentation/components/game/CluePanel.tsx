import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { useGameStore } from "../../stores/gameStore";
import type { BoardWord } from "../../../domain/entities/board";

interface CluePanelProps {
  word: BoardWord | null;
  wordIndex: number | null;
}

export default function CluePanel({ word, wordIndex }: CluePanelProps) {
  const { theme } = useTheme();
  const hints = useGameStore((s) => s.hints);
  const useClue2 = useGameStore((s) => s.useClue2);
  const useClue3 = useGameStore((s) => s.useClue3);
  const revealLetter = useGameStore((s) => s.revealLetter);

  if (!word || wordIndex === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Pilih kata di papan untuk melihat petunjuk
        </Text>
      </View>
    );
  }

  const hint = hints[wordIndex];
  const showClue2 = hint?.clue2Used;
  const showClue3 = hint?.clue3Used;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.wordDisplay, { color: theme.colors.text }]}>
        {word.word.length} huruf — {word.orientation === "horizontal" ? "Mendatar" : "Menurun"}
      </Text>

      {/* Clue 1 — always visible */}
      <View style={styles.clueRow}>
        <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>1</Text>
        <Text style={[styles.clueText, { color: theme.colors.text }]}>{word.clue_1}</Text>
      </View>

      {/* Clue 2 — unlockable */}
      {showClue2 ? (
        <View style={styles.clueRow}>
          <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>2</Text>
          <Text style={[styles.clueText, { color: theme.colors.text }]}>{word.clue_2 ?? "—"}</Text>
        </View>
      ) : word.clue_2 ? (
        <TouchableOpacity
          style={[styles.hintBtn, { borderColor: theme.colors.border }]}
          activeOpacity={0.6}
          onPress={() => useClue2(wordIndex)}
        >
          <Text style={[styles.hintBtnText, { color: theme.colors.primary }]}>
            Buka Petunjuk 2 (-50 XP)
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Clue 3 — unlockable */}
      {showClue3 ? (
        <View style={styles.clueRow}>
          <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>3</Text>
          <Text style={[styles.clueText, { color: theme.colors.text }]}>{word.clue_3 ?? "—"}</Text>
        </View>
      ) : word.clue_3 ? (
        <TouchableOpacity
          style={[styles.hintBtn, { borderColor: theme.colors.border }]}
          activeOpacity={0.6}
          onPress={() => useClue3(wordIndex)}
        >
          <Text style={[styles.hintBtnText, { color: theme.colors.primary }]}>
            Buka Petunjuk 3 (-100 XP)
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Reveal letter */}
      <TouchableOpacity
        style={[styles.hintBtn, { borderColor: theme.colors.border }]}
        activeOpacity={0.6}
        onPress={() => revealLetter(wordIndex)}
      >
        <Text style={[styles.hintBtnText, { color: theme.colors.primary }]}>
          Buka Huruf (-75 XP)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  emptyText: { textAlign: "center", fontSize: 13, fontStyle: "italic" },
  wordDisplay: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  clueRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  clueLabel: { fontSize: 12, fontWeight: "800", minWidth: 16, lineHeight: 18 },
  clueText: { fontSize: 13, lineHeight: 18, flex: 1 },
  hintBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  hintBtnText: { fontSize: 12, fontWeight: "600" },
});
