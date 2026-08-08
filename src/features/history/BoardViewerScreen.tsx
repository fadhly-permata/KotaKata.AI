import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { boardRepository } from "../../data/repositories/boardRepository";
import { TIER_NAMES } from "../../domain/usecases/xpEngine";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

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

/**
 * Snapshot board selesai hanya menyimpan kata-kata (word, posisi, orientasi,
 * clue) — tidak menyimpan sel isBlocked maupun nomor clue. Keduanya bisa
 * diturunkan: sel yang tidak dilalui kata mana pun = sel hitam (blocked),
 * dan sel yang menjadi awal kata = nomor clue. Ini membuat papan terlihat
 * persis seperti crossword asli, bukan kumpulan huruf acak.
 */
interface Cell {
  letter: string;
  isBlocked: boolean;
  number?: number;
}

function parseLayout(json: string): FinishedLayout | null {
  try {
    const parsed = JSON.parse(json) as FinishedLayout;
    if (!parsed || !Array.isArray(parsed.words) || typeof parsed.size !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildGrid(layout: FinishedLayout): Cell[][] {
  const size = layout.size;
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: "", isBlocked: true })),
  );
  for (const w of layout.words) {
    const dr = w.orientation === "vertical" ? 1 : 0;
    const dc = w.orientation === "horizontal" ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      const row = w.startRow + dr * i;
      const col = w.startCol + dc * i;
      if (row < 0 || row >= size || col < 0 || col >= size) continue;
      const cell = grid[row][col];
      cell.letter = w.word[i].toUpperCase();
      cell.isBlocked = false;
    }
  }

  // Nomor clue: scan baris lalu kolom (aturan sama dengan buildBoard di
  // crosswordGenerator) — sel yang mulai kata dapat nomor urut.
  let number = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].isBlocked) continue;
      const isHorizontalStart =
        (c === 0 || grid[r][c - 1].isBlocked) && c + 1 < size && !grid[r][c + 1].isBlocked;
      const isVerticalStart =
        (r === 0 || grid[r - 1][c].isBlocked) && r + 1 < size && !grid[r + 1][c].isBlocked;
      if (isHorizontalStart || isVerticalStart) {
        grid[r][c].number = number++;
      }
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
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

            {/* ─── Grid read-only — sel hitam (blocked) + huruf + nomor clue ─── */}
            <View
              style={[
                styles.grid,
                {
                  width: cellSize * layout.size,
                  backgroundColor: theme.colors.border,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {grid.map((row, r) =>
                row.map((cell, c) =>
                  cell.isBlocked ? (
                    <View
                      key={`${r}-${c}`}
                      style={[
                        styles.cell,
                        styles.blockedCell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: theme.colors.cellBlocked,
                        },
                      ]}
                    />
                  ) : (
                    <View
                      key={`${r}-${c}`}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: theme.colors.cellActive,
                        },
                      ]}
                    >
                      {cell.number != null && (
                        <Text
                          style={[
                            styles.cellNumber,
                            { color: theme.colors.textSecondary, fontSize: Math.max(7, fontSize * 0.4) },
                          ]}
                        >
                          {cell.number}
                        </Text>
                      )}
                      <Text style={[styles.cellLetter, { color: theme.colors.text, fontSize }]}>
                        {cell.letter}
                      </Text>
                    </View>
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
    </ScreenFade>
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
    gap: 1,
    padding: 1,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  blockedCell: {},
  cellNumber: { position: "absolute", top: 1, left: 2, fontWeight: "600" },
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
