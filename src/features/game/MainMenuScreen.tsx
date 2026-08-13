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
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
  TIER_PHILOSOPHIES,
  TIER_COLORS,
} from "../../domain/usecases/xpEngine";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { userRepository } from "../../data/repositories/userRepository";
import type { VocabularyDoc, UserDoc } from "../../data/models/schemas";
import { loggerInfo } from "../../utils/logger";
import AppModal from "../../presentation/components/common/AppModal";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { play } from "../../utils/sound";
import { getAiProviderConfig, requestAiWords } from "../../utils/aiProvider";

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
  const { height: winH } = useWindowDimensions();
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

  // ─── "Main Mode AI" state ───
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSetupVisible, setAiSetupVisible] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  // ─── Dialog perubahan tier (naik/turun) — HANYA di Main Menu ───
  // Deteksi saat MENU kembali di-fokus (mis. pulang dari layar Game, di mana
  // totalXp diperbarui saat papan selesai). Dua lapis pengaman:
  //   1. profileReady — jangan bandingkan tier sebelum profil cloud disinkron
  //      (kalau tidak, dialog "Naik ke Tier" palsu muncul saat app dibuka
  //      karena totalXp naik 0 → XP profil).
  //   2. Seed pertama tanpa dialog — transisi 0 → XP saat fokus pertama hanya
  //      jadi baseline, bukan dianggap "baru naik tier".
  const [tierDialog, setTierDialog] = useState<{ tier: number; up: boolean } | null>(null);
  const prevTierRef = useRef<number | null>(null);
  const profileReady = useGameStore((s) => s.profileReady);
  useFocusEffect(
    useCallback(() => {
      if (!profileReady) return;
      const t = calcTier(totalXp);
      const prev = prevTierRef.current;
      prevTierRef.current = t;
      if (prev != null && prev !== t) {
        setTierDialog({ tier: t, up: t > prev });
      }
    }, [totalXp, profileReady]),
  );

  // Informasi visual tier untuk dialog (warna, nama, filosofi) — aman dari
  // tier di luar rentang (mis. 0/11) dengan clamp.
  const tierDialogInfo = useMemo(() => {
    if (!tierDialog) return null;
    const idx = Math.max(0, Math.min(tierDialog.tier - 1, TIER_COLORS.length - 1));
    return {
      color: TIER_COLORS[idx],
      name: TIER_NAMES[idx],
      philosophy: TIER_PHILOSOPHIES[idx],
    };
  }, [tierDialog]);

  // ─── "Daftar Tier" modal state ───
  const [tierListVisible, setTierListVisible] = useState(false);

  // ─── "Leaderboard" modal state — lazy-load per 25 baris + posisi user ───
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoadingMore, setLeaderboardLoadingMore] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserDoc[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  // Posisi pemain yang login (rank + baris) — ditampilkan di atas tombol Tutup
  // supaya user posisi jauh (#100) langsung tahu di mana dia berada.
  const [leaderboardMyRank, setLeaderboardMyRank] = useState<(UserDoc & { rank: number }) | null>(null);

  const openLeaderboard = useCallback(async () => {
    play("tap");
    setLeaderboardVisible(true);
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    setLeaderboardUsers([]);
    setLeaderboardTotal(0);
    setLeaderboardMyRank(null);
    try {
      // RPC get_leaderboard_paged (security definer) — RLS users hanya
      // membolehkan user membaca barisnya sendiri, jadi baca lintas-user lewat
      // RPC. Urutan sudah di sisi server: total XP tertinggi dulu; kalau sama,
      // pemain yang MENCAPAI XP itu lebih dulu (updated_at lebih awal) menang
      // — "level & waktu kenaikan". Halaman pertama (25) + posisi user.
      const [page, myRank] = await Promise.all([
        userRepository.getLeaderboardPage(25, 0),
        user?.id
          ? userRepository.getLeaderboardRank(user.id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setLeaderboardUsers(page.users);
      setLeaderboardTotal(page.total);
      setLeaderboardMyRank(myRank);
    } catch {
      setLeaderboardError(true);
      setLeaderboardUsers([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [user?.id]);

  // Muat halaman berikutnya saat user scroll ke bawah (lazy-load, 25/request).
  const loadMoreLeaderboard = useCallback(async () => {
    if (leaderboardLoadingMore) return;
    if (leaderboardUsers.length >= leaderboardTotal) return;
    setLeaderboardLoadingMore(true);
    try {
      const page = await userRepository.getLeaderboardPage(25, leaderboardUsers.length);
      setLeaderboardUsers((prev) => {
        const seen = new Set(prev.map((u) => u.user_id));
        const fresh = page.users.filter((u) => !seen.has(u.user_id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      setLeaderboardTotal(page.total);
    } catch {
      // Gagal memuat halaman berikutnya — biarkan user scroll lagi.
    } finally {
      setLeaderboardLoadingMore(false);
    }
  }, [leaderboardLoadingMore, leaderboardUsers.length, leaderboardTotal]);

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
    play("popup");
    setMagicVisible(true);
    void loadMagicWord();
  }, [loadMagicWord]);

  const handlePlay = () => {
    play("tap");
    reset();
    navigation.navigate("Game");
  };

  // "Main Mode AI": cek provider tersimpan → minta soal dari AI → main.
  // Belum diatur → dialog ajakan atur; request gagal → dialog error dengan
  // opsi coba lagi / main mode normal (mode normal tidak pernah rusak).
  const handlePlayAi = useCallback(async () => {
    play("tap");
    try {
      const cfg = await getAiProviderConfig();
      if (!cfg) {
        setAiSetupVisible(true);
        return;
      }
      setAiLoading(true);
      setAiError(null);
      aiAbortRef.current?.abort();
      const controller = new AbortController();
      aiAbortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), 35000);
      try {
        // Soal AI disesuaikan dengan tier pemain (kata di tier rendah mudah,
        // makin tinggi makin menantang) supaya tetap seru.
        const playerTier = calcTier(useGameStore.getState().totalXp);
        const words = await requestAiWords(cfg, playerTier, controller.signal);
        // Papan AI selalu fresh: reset membersihkan state (termasuk aiWords lama),
        // lalu kata AI dari provider dipasang sebelum masuk ke layar Game.
        // aiMode di-set EKSPLISIT — papan ini tidak akan menghitung XP sama sekali.
        reset();
        useGameStore.getState().setAiMode(true);
        useGameStore.getState().setAiWords(words);
        navigation.navigate("Game");
        // Simpan soal AI yang BELUM terdaftar ke database vocabulary (dedup di
        // server via RPC) supaya kosakata game makin bertambah. Fire-and-forget:
        // tidak menahan jalannya game kalau jaringan lambat / offline.
        vocabularyRepository
          .saveAiWords(
            words.map((w) => ({
              word: w.word,
              clue_1: w.clue_1,
              clue_2: w.clue_2,
              tier_level: playerTier,
            })),
          )
          .then((n) => {
            if (n > 0) loggerInfo(`${n} kata baru dari Main Mode AI tersimpan ke database`);
          })
          .catch((err) => loggerInfo("Gagal simpan soal AI ke database", err));
      } catch (err: any) {
        if (controller.signal.aborted) {
          setAiLoading(false);
          return;
        }
        setAiError(err?.message ?? "Gagal memuat soal dari AI.");
      } finally {
        clearTimeout(timer);
        setAiLoading(false);
      }
    } catch {
      // Gagal baca config (mis. storage) — anggap belum diatur.
      setAiSetupVisible(true);
    }
  }, [navigation, reset]);

  const heroBg = isDark ? "rgba(42,26,48,0.85)" : "rgba(255,255,255,0.7)";

  // Tinggi kartu bento proporsional terhadap layar (layar pendek tidak
  // membuat konten terpotong / terlalu berjarak).
  const bentoLargeH = Math.max(120, Math.min(180, winH * 0.24));
  const bentoSmallH = Math.max(60, Math.min(84, winH * 0.115));

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

        {/* ═══ Main Action: Mulai Bermain ═══ */}          <TouchableOpacity
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
            onPress={handlePlayAi}
          >
            <Text style={styles.actionCardIcon}>🤖</Text>
            <Text style={[styles.actionCardLabel, { color: C.text }]}>Main Mode AI</Text>
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

        {/* ═══ Action Grid 2: Daftar Tier + Leaderboard ═══ */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: C.secondaryContainer }]}
            activeOpacity={0.8}
            onPress={() => {
              play("tap");
              setTierListVisible(true);
            }}
          >
            <Text style={styles.actionCardIcon}>🏆</Text>
            <Text style={[styles.actionCardLabel, { color: C.text }]}>Daftar Tier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: C.tertiaryContainer }]}
            activeOpacity={0.8}
            onPress={() => {
              void openLeaderboard();
            }}
          >
            <Text style={styles.actionCardIcon}>🏅</Text>
            <Text style={[styles.actionCardLabel, { color: C.text }]}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Koleksi Terbaru (Bento) — tinggi asli: Profil besar, sisanya kecil ═══ */}
        <View style={styles.bentoSection}>
          <Text style={[styles.bentoTitle, { color: C.text }]}>Koleksi Terbaru</Text>
          <View style={styles.bentoGrid}>
            {/* Kolom kiri: Profil (besar) + Pengaturan (kecil) */}
            <View style={styles.bentoCol}>
              <TouchableOpacity
                style={[
                  styles.bentoLargeCard,
                  { backgroundColor: "#FF8A65", height: bentoLargeH },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  play("tap");
                  navigation.navigate("Profile");
                }}
              >
                <View style={styles.bentoLargeContent}>
                  <Text style={styles.bentoLargeEmoji}>🎨</Text>
                  <Text style={[styles.bentoLargeLabel, { color: "#FFFFFF" }]}>Profil</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bentoSmallCard,
                  { backgroundColor: "#74B9FF", height: bentoSmallH },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  play("tap");
                  navigation.navigate("Settings");
                }}
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
                style={[
                  styles.bentoSmallCard,
                  { backgroundColor: "#00B894", height: bentoSmallH },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  play("tap");
                  navigation.navigate("History");
                }}
              >
                <View style={styles.bentoSmallContent}>
                  <Text style={styles.bentoSmallEmoji}>🔍</Text>
                  <Text style={[styles.bentoSmallLabel, { color: "#FFFFFF" }]}>Kata Ditemukan</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bentoLargeCard,
                  { backgroundColor: "#8E6CC9", height: bentoLargeH },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  play("tap");
                  navigation.navigate("GameHistory");
                }}
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
      <AppModal
        visible={magicVisible}
        title="✨ Kata Ajaib"
        onClose={() => setMagicVisible(false)}
      >
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
            style={[styles.magicBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              void loadMagicWord();
            }}
            disabled={magicLoading}
          >
            <Text style={[styles.magicBtnText, { color: "#FFFFFF" }]}>
              {magicLoading ? "Memuat…" : "🔄 Kata Lain"}
            </Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* ─── Konfirmasi provider AI belum diatur ─── */}
      <ConfirmDialog
        visible={aiSetupVisible}
        title="Main Mode AI"
        message="Provider AI belum diatur. Mau diatur dulu sebelum main? Kamu bisa memakai API key dari OpenRouter, HuggingFace, atau URL kustom."
        confirmText="Atur Sekarang"
        cancelText="Batal"
        onConfirm={() => {
          play("tap");
          setAiSetupVisible(false);
          navigation.navigate("AiProvider");
        }}
        onCancel={() => setAiSetupVisible(false)}
        emoji="🤖"
      />

      {/* ─── Overlay: menyusun soal dari AI ─── */}
      <Modal
        visible={aiLoading}
        transparent
        animationType="fade"
        onRequestClose={() => setAiLoading(false)}
      >
        <View style={styles.aiOverlay}>
          <View style={[styles.aiCard, { backgroundColor: C.surface }]}>
            <Text style={styles.aiEmoji}>🤖</Text>
            <ActivityIndicator color={C.primary} size="large" style={styles.aiSpinner} />
            <Text style={[styles.aiLoadingTitle, { color: C.text }]}>Menyusun soal dari AI…</Text>
            <Text style={[styles.aiLoadingHint, { color: C.textSecondary }]}>
              Provider sedang membuat kata & petunjuk untuk papanku.
            </Text>
            <TouchableOpacity
              style={[styles.aiCancelBtn, { backgroundColor: C.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => {
                play("tap");
                aiAbortRef.current?.abort();
                setAiLoading(false);
              }}
            >
              <Text style={[styles.aiCancelText, { color: C.secondary }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Error: soal AI gagal dimuat ─── */}
      <AppModal
        visible={aiError !== null}
        title="😕 Soal AI Gagal Dimuat"
        onClose={() => setAiError(null)}
      >
        <Text style={[styles.aiErrorMsg, { color: C.textSecondary }]}>{aiError}</Text>
        <Text style={[styles.aiErrorHint, { color: C.textSecondary }]}>
          Periksa pengaturan provider, atau main mode normal dulu.
        </Text>
        <View style={styles.aiErrorButtons}>
          <TouchableOpacity
            style={[styles.aiErrorBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              play("tap");
              setAiError(null);
              void handlePlayAi();
            }}
          >
            <Text style={styles.aiErrorBtnPrimaryText}>🔄 Coba Lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aiErrorBtn, { backgroundColor: C.secondaryContainer }]}
            activeOpacity={0.8}
            onPress={() => {
              play("tap");
              setAiError(null);
              reset();
              navigation.navigate("Game");
            }}
          >
            <Text style={[styles.aiErrorBtnSecondaryText, { color: C.secondary }]}>
              🎮 Main Mode Normal
            </Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* ─── Popup Daftar Tier (highlight tier player) ─── */}
      <AppModal
        visible={tierListVisible}
        title="🏆 Daftar Tier"
        onClose={() => setTierListVisible(false)}
      >
        {/* nestedScrollEnabled (Android) + flexShrink (dari tierModalScroll)
            supaya daftar bisa di-swipe dengan jari di HP — bukan hanya scroll
            mouse di web. */}
        <ScrollView
          style={styles.tierModalScroll}
          contentContainerStyle={styles.tierModalContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {TIER_THRESHOLDS.map((threshold, i) => {
            const tierNo = i + 1;
            const isCurrent = tierNo === currentTier;
            const color = TIER_COLORS[i];
            return (
              <View
                key={tierNo}
                style={[
                  styles.tierRow,
                  {
                    backgroundColor: isCurrent ? color + "1A" : C.secondaryContainer,
                    borderColor: isCurrent ? color : C.border,
                  },
                ]}
              >
                <View style={[styles.tierDot, { backgroundColor: color }]} />
                <View style={styles.tierRowCol}>
                  <View style={styles.tierRowTop}>
                    <Text style={[styles.tierRowName, { color: C.text }]} numberOfLines={1}>
                      Tier {tierNo} · {TIER_NAMES[i]}
                    </Text>
                    {isCurrent ? (
                      <Text style={[styles.tierRowYou, { color }]}>Kamu di sini</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.tierRowXp, { color: C.textSecondary }]}>
                    {threshold.toLocaleString("id-ID")} XP
                  </Text>
                  <Text style={[styles.tierRowPhil, { color: C.textSecondary }]}>
                    {TIER_PHILOSOPHIES[i]}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </AppModal>

      {/* ─── Popup Leaderboard — lazy-load 25/halaman, posisi user di atas Tutup ─── */}
      <AppModal
        visible={leaderboardVisible}
        title="🏅 Leaderboard"
        onClose={() => setLeaderboardVisible(false)}
      >
        <Text style={[styles.lbSubtitle, { color: C.textSecondary }]}>
          Urutan berdasarkan level (XP) & waktu kenaikan.
        </Text>
            {leaderboardLoading ? (
              <ActivityIndicator color={C.primary} style={styles.lbLoading} />
            ) : leaderboardError ? (
              <Text style={[styles.lbError, { color: C.error }]}>
                Gagal memuat leaderboard. Periksa koneksi lalu coba lagi.
              </Text>
            ) : leaderboardUsers.length === 0 ? (
              <Text style={[styles.lbError, { color: C.textSecondary }]}>
                Belum ada pemain lain. Ajak temanmu bermain!
              </Text>
            ) : (
              <ScrollView
                style={styles.tierModalScroll}
                contentContainerStyle={styles.tierModalContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                scrollEventThrottle={200}
                onScroll={({ nativeEvent }) => {
                  const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
                  // Mendekati dasar daftar → muat halaman berikutnya.
                  if (
                    contentOffset.y + layoutMeasurement.height + 60 >=
                    contentSize.height
                  ) {
                    void loadMoreLeaderboard();
                  }
                }}
              >
                {leaderboardUsers.map((u, idx) => {
                  const rank = idx + 1;
                  const isMe = u.user_id === user?.id;
                  const tierColor =
                    TIER_COLORS[
                      Math.max(0, Math.min(u.current_tier - 1, TIER_COLORS.length - 1))
                    ];
                  const tierName =
                    TIER_NAMES[
                      Math.max(0, Math.min(u.current_tier - 1, TIER_NAMES.length - 1))
                    ];
                  return (
                    <View
                      key={u.user_id}
                      style={[
                        styles.lbRow,
                        {
                          backgroundColor: isMe ? C.primary + "1A" : C.secondaryContainer,
                          borderColor: isMe ? C.primary : C.border,
                        },
                      ]}
                    >
                      <View style={styles.lbRankWrap}>
                        <Text style={[styles.lbRank, { color: rank <= 3 ? "#D4AF37" : C.textSecondary }]}>
                          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                        </Text>
                      </View>
                      <View style={styles.lbRowCol}>
                        <Text style={[styles.lbName, { color: C.text }]} numberOfLines={1}>
                          {u.display_name || "Pemain"}
                          {isMe ? " (kamu)" : ""}
                        </Text>
                        <Text style={[styles.lbTier, { color: tierColor }]} numberOfLines={1}>
                          Tier {u.current_tier} · {tierName}
                        </Text>
                      </View>
                      <Text style={[styles.lbXp, { color: C.secondary }]}>
                        {u.total_xp.toLocaleString("id-ID")} XP
                      </Text>
                    </View>
                  );
                })}
                {leaderboardLoadingMore ? (
                  <ActivityIndicator color={C.primary} style={styles.lbLoadMore} />
                ) : null}
              </ScrollView>
            )}

            {/* Posisi pemain yang login — selalu terlihat tanpa perlu scroll jauh */}
            {leaderboardMyRank && (
              <View style={[styles.lbMyRankRow, { backgroundColor: C.primary + "14", borderColor: C.primary }]}>
                <Text style={[styles.lbMyRankLabel, { color: C.textSecondary }]} numberOfLines={1}>
                  Posisimu sekarang
                </Text>
                <View style={styles.lbMyRankContent}>
                  <View style={styles.lbRankWrap}>
                    <Text style={[styles.lbRank, { color: "#D4AF37" }]}>#{leaderboardMyRank.rank}</Text>
                  </View>
                  <View style={styles.lbRowCol}>
                    <Text style={[styles.lbName, { color: C.text }]} numberOfLines={1}>
                      {leaderboardMyRank.display_name || "Pemain"} (kamu)
                    </Text>
                    <Text style={[styles.lbTier, { color: C.secondary }]} numberOfLines={1}>
                      Tier {leaderboardMyRank.current_tier} ·
                      {" "}
                      {TIER_NAMES[
                        Math.max(0, Math.min(leaderboardMyRank.current_tier - 1, TIER_NAMES.length - 1))
                      ]}
                    </Text>
                  </View>
                  <Text style={[styles.lbXp, { color: C.secondary }]}>
                    {leaderboardMyRank.total_xp.toLocaleString("id-ID")} XP
                  </Text>
                </View>
              </View>
            )}
      </AppModal>

      {/* ─── Dialog perubahan tier — HANYA di Main Menu ───
          Naik: konfeti 🎉. Turun: hujan murung 🌧️. Notifikasi tier tidak
          lagi muncul di layar Game / dialog permainan selesai. */}
      {tierDialog && tierDialogInfo && (
        <AppModal
          visible
          title={tierDialog.up ? "🎉 TIER UP!" : "Tier Turun"}
          onClose={() => setTierDialog(null)}
          confetti={tierDialog.up ? "celebrate" : "sad"}
        >
          <View style={styles.tierDialogBody}>
            <Text style={styles.tierDialogEmoji}>{tierDialog.up ? "🏆" : "🌧️"}</Text>
            <Text style={[styles.tierDialogName, { color: tierDialogInfo.color }]}>
              Tier {tierDialog.tier} — {tierDialogInfo.name}
            </Text>
            <Text style={[styles.tierDialogPhil, { color: C.textSecondary }]}>
              {tierDialogInfo.philosophy}
            </Text>
            <Text style={[styles.tierDialogMsg, { color: C.textSecondary }]}>
              {tierDialog.up
                ? "Selamat! Levelmu naik — lanjutkan mengukir kata-kata indah. 🏆"
                : "XP kamu berkurang, level turun. Jangan menyerah — tetap ukir kata-kata indah."}
            </Text>
          </View>
        </AppModal>
      )}
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

  /* ─── Main Mode AI ─── */
  aiOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  aiCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  aiEmoji: { fontSize: 40 },
  aiSpinner: { marginVertical: 10 },
  aiLoadingTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  aiLoadingHint: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  aiCancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 999,
  },
  aiCancelText: { fontSize: 14, fontWeight: "700" },
  aiErrorMsg: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  aiErrorHint: { fontSize: 12, lineHeight: 17, textAlign: "center" },
  aiErrorButtons: { gap: 8, width: "100%", marginTop: 6 },
  aiErrorBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  aiErrorBtnPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  aiErrorBtnSecondaryText: { fontSize: 13, fontWeight: "700" },

  /* ─── Daftar Tier & Leaderboard Modals ─── */
  // flexShrink: 1 — dalam AppModal (kartu dibatasi maxHeight), ScrollView
  // menyusut ke tinggi kartu sehingga bisa di-scroll (swipe) di HP. Tanpa ini
  // tinggi ScrollView = isi penuh → tidak bisa digeser di perangkat seluler.
  tierModalScroll: { flexShrink: 1 },
  tierModalContent: { gap: 8, paddingBottom: 4 },
  lbLoadMore: { marginVertical: 10 },
  lbMyRankRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  lbMyRankLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  lbMyRankContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tierRowCol: { flex: 1, gap: 3 },
  tierRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  tierRowName: { fontSize: 14, fontWeight: "800", flexShrink: 1 },
  tierRowYou: { fontSize: 11, fontWeight: "800" },
  tierRowXp: { fontSize: 11, fontWeight: "600" },
  tierRowPhil: { fontSize: 11, lineHeight: 16 },
  tierModalClose: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  tierModalCloseText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  lbSubtitle: { fontSize: 12, textAlign: "center", marginTop: -6 },
  lbLoading: { marginVertical: 32 },
  lbError: { fontSize: 13, textAlign: "center", marginVertical: 24, lineHeight: 18 },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lbRankWrap: { width: 34, alignItems: "center" },
  lbRank: { fontSize: 16, fontWeight: "900" },
  lbRowCol: { flex: 1, gap: 2 },
  lbName: { fontSize: 14, fontWeight: "800" },
  lbTier: { fontSize: 11, fontWeight: "700" },
  lbXp: { fontSize: 13, fontWeight: "800" },

  /* ─── Dialog perubahan tier ─── */
  tierDialogBody: { alignItems: "center", gap: 8, paddingVertical: 4 },
  tierDialogEmoji: { fontSize: 48 },
  tierDialogName: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  tierDialogPhil: { fontSize: 12, lineHeight: 18, textAlign: "center", fontStyle: "italic" },
  tierDialogMsg: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
