import { useState, useMemo, useCallback } from "react";
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
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";

interface DiscoveryItem {
  id: string;
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  discoveredAt: string;
}

const DEMO_DISCOVERIES: DiscoveryItem[] = [
  { id: "1", word: "REACT", clue_1: "Library JavaScript buat UI", clue_2: "Dibuat oleh Meta", clue_3: "Framework frontend populer", discoveredAt: "2 menit lalu" },
  { id: "2", word: "KOTAK", clue_1: "Bentuk segi empat", clue_2: "Benda berbentuk kubus", discoveredAt: "5 menit lalu" },
  { id: "3", word: "KATA", clue_1: "Unit bahasa", clue_2: "Gabungan huruf", clue_3: "Elemen dari kalimat", discoveredAt: "10 menit lalu" },
];

export default function HistoryScreen() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return DEMO_DISCOVERIES;
    const q = search.toLowerCase();
    return DEMO_DISCOVERIES.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.clue_1.toLowerCase().includes(q) ||
        item.clue_2?.toLowerCase().includes(q) ||
        item.clue_3?.toLowerCase().includes(q),
    );
  }, [search]);

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
        <Text style={[styles.itemTime, { color: theme.colors.textSecondary }]}>{item.discoveredAt}</Text>
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
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {search ? "Kata tidak ditemukan" : "Belum ada kata yang ditemukan"}
            </Text>
          </View>
        }
      />

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
                  Ditemukan {selected.discoveredAt}
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
  empty: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 14, fontStyle: "italic" },
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
