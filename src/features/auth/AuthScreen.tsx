import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useAuth } from "./useAuth";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import FloatingOrbs, {
  type FloatingOrbSpec,
} from "../../presentation/components/common/FloatingOrbs";
import { surfaceStyle } from "../../utils/skin";

// Dokumen legal dimuat dari raw.githubusercontent.com (pengganti rawgit.com
// yang sudah berhenti beroperasi). Markdown di-render oleh MarkdownScreen.
const TERMS_URL =
  "https://raw.githubusercontent.com/fadhly-permata/KotaKata.AI/main/docs/TERMS.md";
const PRIVACY_URL =
  "https://raw.githubusercontent.com/fadhly-permata/KotaKata.AI/main/docs/PRIVACY.md";

export default function AuthScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // PLAN-038: halaman login ikut tema aplikasi aktif (bukan palet hardcoded
  // lagi) — warna, radius, dan bayangan permukaan diambil dari token tema.
  const C = theme.colors;

  // Navigate to MainMenu once authenticated. Hanya user Google yang diizinkan
  // masuk (PLAN-030): session anonim ditolak — tidak boleh melewati halaman
  // login (RootNavigator otomatis mengeluarkan session anonim).
  useEffect(() => {
    if (user && !user.isAnonymous && !authLoading) {
      navigation.reset({ index: 0, routes: [{ name: "MainMenu" }] });
    }
  }, [user, authLoading, navigation]);

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoSacle = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef([new Animated.Value(0)]).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Safe-area inset status bar (native) — konten login tidak masuk ke balik
  // status bar (edge-to-edge Android) supaya tidak terlihat fullscreen.
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  // Parallax orb saat scroll — sama seperti main menu (Animated.event).
  const scrollY = useRef(new Animated.Value(0)).current;

  // Hanya beranimasi saat layar mendapat fokus (mitigasi force close
  // PLAN-023/024/027 — jangan menumpuk native-driver loop saat tertutup
  // layar lain di stack navigasi).
  const isFocused = useIsFocused();

  // Orb animations — idle bounce dengan fase & durasi berbeda supaya terlihat
  // hidup (dulu hanya float 12–15s yang nyaris tidak terasa).
  const orbBounce = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    if (!isFocused) return;
    const loops = orbBounce.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1600 + i * 400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1600 + i * 400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    orbBounce.forEach((a) => a.setValue(0));
    const starts = loops.map((loop, i) => setTimeout(() => loop.start(), i * 500));
    return () => {
      loops.forEach((l) => l.stop());
      starts.forEach(clearTimeout);
    };
  }, [orbBounce, isFocused]);

  // Ukuran orb proporsional terhadap layar (HP kecil s/d tablet/web lebar).
  const orbSize = (base: number) =>
    Math.min(base, Math.max(88, Math.min(winW, winH) * 0.32));
  const orbSpecs: FloatingOrbSpec[] = [
    {
      width: orbSize(180),
      height: orbSize(180),
      backgroundColor: C.secondaryContainer,
      top: -64,
      left: -64,
      parallaxRange: [0, -70],
      bounceRange: [0, -16],
      opacity: 0.55,
    },
    {
      width: orbSize(220),
      height: orbSize(220),
      backgroundColor: C.tertiaryContainer,
      bottom: -80,
      right: -64,
      parallaxRange: [0, -100],
      bounceRange: [0, 14],
      opacity: 0.5,
    },
    {
      width: orbSize(120),
      height: orbSize(120),
      backgroundColor: C.accent,
      top: "36%",
      right: "-8%",
      parallaxRange: [0, -50],
      bounceRange: [0, -10],
      opacity: 0.45,
    },
    {
      width: orbSize(84),
      height: orbSize(84),
      backgroundColor: C.secondaryContainer,
      top: "58%",
      left: "-4%",
      parallaxRange: [0, -40],
      bounceRange: [0, 9],
      opacity: 0.4,
    },
  ];

  // Entrance animations — logo, judul, tombol, dan footer muncul bertahap.
  useEffect(() => {
    Animated.stagger(180, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoSacle, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(buttonsOpacity[0], { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(footerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogle = async () => {
    setError("");
    setActionLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || "Gagal masuk dengan Google");
    } finally {
      setActionLoading(false);
    }
  };

  // Splash while checking session
  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.splashContainer}>
          <Text style={styles.splashIcon}>✨</Text>
          <Text style={[styles.splashTitle, { color: C.primary }]}>KotaKata AI</Text>
        </View>
      </View>
    );
  }

  return (
    <ScreenFade orbs={false} style={{ backgroundColor: C.background }}>
      {/* orbs={false}: halaman login punya FloatingOrbs parallax sendiri. */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Floating decorative orbs — parallax + idle bounce (tidak menghalangi
          tap). Komponen bersama FloatingOrbs (dipakai juga oleh Main Menu). */}
      <FloatingOrbs scrollY={scrollY} orbs={orbSpecs} orbBounce={orbBounce} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingVertical: winH < 700 ? 24 : 48,
            paddingTop:
              (winH < 700 ? 24 : 48) + (Platform.OS === "web" ? 0 : insets.top),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* ── Logo & Branding ── */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoSacle }],
            },
          ]}
        >
          <View
            style={[
              styles.logoBox,
              { shadowColor: C.primary },
              surfaceStyle(theme, "raised", 16),
            ]}
          >
            <Text style={[styles.logoIcon, { color: C.primary }]}>✨</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslate }],
            alignItems: "center",
            marginBottom: 36,
          }}
        >
          <Text style={[styles.title, { color: C.primary }]}>KotaKata AI</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Masuk untuk mengukir seloka.
          </Text>
        </Animated.View>

        {/* ── Auth Buttons ── */}
        <View style={styles.authSection}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: C.error + "1A" }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Google */}
            <Animated.View style={{ opacity: buttonsOpacity[0], width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  { shadowColor: "#000" },
                  surfaceStyle(theme, "raised", 999),
                ]}
                activeOpacity={0.8}
                onPress={handleGoogle}
                disabled={actionLoading}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.socialBtnText, { color: C.text }]}>Masuk dengan Google</Text>
                <Text style={[styles.chevron, { color: C.border }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>

          </View>

        {/* ── Footer ── */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={[styles.footerText, { color: C.textSecondary }]}>
            Dengan masuk, Anda menyetujui{" "}
            <Text
              style={[styles.footerLink, { color: C.primary }]}
              onPress={() =>
                navigation.navigate("Markdown", {
                  title: "Ketentuan Layanan",
                  url: TERMS_URL,
                })
              }
            >
              Ketentuan Layanan
            </Text>{" "}
            dan{" "}
            <Text
              style={[styles.footerLink, { color: C.primary }]}
              onPress={() =>
                navigation.navigate("Markdown", {
                  title: "Kebijakan Privasi",
                  url: PRIVACY_URL,
                })
              }
            >
              Kebijakan Privasi
            </Text>{" "}
            kami.
          </Text>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Splash
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  splashIcon: { fontSize: 56 },
  splashTitle: { fontSize: 24, fontWeight: "800" },

  // Header
  headerSection: { alignItems: "center", marginBottom: 20, marginTop: 40 },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  logoIcon: { fontSize: 40 },

  // Title
  title: { fontSize: 34, fontWeight: "900", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 16, lineHeight: 24 },

  // Auth section
  authSection: { gap: 12, marginBottom: 24 },

  // Social buttons
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4285F4",
    marginRight: 14,
    width: 28,
    height: 28,
    textAlign: "center",
    lineHeight: 28,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  socialBtnText: { flex: 1, fontSize: 16, fontWeight: "700" },
  chevron: { fontSize: 22, fontWeight: "300", marginLeft: 8 },


  // Footer
  footer: { alignItems: "center", marginTop: 8, paddingBottom: 20 },
  footerText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  footerLink: { fontWeight: "700" },

  // Error banner
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  errorBannerText: { color: "#E53E3E", fontSize: 13, textAlign: "center", fontWeight: "500" },
});
