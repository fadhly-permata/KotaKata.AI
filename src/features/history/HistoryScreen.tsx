import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { useAuth } from "../auth/useAuth";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { timeAgo } from "../../utils/timeAgo";
import { loggerWarn } from "../../utils/logger";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import {
  masonryCardHeight,
  masonryWideHeight,
  isWideMasonryCard,
} from "../../utils/masonry";
import { neumorphicShadow } from "../../utils/neumorphic";
import type { WordDiscoveryDoc, VocabularyDoc } from "../../data/models/schemas";

interface DiscoveryItem {
  id: string;
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  discoveredAt: string; // ISO timestamp
}

/** Satu baris masonry: card lebar penuh (1 sel) atau pasangan 2 kolom. */
interface DiscoveryRow {
  key: string;
  cells: DiscoveryItem[];
}

/** Berapa data yang dimuat tiap scroll (pagination server-side). */
const PAGE_SIZE = 25;
/** Jeda sebelum pencarian dikirim ke cloud (hindari spam query per ketikan). */
const SEARCH_DEBOUNCE_MS = 400;

/** Card satu kata ditemukan — ukuran (tinggi/lebar) acak tapi rapi (PLAN-032). */
function DiscoveryCard({
  item,
  wide,
  onPress,
}: {
  item: DiscoveryItem;
  wide: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  const height = wide ? masonryWideHeight(item.id) : masonryCardHeight(item.id);
  return (
    <TouchableOpacity
      activeOpacity={0.65}
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
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[styles.cardWord, { color: C.text }]}
      >
        {item.word}
      </Text>
      <Text
        numberOfLines={3}
        maxFontSizeMultiplier={1.2}
        style={[styles.cardClue, { color: C.textSecondary }]}
      >
        {item.clue_1}
      </Text>
      <Text style={[styles.cardTime, { color: C.textSecondary }]}>
        {timeAgo(item.discoveredAt)}
      </Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { height: winH } = useWindowDimensions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); // muat halaman pertama / reset
  const [loadingMore, setLoadingMore] = useState(false); // muat halaman berikutnya
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const pageRef = useRef(0); // halaman terakhir yang sudah dimuat
  const searchRef = useRef(""); // term pencarian yang sedang dipakai query
  const loadingMoreRef = useRef(false); // cegah load-more bertumpuk
  const hasMoreRef = useRef(true); // masih ada halaman berikutnya?
  const resetTokenRef = useRef(0); // invalidasi load lama yang basi (reset/ganti pencarian)

  // Debounce input pencarian.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  /**
   * Muat satu halaman discovery dari cloud.
   * - `reset=true` (mount / ganti pencarian): mulai dari halaman 0, replace list.
   * - `reset=false` (scroll ke bawah): ambil halaman berikutnya, append.
   */
  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!user) return;
      if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) return;
      // Setiap pemanggilan mengambil token FRESH (increment dulu, baru capture).
      // Reset/ganti pencarian menaikkan token → load lama (mis. load-more yang
      // masih berjalan) yang selesai belakangan dianggap basi dan dibuang.
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
        // Reset: tunggu pencatatan discovery yang masih berjalan (termasuk
        // push langsung ke Supabase) selesai, biar riwayat terbaru sudah ada
        // di cloud sebelum di-baca.
        if (reset) await wordDiscoveryRepository.flushDiscoveries();

        const searchTerm = searchRef.current || undefined;
        const discoveries: WordDiscoveryDoc[] =
          await wordDiscoveryRepository.getByUserFromCloud(user.id, {
            search: searchTerm,
            limit: PAGE_SIZE,
            offset,
          });

        const words = await vocabularyRepository.getByIdsFromCloud(
          discoveries.map((d) => d.word_id),
        );
        const vocabMap = new Map(words.map((v) => [v.word_id, v]));

        const mapped: DiscoveryItem[] = [];
        for (const d of discoveries) {
          const v = vocabMap.get(d.word_id);
          if (!v) continue;
          mapped.push({
            id: d.discovery_id,
            word: v.word,
            clue_1: v.clue_1,
            clue_2: v.clue_2,
            clue_3: v.clue_3,
            discoveredAt: d.discovered_at,
          });
        }

        if (resetTokenRef.current !== token) return; // ada load lebih baru — buang hasil basi

        setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
        pageRef.current = reset ? 0 : pageRef.current + 1;
        const more = discoveries.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);

        if (reset) {
          try {
            setTotal(await wordDiscoveryRepository.countByUser(user.id, searchTerm));
          } catch (err) {
            // Total hanya label — gagal menghitung tidak menggagalkan list.
            loggerWarn("Gagal menghitung total riwayat", err);
          }
        }
      } catch (err) {
        loggerWarn("Gagal memuat riwayat penemuan", err);
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

  // Muat ulang dari halaman 0 saat user berubah atau term pencarian berubah.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    searchRef.current = debouncedSearch.trim();
    loadPage(true);
  }, [user, debouncedSearch, loadPage]);

  // Pemicu lazy load cadangan: mendekati dasar list saat scroll (di samping
  // onEndReached). Menjamin data berikutnya termuat walau onEndReached tidak
  // terpicu di platform tertentu — aman berulang karena loadPage di-guard.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 600) loadPage(false);
    },
    [loadPage],
  );

  // Susun item jadi baris masonry: card lebar (1 sel) atau pasangan 2 kolom.
  // Ukuran tiap card ditentukan deterministik dari id (lihat utils/masonry.ts),
  // jadi susunan stabil antar re-render. FlatList tetap dipakai → lazy load
  // (paging + virtualisasi) berjalan seperti sebelumnya.
  const rows = useMemo<DiscoveryRow[]>(() => {
    const out: DiscoveryRow[] = [];
    let i = 0;
    while (i < items.length) {
      const first = items[i];
      const second = items[i + 1];
      if (isWideMasonryCard(first.id) || !second || isWideMasonryCard(second.id)) {
        out.push({ key: first.id, cells: [first] });
        i += 1;
      } else {
        out.push({ key: `${first.id}|${second.id}`, cells: [first, second] });
        i += 2;
      }
    }
    return out;
  }, [items]);

  const renderRow = useCallback(
    ({ item }: { item: DiscoveryRow }) => (
      <View style={styles.row}>
        {item.cells.map((cell) => (
          <DiscoveryCard
            key={cell.id}
            item={cell}
            wide={item.cells.length === 1}
            onPress={() => setSelected(cell)}
          />
        ))}
      </View>
    ),
    [],
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
    if (hasMore && items.length > 0) {
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
    if (items.length > 0) {
      return (
        <Text style={[styles.endLabel, { color: theme.colors.textSecondary }]}>
          — Akhir riwayat —
        </Text>
      );
    }
    return null;
  }, [loadingMore, hasMore, items.length, loadPage, theme]);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.searchIcon, { color: theme.colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Cari kata atau petunjuk..."
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={[styles.clearBtn, { color: theme.colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Memuat kata-kata yang ditemukan…
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
                {total} kata ditemukan
              </Text>
            ) : null
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{loadError ? "📡" : "🎓"}</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {loadError
                  ? "Gagal memuat riwayat — periksa koneksi internetmu."
                  : search
                    ? "Kata tidak ditemukan"
                    : "Belum ada kata yang ditemukan. Selesaikan papan pertama untuk mulai mengoleksi kata!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom sheet modal */}
      <Modal
        visible={selected != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelected(null)} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.colors.surface, maxHeight: winH * 0.6 },
            ]}
          >
            {selected && (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetWord, { color: theme.colors.text }]}>{selected.word}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Text style={[styles.sheetClose, { color: theme.colors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.clueCard}>
                  <Text style={[styles.clueNum, { color: theme.colors.primary }]}>Petunjuk 1</Text>
                  <Text style={[styles.clueText, { color: theme.colors.text }]}>{selected.clue_1}</Text>
                </View>

                {selected.clue_2 && (
                  <View style={styles.clueCard}>
                    <Text style={[styles.clueNum, { color: theme.colors.primary }]}>Petunjuk 2</Text>
                    <Text style={[styles.clueText, { color: theme.colors.text }]}>{selected.clue_2}</Text>
                  </View>
                )}

                {selected.clue_3 && (
                  <View style={styles.clueCard}>
                    <Text style={[styles.clueNum, { color: theme.colors.primary }]}>Petunjuk 3</Text>
                    <Text style={[styles.clueText, { color: theme.colors.text }]}>{selected.clue_3}</Text>
                  </View>
                )}

                <Text style={[styles.discoveredAt, { color: theme.colors.textSecondary }]}>
                  Ditemukan {timeAgo(selected.discoveredAt)}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, height: 44 },
  clearBtn: { fontSize: 16, padding: 4 },
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
    // Bayangan halus — pakai border + warna saja agar konsisten di semua
    // platform (shadow Android lama tidak konsisten).
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
  cardWord: {
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  cardClue: { fontSize: 12.5, lineHeight: 17, flexShrink: 1 },
  cardTime: { fontSize: 10.5, fontWeight: "600", fontStyle: "italic" },

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
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, fontStyle: "italic", textAlign: "center", paddingHorizontal: 24 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetContent: { padding: 24, gap: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sheetWord: { fontSize: 24, fontWeight: "800", textTransform: "uppercase" },
  sheetClose: { fontSize: 20, padding: 4 },
  clueCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 4,
  },
  clueNum: { fontSize: 12, fontWeight: "700" },
  clueText: { fontSize: 14, lineHeight: 20 },
  discoveredAt: { fontSize: 12, textAlign: "center", marginTop: 8, fontStyle: "italic" },
});
