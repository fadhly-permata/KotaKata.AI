import { useCallback, useMemo, useRef, useState } from "react";
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
import { loggerWarn, loggerInfo } from "../../utils/logger";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import {
  masonryCardHeight,
  masonryWideHeight,
  isWideMasonryCard,
} from "../../utils/masonry";
import { neumorphicShadow } from "../../utils/neumorphic";

type Nav = NativeStackNavigationProp<RootStackParamList, "GameHistory">;

/** Berapa riwayat yang dimuat tiap scroll (paging server-side). */
const PAGE_SIZE = 25;

interface FinishedBoardMeta {
  board: SavedBoardDoc;
  size: number;
  wordCount: number;
}

/** Satu baris masonry: card lebar penuh (1 sel) atau pasangan 2 kolom. */
interface BoardRow {
  key: string;
  cells: FinishedBoardMeta[];
}

function parseMeta(board: SavedBoardDoc): FinishedBoardMeta {
  let size = board.grid_size;
  let wordCount = 0;
  try {
    const parsed = JSON.parse(board.layout_data) as { words?: unknown[]; size?: number };
    if (typeof parsed?.size === "number") size = parsed.size;
    wordCount = Array.isArray(parsed?.words) ? parsed.words.length : 0;
  } catch (err) {
    loggerInfo("layout_data board tidak valid, menggunakan default", err);
  }
  return { board, size, wordCount };
}

/** Card satu papan selesai — ukuran (tinggi/lebar) acak tapi rapi (PLAN-032). */
function BoardCard({
  item,
  wide,
  onPress,
}: {
  item: FinishedBoardMeta;
  wide: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const { board, size, wordCount } = item;
  const tierName =
    TIER_NAMES[Math.max(0, Math.min(board.tier_at_generation - 1, TIER_NAMES.length - 1))];
  const height = wide ? masonryWideHeight(board.board_id) : masonryCardHeight(board.board_id);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          height,
          backgroundColor: C.surface,
          borderColor: C.border,
          // Card lebar penuh menempati satu baris; card normal berbagi 2 kolom.
          flex: wide ? undefined : 1,
          width: wide ? "100%" : undefined,
        },
        // PLAN-037: tema neumorphic — kartu senada latar tampak "timbul".
        neumorphicShadow(theme.shadow),
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: C.primary }]} />
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: C.secondaryContainer }]}>
          <Text style={styles.cardIconText}>✅</Text>
        </View>
        <Text style={[styles.cardArrow, { color: C.textSecondary }]}>›</Text>
      </View>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
        style={[styles.cardTitle, { color: C.text }]}
      >
        Tier {board.tier_at_generation} — {tierName}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[styles.cardMeta, { color: C.textSecondary }]}
      >
        {size}×{size} · {wordCount} kata · {timeAgo(board.updated_at)}
      </Text>
    </TouchableOpacity>
  );
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

  // Susun item jadi baris masonry: card lebar (1 sel) atau pasangan 2 kolom.
  // Ukuran tiap card deterministik dari id (utils/masonry.ts) — susunan stabil
  // antar re-render; FlatList tetap dipakai → lazy load jalan seperti biasa.
  const rows = useMemo<BoardRow[]>(() => {
    const out: BoardRow[] = [];
    let i = 0;
    while (i < boards.length) {
      const first = boards[i];
      const second = boards[i + 1];
      if (isWideMasonryCard(first.board.board_id) || !second || isWideMasonryCard(second.board.board_id)) {
        out.push({ key: first.board.board_id, cells: [first] });
        i += 1;
      } else {
        out.push({ key: `${first.board.board_id}|${second.board.board_id}`, cells: [first, second] });
        i += 2;
      }
    }
    return out;
  }, [boards]);

  const renderRow = useCallback(
    ({ item }: { item: BoardRow }) => (
      <View style={styles.row}>
        {item.cells.map((cell) => (
          <BoardCard
            key={cell.board.board_id}
            item={cell}
            wide={item.cells.length === 1}
            onPress={() => openBoard(cell.board.board_id)}
          />
        ))}
      </View>
    ),
    [openBoard],
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
          data={rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.key}
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
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 32 },
  countLabel: { fontSize: 12, fontWeight: "600", paddingBottom: 2 },

  /* ─── Card masonry (PLAN-032) ─── */
  row: { flexDirection: "row", gap: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
    gap: 6,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { fontSize: 16 },
  cardArrow: { fontSize: 20, fontWeight: "700" },
  cardTitle: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2, lineHeight: 18 },
  cardMeta: { fontSize: 11.5, fontWeight: "600" },

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
