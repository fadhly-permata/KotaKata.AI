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
  onViewBoard: () => void;
  onHome: () => void;
}

export default function CompletionOverlay({ result, onPlayAgain, onViewBoard, onHome }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Emoji melayang pelan — sentuhan "ceria" setelah papan selesai.
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, []);

  const tierColor = TIER_COLORS[Math.max(0, result.newTier - 1)];
  const tierName = TIER_NAMES[Math.max(0, result.newTier - 1)];
  const tierPhilosophy = TIER_PHILOSOPHIES[Math.max(0, result.newTier - 1)];
  const minutes = Math.floor(result.timeElapsed / 60000);
  const seconds = Math.floor((result.timeElapsed % 60000) / 1000);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={styles.wrapper}>
      {/* Backdrop memudar masuk pelan. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]}
      />
      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        <Animated.Text
          style={[styles.emoji, { transform: [{ translateY: floatTranslate }] }]}
        >
          {result.tierChanged ? "🌟" : "✨"}
        </Animated.Text>
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

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={onViewBoard}
          >
            <Text style={styles.iconBtnEmoji}>🧩</Text>
            <Text style={[styles.iconBtnLabel, { color: theme.colors.textSecondary }]}>Lihat Papan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={onHome}
          >
            <Text style={styles.iconBtnEmoji}>🏠</Text>
            <Text style={[styles.iconBtnLabel, { color: theme.colors.textSecondary }]}>Beranda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
            onPress={onPlayAgain}
          >
            <Text style={styles.iconBtnEmoji}>🔄</Text>
            <Text style={[styles.iconBtnLabel, { color: "#FFF" }]}>Main Lagi</Text>
          </TouchableOpacity>
        </View>
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
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
  },
  iconBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
  },
  iconBtnEmoji: { fontSize: 22 },
  iconBtnLabel: { fontSize: 11, fontWeight: "700" },
});
