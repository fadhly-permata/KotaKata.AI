import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { boardRepository } from "../../data/repositories/boardRepository";
import { TIER_NAMES } from "../../domain/usecases/xpEngine";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "BoardViewer">;

/** Word snapshot di layout_data board selesai (bentuk dari GameScreen). */
interface FinishedWord {
  word: string;
  word_id?: string | null;
  clue_1: string;
  clue_2?: string | null;
  clue_3?: string | null;
  orientation: "horizontal" | "vertical";
  startRow: number;
  startCol: number;
}

interface FinishedLayout {
  words: FinishedWord[];
  size: number;
  tierLevel: number;
}

type Cell = { letter: string } | null;

function parseLayout(json: string): FinishedLayout | null {
  try {
    const parsed = JSON.parse(json) as FinishedLayout;
    if (!parsed || !Array.isArray(parsed.words) || typeof parsed.size !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Bangun grid huruf dari snapshot kata-kata (papan selesai, semua terisi). */
function buildGrid(layout: FinishedLayout): Cell[][] {
  const size = layout.size;
  const grid: Cell[][] = Array.from({ length: size }, () => Array<Cell>(size).fill(null));
  for (const w of layout.words) {
    const dr = w.orientation === "vertical" ? 1 : 0;
    const dc = w.orientation === "horizontal" ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      const row = w.startRow + dr * i;
      const col = w.startCol + dc * i;
      if (row < 0 || row >= size || col < 0 || col >= size) continue;
      grid[row][col] = { letter: w.word[i].toUpperCase() };
    }
  }
  return grid;
}

export default function BoardViewerScreen({ route }: Props) {
  const { theme } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const [layout, setLayout] = useState<FinishedLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tierAtGeneration, setTierAtGeneration] = useState(1);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const board = await boardRepository.getById(route.params.boardId);
      if (!board) {
        setError(true);
        return;
      }
      const parsed = parseLayout(board.layout_data);
      setLayout(parsed);
      setTierAtGeneration(board.tier_at_generation);
      setUpdatedAt(board.updated_at);
      if (!parsed) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [route.params.boardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grid = layout ? buildGrid(layout) : [];
  const cellSize = layout ? Math.floor(Math.min(winWidth - 64, 420) / layout.size) : 0;
  const fontSize = Math.max(11, Math.floor(cellSize * 0.45));

  const tierName =
    TIER_NAMES[Math.max(0, Math.min(tierAtGeneration - 1, TIER_NAMES.length - 1))];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loading} />
        ) : error || !layout ? (
          <Text style={[styles.error, { color: theme.colors.textSecondary }]}>
            Papan tidak ditemukan atau tidak bisa dibaca.
          </Text>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.colors.text }]}>Papan Selesai</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Tier {tierAtGeneration} — {tierName} · {layout.size}×{layout.size}
            </Text>

            {/* ─── Grid read-only ─── */}
            <View
              style={[
                styles.grid,
                {
                  width: cellSize * layout.size,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {grid.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <View
                      key={`${r}-${c}`}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.secondaryContainer,
                        },
                      ]}
                    >
                      <Text style={[styles.cellLetter, { color: theme.colors.text, fontSize }]}>
                        {cell.letter}
                      </Text>
                    </View>
                  ) : (
                    <View
                      key={`${r}-${c}`}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        },
                      ]}
                    />
                  ),
                ),
              )}
            </View>

            {/* ─── Daftar kata ─── */}
            <Text style={[styles.clueTitle, { color: theme.colors.text }]}>Kata di papan ini</Text>
            <View style={styles.clueList}>
              {layout.words.map((w, i) => (
                <View
                  key={i}
                  style={[styles.clueItem, { backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.clueWord, { color: theme.colors.primary }]}>{w.word}</Text>
                  <Text style={[styles.clueText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {w.orientation === "horizontal" ? "Mendatar" : "Menurun"} — {w.clue_1}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.updatedAt, { color: theme.colors.textSecondary }]}>
              Selesai {new Date(updatedAt).toLocaleString()}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, alignItems: "center" },
  loading: { marginTop: 40 },
  error: { fontSize: 14, textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontWeight: "500", marginTop: -6 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
  },
  cell: {
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cellLetter: { fontWeight: "800" },
  clueTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clueList: { width: "100%", gap: 8 },
  clueItem: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clueWord: { fontSize: 15, fontWeight: "800", minWidth: 64 },
  clueText: { flex: 1, fontSize: 13, lineHeight: 18 },
  updatedAt: { fontSize: 11, fontStyle: "italic", marginTop: 4 },
});
