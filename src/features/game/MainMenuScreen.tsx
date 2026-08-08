import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Modal,
  ActivityIndicator,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useGameStore } from "../../presentation/stores/gameStore";
import UserAvatar from "../../presentation/components/common/UserAvatar";
import { useAuth } from "../auth/useAuth";
import {
  calcTier,
  calcTierProgress,
  TIER_THRESHOLDS,
  TIER_NAMES,
} from "../../domain/usecases/xpEngine";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import type { VocabularyDoc } from "../../data/models/schemas";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList, "MainMenu">;

/** Clue yang merupakan sinonim/antonim — tidak dipakai popup "Kata Ajaib". */
const CLUE_SYN_ANT_RE = /^(antonim|sinonim|lawan kata|persamaan kata)\s*[:—–-]?/i;

/** Pilih satu clue acak yang BUKAN sinonim/antonim (fallback ke clue_1). */
function pickMagicClue(word: VocabularyDoc): string {
  const candidates = [word.clue_1, word.clue_2, word.clue_3].filter(
    (c): c is string => !!c && !CLUE_SYN_ANT_RE.test(c),
  );
  const pool = candidates.length > 0 ? candidates : [word.clue_1];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function MainMenuScreen() {
  const { theme, isDark } = useTheme();
  const C = theme.colors;
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);
  const { user } = useAuth();

  const currentTier = useMemo(() => calcTier(totalXp), [totalXp]);
  const tierName = useMemo(() => TIER_NAMES[Math.max(0, currentTier - 1)], [currentTier]);
  const tierProgress = useMemo(() => calcTierProgress(totalXp), [totalXp]);
  // Sisa XP murni menuju tier berikutnya (bukan estimasi jumlah kata).
  const remainingXp = useMemo(() => {
    const nextThreshold = TIER_THRESHOLDS[Math.min(currentTier, TIER_THRESHOLDS.length - 1)];
    return Math.max(0, nextThreshold - totalXp);
  }, [currentTier, totalXp]);
  const isMaxTier = currentTier >= TIER_THRESHOLDS.length;

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

  // ─── Parallax scroll + idle bounce for floating orbs ───
  const scrollY = useRef(new Animated.Value(0)).current;

  // Tiap orb punya animasi idle sendiri (fase & durasi berbeda) supaya terlihat
  // hidup: naik-turun halus "mantul" sebagai pemanis, tanpa mengganggu parallax.
  const orbBounce = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const loops = orbBounce.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800 + i * 350,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1800 + i * 350,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const starts = loops.map((loop, i) => setTimeout(() => loop.start(), i * 900));
    return () => {
      loops.forEach((l) => l.stop());
      starts.forEach(clearTimeout);
    };
  }, [orbBounce]);

  const orbSpecs = [
    {
      width: 160,
      height: 160,
      backgroundColor: isDark ? "#3a2050" : "#ffd6ee",
      top: "-5%",
      left: "-10%",
      opacity: 0.5,
      parallaxRange: [0, -80],
      bounceRange: [0, -12],
    },
    {
      width: 200,
      height: 200,
      backgroundColor: C.secondaryContainer,
      top: "35%",
      right: "-15%",
      opacity: 0.45,
      parallaxRange: [0, -120],
      bounceRange: [0, 14],
    },
    {
      width: 120,
      height: 120,
      backgroundColor: C.tertiaryContainer,
      bottom: "10%",
      left: "5%",
      opacity: 0.4,
      parallaxRange: [0, -160],
      bounceRange: [0, -10],
    },
    // 4 orb tambahan — lebih meriah, tetap halus & tidak menutupi konten.
    {
      width: 96,
      height: 96,
      backgroundColor: isDark ? "#4a2a5e" : "#ffd6a5",
      top: "6%",
      right: "6%",
      opacity: 0.4,
      parallaxRange: [0, -60],
      bounceRange: [0, 10],
    },
    {
      width: 64,
      height: 64,
      backgroundColor: isDark ? "#245046" : "#a5e8d8",
      top: "52%",
      left: "2%",
      opacity: 0.4,
      parallaxRange: [0, -100],
      bounceRange: [0, -8],
    },
    {
      width: 110,
      height: 110,
      backgroundColor: isDark ? "#3a2f5a" : "#c9b6ff",
      bottom: "2%",
      right: "10%",
      opacity: 0.4,
      parallaxRange: [0, -140],
      bounceRange: [0, 12],
    },
    {
      width: 52,
      height: 52,
      backgroundColor: isDark ? "#5a3244" : "#ffb4c8",
      top: "22%",
      left: "18%",
      opacity: 0.45,
      parallaxRange: [0, -50],
      bounceRange: [0, -6],
    },
  ];

  // ─── "Kata Ajaib" popup state ───
  const [magicVisible, setMagicVisible] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState(false);
  const [magicWord, setMagicWord] = useState<VocabularyDoc | null>(null);
  const [magicClue, setMagicClue] = useState("");

  // Animasi kemunculan popup Kata Ajaib — spring ceria (sedikit memantul).
  const magicAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (magicVisible) {
      magicAnim.setValue(0);
      Animated.spring(magicAnim, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [magicVisible, magicAnim]);
  const magicScale = magicAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const magicTranslateY = magicAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const loadMagicWord = useCallback(async () => {
    setMagicLoading(true);
    setMagicError(false);
    try {
      const words = await vocabularyRepository.getRandomWords(10);
      // Pilih kata yang punya setidaknya satu clue non-sinonim/antonim.
      const pool = words.filter((w) =>
        [w.clue_1, w.clue_2, w.clue_3].some((c) => c && !CLUE_SYN_ANT_RE.test(c)),
      );
      const chosen = (pool.length > 0 ? pool : words)[
        Math.floor(Math.random() * (pool.length > 0 ? pool.length : Math.max(1, words.length)))
      ];
      if (!chosen) throw new Error("Kosakata kosong");
      setMagicWord(chosen);
      setMagicClue(pickMagicClue(chosen));
    } catch {
      setMagicError(true);
      setMagicWord(null);
    } finally {
      setMagicLoading(false);
    }
  }, []);

  const openMagicWord = useCallback(() => {
    setMagicVisible(true);
    void loadMagicWord();
  }, [loadMagicWord]);

  const handlePlay = () => {
    reset();
    navigation.navigate("Game");
  };

  const heroBg = isDark ? "rgba(42,26,48,0.85)" : "rgba(255,255,255,0.7)";

  return (
    <ScreenFade style={[styles.root, { backgroundColor: C.background }]}>
      {/* ─── Floating Background Shapes (Parallax + idle bounce) ─── */}
      <View style={styles.floatingContainer} pointerEvents="none">
        {orbSpecs.map((spec, i) => (
          <Animated.View
            key={i}
            style={[
              styles.floatingOrb,
              {
                width: spec.width,
                height: spec.height,
                backgroundColor: spec.backgroundColor,
                top: spec.top as any,
                left: spec.left as any,
                right: spec.right as any,
                bottom: spec.bottom as any,
                opacity: spec.opacity,
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [0, 300],
                      outputRange: spec.parallaxRange,
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    translateY: orbBounce[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: spec.bounceRange,
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* ═══ Top AppBar ═══ */}
        <View style={[styles.topBar, { backgroundColor: C.surface }]}>
          <View style={styles.topBarLeft}>
            <UserAvatar name={user?.displayName} avatarUrl={user?.avatarUrl} size={36} />
            <View style={styles.topBarTitleCol}>
              <Text style={[styles.appTitle, { color: C.primary }]}>KotaKata AI</Text>
              <Text style={[styles.userName, { color: C.textSecondary }]} numberOfLines={1}>
                {user?.displayName ?? "Pemain"}
              </Text>
            </View>
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
              {isMaxTier
                ? "Kamu sudah berada di level tertinggi! 🏆"
                : `Dapatkan ${remainingXp} XP lagi untuk naik ke level`}
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

        {/* ═══ Action Grid: Misi Harian + Kata Ajaib — lebar 48% (sama dgn bento) ═══ */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: C.tertiaryContainer }]}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Text style={styles.actionCardIcon}>🏆</Text>
            <Text style={[styles.actionCardLabel, { color: C.text }]}>Misi Harian</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: C.secondaryContainer }]}
            activeOpacity={0.8}
            onPress={openMagicWord}
          >
            <Text style={styles.actionCardIcon}>✨</Text>
            <Text style={[styles.actionCardLabel, { color: C.text }]}>Kata Ajaib</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Koleksi Terbaru (Bento) — tinggi asli: Profil besar, sisanya kecil ═══ */}
        <View style={styles.bentoSection}>
          <Text style={[styles.bentoTitle, { color: C.text }]}>Koleksi Terbaru</Text>
          <View style={styles.bentoGrid}>
            {/* Kolom kiri: Profil (besar) + Pengaturan (kecil) */}
            <View style={styles.bentoCol}>
              <TouchableOpacity
                style={[styles.bentoLargeCard, { backgroundColor: "#FF8A65" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Profile")}
              >
                <View style={styles.bentoLargeContent}>
                  <Text style={styles.bentoLargeEmoji}>🎨</Text>
                  <Text style={[styles.bentoLargeLabel, { color: "#FFFFFF" }]}>Profil</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bentoSmallCard, { backgroundColor: "#74B9FF" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Settings")}
              >
                <View style={styles.bentoSmallContent}>
                  <Text style={styles.bentoSmallEmoji}>⚙️</Text>
                  <Text style={[styles.bentoSmallLabel, { color: "#FFFFFF" }]}>Pengaturan</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Kolom kanan: Kata Ditemukan (kecil) + Sejarah Permainan (besar) */}
            <View style={styles.bentoCol}>
              <TouchableOpacity
                style={[styles.bentoSmallCard, { backgroundColor: "#00B894" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("History")}
              >
                <View style={styles.bentoSmallContent}>
                  <Text style={styles.bentoSmallEmoji}>🔍</Text>
                  <Text style={[styles.bentoSmallLabel, { color: "#FFFFFF" }]}>Kata Ditemukan</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bentoLargeCard, { backgroundColor: "#8E6CC9" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("GameHistory")}
              >
                <View style={styles.bentoLargeContent}>
                  <Text style={styles.bentoLargeEmoji}>🕹️</Text>
                  <Text style={[styles.bentoLargeLabel, { color: "#FFFFFF" }]}>Sejarah Permainan</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── Popup "Kata Ajaib" ─── */}
      <Modal
        visible={magicVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMagicVisible(false)}
      >
        <View style={styles.magicOverlay}>
          <Animated.View
            style={[
              styles.magicCard,
              {
                backgroundColor: C.surface,
                opacity: magicAnim,
                transform: [{ scale: magicScale }, { translateY: magicTranslateY }],
              },
            ]}
          >
            <Text style={styles.magicEmoji}>✨</Text>
            <Text style={[styles.magicTitle, { color: C.primary }]}>Kata Ajaib</Text>

            {magicLoading ? (
              <ActivityIndicator color={C.primary} style={styles.magicLoading} />
            ) : magicError ? (
              <Text style={[styles.magicError, { color: C.error }]}>
                Gagal mengambil kata. Periksa koneksi lalu coba lagi.
              </Text>
            ) : magicWord ? (
              <>
                <Text style={[styles.magicWord, { color: C.text }]}>{magicWord.word}</Text>
                <Text style={[styles.magicTier, { color: C.textSecondary }]}>
                  Tier {magicWord.tier_level}
                </Text>
                <View style={[styles.magicClueBox, { backgroundColor: C.secondaryContainer }]}>
                  <Text style={[styles.magicClue, { color: C.text }]}>{magicClue}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.magicButtons}>
              <TouchableOpacity
                style={[styles.magicBtn, { backgroundColor: C.secondaryContainer }]}
                activeOpacity={0.7}
                onPress={() => void loadMagicWord()}
                disabled={magicLoading}
              >
                <Text style={[styles.magicBtnText, { color: C.secondary }]}>
                  {magicLoading ? "Memuat…" : "🔄 Kata Lain"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.magicBtn, { backgroundColor: C.primary }]}
                activeOpacity={0.7}
                onPress={() => setMagicVisible(false)}
              >
                <Text style={[styles.magicBtnText, { color: "#FFFFFF" }]}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScreenFade>
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
  topBarTitleCol: { justifyContent: "center" },
  userName: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  appTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5, lineHeight: 20 },
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
    textAlign: "center",
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

  /* ─── Action Grid (Misi Harian + Kata Ajaib) — lebar sama dgn bento (48%) ─── */
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 8,
  },
  actionCardIcon: { fontSize: 28 },
  actionCardLabel: { fontSize: 14, fontWeight: "700", textAlign: "center" },

  /* ─── Bento Section (Koleksi Terbaru) — tinggi asli: besar 180, kecil 47% ─── */
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
    gap: 10,
  },
  /* Kolom independen: kartu menumpuk dengan gap 10 (rapat seperti
     Profil→Pengaturan), tidak lagi sejajar antar kolom. */
  bentoCol: {
    flex: 1,
    gap: 10,
  },
  bentoLargeCard: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bentoLargeContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    gap: 6,
  },
  bentoLargeEmoji: { fontSize: 28 },
  bentoLargeLabel: { fontSize: 14, fontWeight: "700" },
  bentoSmallCard: {
    height: 84,
    borderRadius: 14,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bentoSmallContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    gap: 4,
  },
  bentoSmallEmoji: { fontSize: 24 },
  bentoSmallLabel: { fontSize: 13, fontWeight: "700" },

  /* ─── Popup Kata Ajaib ─── */
  magicOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  magicCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  magicEmoji: { fontSize: 40 },
  magicTitle: { fontSize: 18, fontWeight: "800" },
  magicLoading: { marginVertical: 24 },
  magicError: { fontSize: 13, textAlign: "center", marginVertical: 12 },
  magicWord: { fontSize: 34, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  magicTier: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  magicClueBox: {
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginTop: 4,
  },
  magicClue: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  magicButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  magicBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  magicBtnText: { fontSize: 14, fontWeight: "700" },
});
