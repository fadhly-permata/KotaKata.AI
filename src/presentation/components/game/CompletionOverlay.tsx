import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { play } from "../../../utils/sound";
import Confetti from "../common/Confetti";

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
  /** Papan dari Main Mode AI — tidak ada kalkulasi XP sama sekali. */
  aiMode?: boolean;
  onPlayAgain: () => void;
  onViewBoard: () => void;
  onHome: () => void;
}

export default function CompletionOverlay({ result, aiMode, onPlayAgain, onViewBoard, onHome }: Props) {
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

  const minutes = Math.floor(result.timeElapsed / 60000);
  const seconds = Math.floor((result.timeElapsed % 60000) / 1000);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={styles.wrapper}>
      {/* Konfeti perayaan di belakang dialog (tidak menghalangi tap tombol). */}
      <Confetti />
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
          ✨
        </Animated.Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Papan Selesai!
        </Text>

        {aiMode && (
          <View style={[styles.aiNote, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text style={[styles.aiNoteText, { color: theme.colors.textSecondary }]}>
              🤖 Mode AI — tidak ada XP yang dihitung untuk permainan ini.
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{result.wordsSolved}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Kata Terpecahkan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {aiMode ? "—" : `+${result.xpGained}`}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {aiMode ? "XP (tak dihitung)" : "XP"}
            </Text>
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
            onPress={() => {
              play("tap");
              onViewBoard();
            }}
          >
            <Text style={styles.iconBtnEmoji}>🧩</Text>
            <Text style={[styles.iconBtnLabel, { color: theme.colors.textSecondary }]}>Lihat Papan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              onHome();
            }}
          >
            <Text style={styles.iconBtnEmoji}>🏠</Text>
            <Text style={[styles.iconBtnLabel, { color: theme.colors.textSecondary }]}>Beranda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              onPlayAgain();
            }}
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
  aiNote: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  aiNoteText: { fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 17 },
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
