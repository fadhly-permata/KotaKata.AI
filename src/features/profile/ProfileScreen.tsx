import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TierBadge from "../../presentation/components/common/TierBadge";
import { useGameStore } from "../../presentation/stores/gameStore";
import { calcTier, TIER_NAMES } from "../../domain/usecases/xpEngine";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const totalXp = useGameStore((s) => s.totalXp);
  const wordsSolved = useGameStore((s) => s.wordsSolved);
  const reset = useGameStore((s) => s.reset);

  const tier = calcTier(totalXp);
  const tierName = TIER_NAMES[Math.max(0, tier - 1)];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Profile header */}
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{tierName.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>Pemain</Text>
          <Text style={[styles.tierSubtitle, { color: theme.colors.textSecondary }]}>
            Tier {tier} — {tierName}
          </Text>
        </View>

        {/* Tier badge with XP progress */}
        <TierBadge totalXp={totalXp} />

        {/* Stats grid */}
        <View style={[styles.statsGrid, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{wordsSolved}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Kata Terpecahkan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalXp}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total XP</Text>
          </View>
        </View>

        {/* Account actions */}
        <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.6}>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Hubungkan Akun</Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>Simpan progres ke cloud</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.6}>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Tentang Aplikasi</Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>v1.0.0</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  avatarContainer: { alignItems: "center", padding: 24, borderRadius: 16, gap: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700" },
  tierSubtitle: { fontSize: 13, fontWeight: "500" },
  statsGrid: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 12,
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  actions: { borderRadius: 12, overflow: "hidden" },
  actionRow: { padding: 16 },
  actionText: { fontSize: 15, fontWeight: "600" },
  actionHint: { fontSize: 12, marginTop: 2 },
  actionDivider: { height: 1 },
});
