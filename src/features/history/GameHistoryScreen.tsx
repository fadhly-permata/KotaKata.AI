import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { loggerWarn } from "../../utils/logger";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList, "GameHistory">;

/** Berapa riwayat yang dimuat tiap scroll (paging server-side). */
const PAGE_SIZE = 25;

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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); // muat halaman pertama / reset
  const [loadingMore, setLoadingMore] = useState(false); // muat halaman berikutnya
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const pageRef = useRef(0); // halaman terakhir yang sudah dimuat
  const loadingMoreRef = useRef(false); // cegah load-more bertumpuk
  const hasMoreRef = useRef(true); // masih ada halaman berikutnya?
  const resetTokenRef = useRef(0); // invalidasi load lama yang basi (reset/fokus ulang)

  /**
   * Muat satu halaman riwayat board selesai dari cloud.
   * - `reset=true` (focus ulang): mulai dari halaman 0, replace list.
   * - `reset=false` (scroll ke bawah): ambil halaman berikutnya, append.
   */
  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!user) return;
      if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) return;
      // Setiap pemanggilan mengambil token FRESH (increment dulu, baru capture).
      // Reset/fokus ulang menaikkan token → load lama (mis. load-more yang masih
      // berjalan) yang selesai belakangan dianggap basi dan dibuang.
      const token = ++resetTokenRef.current;
      if (reset) {
        setLoading(true);
        setLoadError(false);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
      const offset = reset ? 0 : (pageRef.current + 1) * PAGE_SIZE;

      try {
        const docs = await boardRepository.getFinished(user.id, {
          limit: PAGE_SIZE,
          offset,
        });
        const mapped = docs.map(parseMeta);

        if (resetTokenRef.current !== token) return; // ada load lebih baru — buang hasil basi

        setBoards((prev) => (reset ? mapped : [...prev, ...mapped]));
        pageRef.current = reset ? 0 : pageRef.current + 1;
        const more = docs.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);

        if (reset) {
          try {
            setTotal(await boardRepository.countFinished(user.id));
          } catch (err) {
            // Total hanya label — gagal menghitung tidak menggagalkan list.
            loggerWarn("Gagal menghitung total riwayat permainan", err);
          }
        }
      } catch (err) {
        loggerWarn("Gagal memuat riwayat permainan", err);
        if (resetTokenRef.current === token && reset) setLoadError(true);
      } finally {
        loadingMoreRef.current = false;
        if (resetTokenRef.current === token) {
          if (reset) setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [user],
  );

  // Muat ulang dari halaman 0 saat layar difokuskan / user berubah.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setBoards([]);
        setTotal(0);
        setHasMore(false);
        setLoading(false);
        return;
      }
      loadPage(true);
    }, [user, loadPage]),
  );

  // Pemicu lazy load cadangan: mendekati dasar list saat scroll (di samping
  // onEndReached). Aman berulang karena loadPage di-guard.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 600) loadPage(false);
    },
    [loadPage],
  );

  const openBoard = useCallback(
    (boardId: string) => {
      navigation.navigate("BoardViewer", { boardId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FinishedBoardMeta }) => {
      const { board, size, wordCount } = item;
      const tierName =
        TIER_NAMES[Math.max(0, Math.min(board.tier_at_generation - 1, TIER_NAMES.length - 1))];
      return (
        <TouchableOpacity
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
    },
    [theme, openBoard],
  );

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerWrap}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Memuat riwayat lainnya…
          </Text>
        </View>
      );
    }
    if (hasMore && boards.length > 0) {
      // Jaring pengaman: kalau auto-load saat scroll tidak terpicu (mis. di
      // platform tertentu), user tetap bisa memuat data berikutnya manual.
      return (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => loadPage(false)}
          style={[styles.loadMoreBtn, { borderColor: theme.colors.border }]}
        >
          <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
            Muat lebih banyak
          </Text>
        </TouchableOpacity>
      );
    }
    if (boards.length > 0) {
      return (
        <Text style={[styles.endLabel, { color: theme.colors.textSecondary }]}>
          — Akhir riwayat —
        </Text>
      );
    }
    return null;
  }, [loadingMore, hasMore, boards.length, loadPage, theme]);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sejarah Permainan</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Papan yang sudah kamu selesaikan. Ketuk untuk melihat kembali.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Memuat riwayat permainan…
          </Text>
        </View>
      ) : (
        <FlatList
          data={boards}
          renderItem={renderItem}
          keyExtractor={(item) => item.board.board_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={() => loadPage(false)}
          onEndReachedThreshold={0.4}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          ListHeaderComponent={
            total > 0 ? (
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary }]}>
                {total} permainan selesai
              </Text>
            ) : null
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{loadError ? "📡" : "🎯"}</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {loadError
                  ? "Gagal memuat riwayat permainan. Periksa koneksi lalu coba lagi."
                  : "Belum ada permainan yang selesai. Selesaikan satu papan dulu ya! 🎯"}
              </Text>
              {loadError ? (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => loadPage(true)}
                  style={[styles.retryBtn, { borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.retryText, { color: theme.colors.primary }]}>Coba lagi</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 4 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 32 },
  countLabel: { fontSize: 12, fontWeight: "600", paddingBottom: 4 },
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
  footerWrap: { alignItems: "center", paddingVertical: 16, gap: 6 },
  footerText: { fontSize: 12, fontWeight: "600" },
  loadMoreBtn: {
    alignSelf: "center",
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
  endLabel: { textAlign: "center", fontSize: 12, fontStyle: "italic", paddingVertical: 16 },
  empty: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, fontStyle: "italic", textAlign: "center", paddingHorizontal: 24, lineHeight: 20 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  retryText: { fontSize: 13, fontWeight: "700" },
});
