import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from "react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { TIER_NAMES, TIER_PHILOSOPHIES, TIER_COLORS } from "../../../domain/usecases/xpEngine";

interface BoardResult {
  totalWords: number;
  wordsSolved: number;
  xpGained: number;
  previousTier: number;
  newTier: number;
  tierChanged: boolean;
  timeElapsed: number;
}

interface Props {
  result: BoardResult;
  onPlayAgain: () => void;
}

export default function CompletionOverlay({ result, onPlayAgain }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const tierColor = TIER_COLORS[Math.max(0, result.newTier - 1)];
  const tierName = TIER_NAMES[Math.max(0, result.newTier - 1)];
  const tierPhilosophy = TIER_PHILOSOPHIES[Math.max(0, result.newTier - 1)];
  const minutes = Math.floor(result.timeElapsed / 60000);
  const seconds = Math.floor((result.timeElapsed % 60000) / 1000);

  return (
    <View style={[styles.wrapper, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={[styles.emoji]}>{result.tierChanged ? "🌟" : "✨"}</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {result.tierChanged ? "TIER UP!" : "Papan Selesai!"}
        </Text>

        {result.tierChanged && (
          <View style={[styles.tierBadge, { backgroundColor: tierColor + "20" }]}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              Tier {result.newTier}: {tierName}
            </Text>
            <Text style={[styles.tierPhilosophy, { color: theme.colors.textSecondary }]}>
              {tierPhilosophy}
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{result.wordsSolved}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Kata Terpecahkan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>+{result.xpGained}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Waktu</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.7}
          onPress={onPlayAgain}
        >
          <Text style={styles.playBtnText}>Main Lagi</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: 1 },
  tierBadge: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  tierLabel: { fontSize: 16, fontWeight: "700" },
  tierPhilosophy: { fontSize: 12, textAlign: "center", lineHeight: 18, fontStyle: "italic" },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 12,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  playBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  playBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
