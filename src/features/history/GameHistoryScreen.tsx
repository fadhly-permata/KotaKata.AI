import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { useAuth } from "../auth/useAuth";
import { boardRepository } from "../../data/repositories/boardRepository";
import type { SavedBoardDoc } from "../../data/models/schemas";
import { TIER_NAMES } from "../../domain/usecases/xpEngine";
import { timeAgo } from "../../utils/timeAgo";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList, "GameHistory">;

interface FinishedBoardMeta {
  board: SavedBoardDoc;
  size: number;
  wordCount: number;
}

function parseMeta(board: SavedBoardDoc): FinishedBoardMeta {
  let size = board.grid_size;
  let wordCount = 0;
  try {
    const parsed = JSON.parse(board.layout_data) as { words?: unknown[]; size?: number };
    if (typeof parsed?.size === "number") size = parsed.size;
    wordCount = Array.isArray(parsed?.words) ? parsed.words.length : 0;
  } catch {
    // layout_data tidak valid — pakai nilai dari kolom.
  }
  return { board, size, wordCount };
}

export default function GameHistoryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [boards, setBoards] = useState<FinishedBoardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      (async () => {
        try {
          if (!user) {
            if (!cancelled) setBoards([]);
            return;
          }
          const docs = await boardRepository.getFinished(user.id);
          if (!cancelled) setBoards(docs.map(parseMeta));
        } catch {
          if (!cancelled) setError(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  const openBoard = (boardId: string) => {
    navigation.navigate("BoardViewer", { boardId });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sejarah Permainan</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Papan yang sudah kamu selesaikan. Ketuk untuk melihat kembali.
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loading} />
        ) : error ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Gagal memuat riwayat permainan. Periksa koneksi lalu coba lagi.
          </Text>
        ) : boards.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            Belum ada permainan yang selesai. Selesaikan satu papan dulu ya! 🎯
          </Text>
        ) : (
          boards.map(({ board, size, wordCount }) => {
            const tierName =
              TIER_NAMES[Math.max(0, Math.min(board.tier_at_generation - 1, TIER_NAMES.length - 1))];
            return (
              <TouchableOpacity
                key={board.board_id}
                style={[styles.item, { backgroundColor: theme.colors.surface }]}
                activeOpacity={0.7}
                onPress={() => openBoard(board.board_id)}
              >
                <View style={[styles.itemIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={styles.itemIconText}>✅</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    Tier {board.tier_at_generation} — {tierName}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.textSecondary }]}>
                    {size}×{size} · {wordCount} kata · {timeAgo(board.updated_at)}
                  </Text>
                </View>
                <Text style={[styles.itemArrow, { color: theme.colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  loading: { marginTop: 32 },
  empty: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconText: { fontSize: 20 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: "700" },
  itemMeta: { fontSize: 12, fontWeight: "500" },
  itemArrow: { fontSize: 24, fontWeight: "700" },
});
