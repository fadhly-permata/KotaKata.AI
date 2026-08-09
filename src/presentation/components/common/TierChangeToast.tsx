import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, Platform } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { TIER_NAMES, TIER_COLORS } from "../../../domain/usecases/xpEngine";

interface Props {
  /** Tier baru yang dicapai; null = sembunyikan toast. */
  tier: number | null;
  /** Naik (true) / turun (false). */
  up: boolean;
  /** Panggil setelah animasi menghilang selesai. */
  onHide: () => void;
}

/**
 * Toast notifikasi perubahan tier — dipakai di Main Menu & layar Game.
 * Meluncur dari atas, tampil ~3 detik, lalu menghilang sendiri.
 */
export default function TierChangeToast({ tier, up, onHide }: Props) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Simpan onHide di ref supaya effect tidak restart tiap parent re-render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (tier == null) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(
        () => onHideRef.current(),
      );
    }, 3200);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, up]);

  if (tier == null) return null;

  const color = TIER_COLORS[Math.max(0, Math.min(tier - 1, TIER_COLORS.length - 1))];
  const tierName = TIER_NAMES[Math.max(0, Math.min(tier - 1, TIER_NAMES.length - 1))];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: theme.colors.surface,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.emoji]}>{up ? "🎉" : "📉"}</Text>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: up ? color : theme.colors.error }]}>
          {up ? "Naik ke Tier" : "Turun ke Tier"} {tier} — {tierName}
        </Text>
        <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
          {up ? "Selamat! Levelmu naik. 🏆" : "XP kamu berkurang, level turun."}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: Platform.OS === "web" ? 16 : 54,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
  },
  emoji: { fontSize: 26 },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 12, fontWeight: "500" },
});
