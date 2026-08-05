import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { useAuth } from "../auth/useAuth";
import { initDatabase } from "../../data/sources/database";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";

interface DiscoveryItem {
  id: string;
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  discoveredAt: string; // ISO timestamp
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        await initDatabase();

        // Sumber kebenaran: Supabase (bertahan lintas sesi/reload). Kalau
        // offline, fallback ke RxDB lokal (isi = data yang tersinkron sesi ini).
        let discoveries;
        let vocabMap;
        try {
          discoveries = await wordDiscoveryRepository.getByUserFromCloud(user.id);
          const words = await vocabularyRepository.getByIdsFromCloud(
            discoveries.map((d) => d.word_id),
          );
          vocabMap = new Map(words.map((v) => [v.word_id, v]));
        } catch (cloudErr) {
          console.warn("Riwayat dari cloud gagal — pakai lokal", cloudErr);
          discoveries = await wordDiscoveryRepository.getByUser(user.id);
          const words = await vocabularyRepository.getByIds(
            discoveries.map((d) => d.word_id),
          );
          vocabMap = new Map(words.map((v) => [v.word_id, v]));
        }

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

        if (!cancelled) setItems(mapped);
      } catch (err) {
        console.warn("Gagal memuat riwayat penemuan", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.clue_1.toLowerCase().includes(q) ||
        item.clue_2?.toLowerCase().includes(q) ||
        item.clue_3?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const renderItem = useCallback(
    ({ item }: { item: DiscoveryItem }) => (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: theme.colors.surface }]}
        activeOpacity={0.6}
        onPress={() => setSelected(item)}
      >
        <View style={styles.itemLeft}>
          <Text style={[styles.itemWord, { color: theme.colors.text }]}>{item.word}</Text>
          <Text style={[styles.itemClue, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.clue_1}
          </Text>
        </View>
        <Text style={[styles.itemTime, { color: theme.colors.textSecondary }]}>
          {timeAgo(item.discoveredAt)}
        </Text>
      </TouchableOpacity>
    ),
    [theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary }]}>
                {items.length} kata ditemukan
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {search
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
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
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
    </View>
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
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 32 },
  countLabel: { fontSize: 12, fontWeight: "600", paddingBottom: 4 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemWord: { fontSize: 16, fontWeight: "700", textTransform: "uppercase" },
  itemClue: { fontSize: 13, lineHeight: 18 },
  itemTime: { fontSize: 11, fontWeight: "500", marginLeft: 8 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, fontStyle: "italic", textAlign: "center", paddingHorizontal: 24 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get("window").height * 0.6,
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
