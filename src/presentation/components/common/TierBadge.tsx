import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { TIER_NAMES, TIER_PHILOSOPHIES, TIER_COLORS, calcTier, calcTierProgress } from "../../../domain/usecases/xpEngine";

interface TierBadgeProps {
  totalXp: number;
  compact?: boolean;
}

export default function TierBadge({ totalXp, compact }: TierBadgeProps) {
  const { theme } = useTheme();
  const tier = calcTier(totalXp);
  const progress = calcTierProgress(totalXp);
  const color = TIER_COLORS[Math.max(0, tier - 1)];
  const name = TIER_NAMES[Math.max(0, tier - 1)];
  const philosophy = TIER_PHILOSOPHIES[Math.max(0, tier - 1)];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <View style={[styles.tierDot, { backgroundColor: color }]} />
        <Text style={[styles.tierLabel, { color }]}>
          Tier {tier}: {name}
        </Text>
      </View>
      {!compact && (
        <Text style={[styles.philosophy, { color: theme.colors.textSecondary }]}>
          {philosophy}
        </Text>
      )}
      <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.xpText, { color: theme.colors.textSecondary }]}>
        {totalXp} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierDot: { width: 12, height: 12, borderRadius: 6 },
  tierLabel: { fontSize: 16, fontWeight: "700" },
  philosophy: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  xpText: { fontSize: 12, fontWeight: "600", textAlign: "right" },
});
