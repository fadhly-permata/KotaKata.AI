import { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  ImageBackground,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useGameStore } from "../../presentation/stores/gameStore";
import { calcTier, calcTierProgress, TIER_NAMES } from "../../domain/usecases/xpEngine";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList, "MainMenu">;

export default function MainMenuScreen() {
  const { theme, isDark } = useTheme();
  const C = theme.colors;
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);

  const currentTier = useMemo(() => calcTier(totalXp), [totalXp]);
  const tierName = useMemo(() => TIER_NAMES[Math.max(0, currentTier - 1)], [currentTier]);
  const tierProgress = useMemo(() => calcTierProgress(totalXp), [totalXp]);
  const xpToNext = useMemo(() => {
    const nextThresholds = [200, 500, 1000, 1800, 3000, 5000, 8000, 12000, 20000];
    const nextXp = nextThresholds[Math.min(currentTier - 1, nextThresholds.length - 1)] || 200;
    const remaining = Math.max(1, Math.round((1 - tierProgress) * nextXp / 25));
    return remaining;
  }, [currentTier, tierProgress]);

  // ─── Bounce animation for play button icon ───
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounceAnim]);

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const handlePlay = () => {
    reset();
    navigation.navigate("Game");
  };

  const heroBg = isDark ? "rgba(42,26,48,0.85)" : "rgba(255,255,255,0.7)";

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* ─── Floating Background Shapes ─── */}
      <View style={styles.floatingContainer} pointerEvents="none">
        <View
          style={[
            styles.floatingOrb,
            {
              width: 160,
              height: 160,
              backgroundColor: isDark ? "#3a2050" : "#ffd6ee",
              top: "-5%",
              left: "-10%",
              opacity: 0.5,
            },
          ]}
        />
        <View
          style={[
            styles.floatingOrb,
            {
              width: 200,
              height: 200,
              backgroundColor: C.secondaryContainer,
              top: "35%",
              right: "-15%",
              opacity: 0.45,
            },
          ]}
        />
        <View
          style={[
            styles.floatingOrb,
            {
              width: 120,
              height: 120,
              backgroundColor: C.tertiaryContainer,
              bottom: "10%",
              left: "5%",
              opacity: 0.4,
            },
          ]}
        />
      </View>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Top AppBar ═══ */}
        <View style={[styles.topBar, { backgroundColor: C.surface }]}>
          <View style={styles.topBarLeft}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: C.secondaryContainer, borderColor: C.primary },
              ]}
            >
              <Text style={[styles.avatarText, { color: C.text }]}>K</Text>
            </View>
            <Text style={[styles.appTitle, { color: C.primary }]}>KotaKata AI</Text>
          </View>
          <View style={[styles.xpPill, { backgroundColor: C.secondaryContainer }]}>
            <Text style={[styles.xpPillText, { color: C.secondary }]}>⭐ {totalXp} XP</Text>
          </View>
        </View>

        {/* ═══ Hero Tier Card ═══ */}
        <View style={styles.heroCard}>
          <View style={[styles.heroInner, { backgroundColor: heroBg, borderColor: C.surface }]}>
            <View style={[styles.tierIconCircle, { backgroundColor: C.primary }]}>
              <Text style={styles.tierIconText}>📖</Text>
            </View>
            <Text style={[styles.heroLabel, { color: C.secondary }]}>PERINGKAT SAAT INI</Text>
            <Text style={[styles.heroTierName, { color: C.primary }]}>{tierName}</Text>

            {/* Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(tierProgress * 100)}%` as any,
                    backgroundColor: C.primary,
                  },
                ]}
              />
            </View>

            <Text style={[styles.heroSubtext, { color: C.textSecondary }]}>
              Lengkapi {xpToNext} kata lagi untuk level berikutnya!
            </Text>
          </View>
        </View>

        {/* ═══ Main Action: Mulai Bermain ═══ */}
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: C.primary }]}
          activeOpacity={0.9}
          onPress={handlePlay}
        >
          <View style={styles.playButtonContent}>
            <Text style={styles.playButtonText}>Mulai Bermain</Text>
            <Animated.Text
              style={[
                styles.playButtonIcon,
                { transform: [{ translateY: bounceTranslate }] },
              ]}
            >
              ▶️
            </Animated.Text>
          </View>
          <View style={styles.shineOverlay} />
        </TouchableOpacity>

        {/* ═══ Action Grid: Misi Harian + Sejarah ═══ */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80" }}
              style={styles.actionCardBg}
              resizeMode="cover"
            >
              <View style={styles.actionCardOverlay}>
                <Text style={styles.actionCardIcon}>🏆</Text>
                <Text style={styles.actionCardLabel}>Misi Harian</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("History")}
          >
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80" }}
              style={styles.actionCardBg}
              resizeMode="cover"
            >
              <View style={styles.actionCardOverlay}>
                <Text style={styles.actionCardIcon}>🎓</Text>
                <Text style={styles.actionCardLabel}>Sejarah</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* ═══ Koleksi Terbaru (Bento) ═══ */}
        <View style={styles.bentoSection}>
          <Text style={[styles.bentoTitle, { color: C.text }]}>Koleksi Terbaru</Text>
          <View style={styles.bentoGrid}>
            {/* Large card — Profil */}
            <TouchableOpacity
              style={styles.bentoLargeCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Profile")}
            >
              <ImageBackground
                source={{ uri: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" }}
                style={styles.bentoLargeBg}
                resizeMode="cover"
              >
                <View style={styles.bentoLargeOverlay}>
                  <Text style={styles.bentoLargeEmoji}>🎨</Text>
                  <Text style={styles.bentoLargeLabel}>Profil</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            {/* Small card 1 — Kata Ajaib */}
            <TouchableOpacity
              style={styles.bentoSmallCard}
              activeOpacity={0.8}
              onPress={() => {}}
            >
              <ImageBackground
                source={{ uri: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80" }}
                style={styles.bentoSmallBg}
                resizeMode="cover"
              >
                <View style={styles.bentoSmallOverlay}>
                  <Text style={styles.bentoSmallEmoji}>✨</Text>
                  <Text style={styles.bentoSmallLabel}>Kata Ajaib</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            {/* Small card 2 — Pengaturan */}
            <TouchableOpacity
              style={styles.bentoSmallCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Settings")}
            >
              <ImageBackground
                source={{ uri: "https://images.unsplash.com/photo-1592930290787-1c7c91e14e73?w=400&q=80" }}
                style={styles.bentoSmallBg}
                resizeMode="cover"
              >
                <View style={styles.bentoSmallOverlay}>
                  <Text style={styles.bentoSmallEmoji}>⚙️</Text>
                  <Text style={styles.bentoSmallLabel}>Pengaturan</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ─── Floating Orbs ─── */
  floatingContainer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    zIndex: -1,
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 9999,
  },

  /* ─── Scroll ─── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 100,
  },

  /* ─── Top Bar ─── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 16 : 48,
    paddingBottom: 12,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarText: { fontSize: 14, fontWeight: "800" },
  appTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  xpPillText: { fontSize: 12, fontWeight: "700" },

  /* ─── Hero Tier Card ─── */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 16,
  },
  heroInner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)" },
    }),
  },
  tierIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  tierIconText: { fontSize: 32 },
  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTierName: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  progressTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    marginTop: 8,
    padding: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  heroSubtext: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },

  /* ─── Play Button ─── */
  playButton: {
    marginHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      web: { cursor: "pointer" },
    }),
  },
  playButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  playButtonIcon: { fontSize: 28 },
  shineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },

  /* ─── Action Grid ─── */
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  actionCardBg: {
    width: "100%",
  },
  actionCardOverlay: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  actionCardIcon: { fontSize: 28 },
  actionCardLabel: { fontSize: 14, fontWeight: "700", textAlign: "center", color: "#FFFFFF" },

  /* ─── Bento Section ─── */
  bentoSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  bentoTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    height: 180,
  },
  bentoLargeCard: {
    width: "48%",
    height: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  bentoLargeBg: {
    flex: 1,
    justifyContent: "flex-end",
  },
  bentoLargeOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  bentoLargeEmoji: { fontSize: 28 },
  bentoLargeLabel: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  bentoSmallCard: {
    width: "48%",
    height: "47%",
    borderRadius: 14,
    overflow: "hidden",
  },
  bentoSmallBg: {
    flex: 1,
    justifyContent: "flex-end",
  },
  bentoSmallOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bentoSmallEmoji: { fontSize: 24 },
  bentoSmallLabel: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
