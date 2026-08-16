import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { textOnPrimary } from "../../../utils/skin";
import { TIER_NAMES, TIER_COLORS } from "../../../domain/usecases/xpEngine";

interface SavedBoard {
  id: string;
  tierLevel: number;
  gridSize: number;
  wordCount: number;
  wordsSolved: number;
  isFinished: boolean;
  updatedAt: string;
}

interface SavedBoardListProps {
  boards: SavedBoard[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SavedBoardList({ boards, onResume, onDelete }: SavedBoardListProps) {
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: SavedBoard }) => {
    const tierColor = TIER_COLORS[Math.max(0, item.tierLevel - 1)];
    const tierName = TIER_NAMES[Math.max(0, item.tierLevel - 1)];
    const progress = item.wordCount > 0 ? Math.round((item.wordsSolved / item.wordCount) * 100) : 0;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + "20" }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>Tier {item.tierLevel}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.isFinished
                  ? theme.colors.success + "20"
                  : theme.colors.gold + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.isFinished ? theme.colors.success : theme.colors.gold },
              ]}
            >
              {item.isFinished ? "Selesai" : `${progress}%`}
            </Text>
          </View>
        </View>

        <Text style={[styles.tierName, { color: theme.colors.textSecondary }]}>{tierName}</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
          {item.gridSize}×{item.gridSize} — {item.wordCount} kata
        </Text>

        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tierColor }]} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.resumeBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
            onPress={() => onResume(item.id)}
          >
            <Text style={[styles.resumeText, { color: textOnPrimary(theme) }]}>
              {item.isFinished ? "Review" : "Lanjutkan"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: theme.colors.border }]}
            activeOpacity={0.6}
            onPress={() => onDelete(item.id)}
          >
            <Text style={[styles.deleteText, { color: theme.colors.textSecondary }]}>Hapus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (boards.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Papan Tersimpan</Text>
      <FlatList
        data={boards}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16 },
  list: { gap: 12, paddingHorizontal: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 12, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },
  tierName: { fontSize: 13, fontWeight: "500", fontStyle: "italic" },
  meta: { fontSize: 12 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  resumeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  resumeText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  deleteBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1 },
  deleteText: { fontSize: 14, fontWeight: "600" },
});
