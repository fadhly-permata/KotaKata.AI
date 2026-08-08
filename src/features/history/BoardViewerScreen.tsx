import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from "react-native";
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

/** Kata + nomor cluenya (dipakai daftar soal, selaras dengan grid). */
interface NumberedWord {
  word: FinishedWord;
  number: number;
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

/** Beri nomor ke tiap kata sesuai nomor sel awal di grid (selaras dgn papan). */
function numberWords(layout: FinishedLayout, grid: Cell[][]): NumberedWord[] {
  return layout.words
    .map((w) => ({
      word: w,
      number: grid[w.startRow]?.[w.startCol]?.number ?? 0,
    }))
    .sort((a, b) => a.number - b.number || (a.word.orientation === b.word.orientation ? 0 : -1));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BoardViewerScreen({ route }: Props) {
  const { theme } = useTheme();
  const C = theme.colors;
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
  const numberedWords = layout ? numberWords(layout, grid) : [];
  const horizontals = numberedWords.filter((nw) => nw.word.orientation === "horizontal");
  const verticals = numberedWords.filter((nw) => nw.word.orientation === "vertical");

  // Ukuran sel dihitung MUNDUR dari lebar layar: kurangi dulu gap antar sel,
  // padding & border kontainer — supaya baris grid pas muat dan tidak meluber
  // (sel terakhir tidak lagi loncat ke baris berikutnya).
  const GAP = 1;
  const PAD = 2;
  const BORDER = 1;
  const maxGridWidth = Math.min(winWidth - 64, 420);
  const cellSize = layout
    ? Math.max(10, Math.floor((maxGridWidth - PAD * 2 - BORDER * 2 - GAP * (layout.size - 1)) / layout.size))
    : 0;
  const fontSize = Math.max(11, Math.floor(cellSize * 0.44));
  const gridWidth = layout ? cellSize * layout.size + GAP * (layout.size - 1) + PAD * 2 + BORDER * 2 : 0;

  const tierName =
    TIER_NAMES[Math.max(0, Math.min(tierAtGeneration - 1, TIER_NAMES.length - 1))];

  return (
    <ScreenFade style={[styles.container, { backgroundColor: C.background }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={C.primary} style={styles.loading} />
        ) : error || !layout ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorEmoji}>🧩</Text>
            <Text style={[styles.error, { color: C.textSecondary }]}>
              Papan tidak ditemukan atau tidak bisa dibaca.
            </Text>
          </View>
        ) : (
          <>
            {/* ─── Header ─── */}
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: C.secondaryContainer }]}>
                <Text style={styles.headerEmoji}>🏁</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.title, { color: C.text }]}>Papan Selesai</Text>
                <View style={styles.headerMeta}>
                  <View style={[styles.tierBadge, { backgroundColor: C.primary }]}>
                    <Text style={styles.tierBadgeText}>
                      Tier {tierAtGeneration} · {tierName}
                    </Text>
                  </View>
                  <Text style={[styles.gridBadge, { color: C.textSecondary }]}>
                    {layout.size}×{layout.size} · {layout.words.length} kata
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Grid read-only — sel hitam (blocked) + huruf + nomor clue ─── */}
            <View
              style={[
                styles.grid,
                {
                  width: gridWidth,
                  borderColor: C.border,
                  backgroundColor: C.border,
                  ...Platform.select({
                    web: { boxShadow: "0 12px 32px rgba(0,0,0,0.18)" },
                  }),
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
                          backgroundColor: C.cellBlocked,
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
                          backgroundColor: C.cellActive,
                        },
                      ]}
                    >
                      {cell.number != null && (
                        <Text
                          style={[
                            styles.cellNumber,
                            {
                              color: C.textSecondary,
                              fontSize: Math.max(7, fontSize * 0.38),
                            },
                          ]}
                        >
                          {cell.number}
                        </Text>
                      )}
                      <Text style={[styles.cellLetter, { color: C.text, fontSize }]}>
                        {cell.letter}
                      </Text>
                    </View>
                  ),
                ),
              )}
            </View>

            {/* ─── Daftar soal (selaras nomornya dengan grid) ─── */}
            <View style={styles.clueSection}>
              <Text style={[styles.clueSectionTitle, { color: C.text }]}>
                📝 Soal di papan ini
              </Text>

              {horizontals.length > 0 && (
                <View style={styles.clueGroup}>
                  <Text style={[styles.clueGroupLabel, { color: C.secondary }]}>MENDATAR</Text>
                  {horizontals.map((nw, i) => (
                    <View
                      key={`h-${i}`}
                      style={[styles.clueItem, { backgroundColor: C.surface }]}
                    >
                      <View style={[styles.clueNumber, { backgroundColor: C.secondaryContainer }]}>
                        <Text style={[styles.clueNumberText, { color: C.secondary }]}>
                          {nw.number}
                        </Text>
                      </View>
                      <View style={styles.clueBody}>
                        <Text style={[styles.clueWord, { color: C.text }]}>{nw.word.word}</Text>
                        <Text
                          style={[styles.clueText, { color: C.textSecondary }]}
                          numberOfLines={2}
                        >
                          {nw.word.clue_1}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {verticals.length > 0 && (
                <View style={styles.clueGroup}>
                  <Text style={[styles.clueGroupLabel, { color: C.primary }]}>MENURUN</Text>
                  {verticals.map((nw, i) => (
                    <View
                      key={`v-${i}`}
                      style={[styles.clueItem, { backgroundColor: C.surface }]}
                    >
                      <View style={[styles.clueNumber, { backgroundColor: C.primary }]}>
                        <Text style={[styles.clueNumberText, { color: "#FFFFFF" }]}>
                          {nw.number}
                        </Text>
                      </View>
                      <View style={styles.clueBody}>
                        <Text style={[styles.clueWord, { color: C.text }]}>{nw.word.word}</Text>
                        <Text
                          style={[styles.clueText, { color: C.textSecondary }]}
                          numberOfLines={2}
                        >
                          {nw.word.clue_1}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Text style={[styles.updatedAt, { color: C.textSecondary }]}>
              Diselesaikan pada {formatDate(updatedAt)}
            </Text>
          </>
        )}
      </ScrollView>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, alignItems: "center" },
  loading: { marginTop: 48 },
  errorWrap: { alignItems: "center", gap: 8, marginTop: 48, paddingHorizontal: 24 },
  errorEmoji: { fontSize: 40 },
  error: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  /* ─── Header ─── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEmoji: { fontSize: 26 },
  headerInfo: { flex: 1, gap: 6 },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tierBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  gridBadge: { fontSize: 12, fontWeight: "600" },

  /* ─── Grid ─── */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    gap: 1,
    padding: 2,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  blockedCell: {},
  cellNumber: { position: "absolute", top: 1, left: 2.5, fontWeight: "600" },
  cellLetter: { fontWeight: "800" },

  /* ─── Daftar soal ─── */
  clueSection: { alignSelf: "stretch", gap: 14 },
  clueSectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  clueGroup: { gap: 8 },
  clueGroupLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  clueItem: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clueNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  clueNumberText: { fontSize: 13, fontWeight: "800" },
  clueBody: { flex: 1, gap: 2 },
  clueWord: { fontSize: 15, fontWeight: "800" },
  clueText: { fontSize: 13, lineHeight: 18 },

  updatedAt: { fontSize: 11, fontStyle: "italic", marginTop: 2 },
});
