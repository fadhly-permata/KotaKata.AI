import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useAuth } from "./useAuth";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type AuthMode = "select" | "email";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// LoginScreen.html inspired palette
const AUTH_LIGHT = {
  bg: "#fef7ff",
  primary: "#e040a0",
  secondary: "#7c52aa",
  tertiary: "#0096cc",
  onSurface: "#2e1a28",
  onSurfaceVariant: "#604868",
  surface: "#FFFFFF",
  outlineVariant: "#dcc8e0",
  secondaryContainer: "#eedcff",
  onSecondaryContainer: "#2e2040",
  error: "#e53e3e",
  orbPink: "#ffd6ee",
  orbBlue: "#c8eaff",
  orbPurple: "#eedcff",
};

const AUTH_DARK = {
  bg: "#1a1020",
  primary: "#f0a0cc",
  secondary: "#c8a8e8",
  tertiary: "#80d0f0",
  onSurface: "#fef7ff",
  onSurfaceVariant: "#b8a0b8",
  surface: "#2a1a30",
  outlineVariant: "#4a3850",
  secondaryContainer: "#3a2850",
  onSecondaryContainer: "#eedcff",
  error: "#ff6b6b",
  orbPink: "#4a2040",
  orbBlue: "#204060",
  orbPurple: "#402060",
};

export default function AuthScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, loading: authLoading, signInAnonymously, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<AuthMode>("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme.mode === "dark";
  const C = isDark ? AUTH_DARK : AUTH_LIGHT;

  // Navigate to MainMenu once authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigation.reset({ index: 0, routes: [{ name: "MainMenu" }] });
    }
  }, [user, authLoading, navigation]);

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoSacle = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Orb animations
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Orb floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 12000, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 15000, useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 15000, useNativeDriver: true }),
      ]),
    ).start();

    // Entrance stagger
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
      Animated.timing(buttonsOpacity[1], { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(buttonsOpacity[2], { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(buttonsOpacity[3], { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(footerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAnonymous = async () => {
    setError("");
    setActionLoading(true);
    try {
      await signInAnonymously();
    } catch (e: any) {
      setError(e.message || "Gagal masuk sebagai tamu");
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi");
      return;
    }
    setError("");
    setActionLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e: any) {
      setError(e.message || "Autentikasi gagal");
    } finally {
      setActionLoading(false);
    }
  };

  // Splash while checking session
  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={styles.splashContainer}>
          <Text style={styles.splashIcon}>✨</Text>
          <Text style={[styles.splashTitle, { color: C.primary }]}>KotaKata AI</Text>
        </View>
      </View>
    );
  }

  return (
    <ScreenFade style={{ backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      {/* Floating decorative orbs */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: 180,
            height: 180,
            backgroundColor: C.orbPink,
            top: -60,
            left: -60,
            transform: [
              {
                translateY: orb1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -40],
                }),
              },
              {
                scale: orb1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: 220,
            height: 220,
            backgroundColor: C.orbBlue,
            bottom: -80,
            right: -60,
            transform: [
              {
                translateY: orb2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 40],
                }),
              },
              {
                scale: orb2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <View style={[styles.logoBox, { backgroundColor: C.surface, shadowColor: C.primary }]}>
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
          <Text style={[styles.subtitle, { color: C.onSurfaceVariant }]}>
            Masuk untuk mengukir seloka.
          </Text>
        </Animated.View>

        {/* ── Auth Buttons ── */}
        {mode === "select" && (
          <View style={styles.authSection}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: isDark ? "#3D1A1A" : "#ffe8e8" }]}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Google */}
            <Animated.View style={{ opacity: buttonsOpacity[0], width: "100%" }}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: C.surface, shadowColor: "#000" }]}
                activeOpacity={0.8}
                onPress={handleGoogle}
                disabled={actionLoading}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.socialBtnText, { color: C.onSurface }]}>Masuk dengan Google</Text>
                <Text style={[styles.chevron, { color: C.outlineVariant }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* TikTok (placeholder — not implemented) */}
            <Animated.View style={{ opacity: buttonsOpacity[1], width: "100%" }}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: "#000000", shadowColor: "#000" }]}
                activeOpacity={0.8}
                disabled
              >
                <Text style={[styles.socialBtnIcon, { color: "#FFF" }]}>♫</Text>
                <Text style={[styles.socialBtnText, { color: "#FFF" }]}>Masuk dengan TikTok</Text>
                <Text style={[styles.chevron, { color: "rgba(255,255,255,0.4)" }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* X / Twitter (placeholder) */}
            <Animated.View style={{ opacity: buttonsOpacity[2], width: "100%" }}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: "#1DA1F2", shadowColor: "#1DA1F2" }]}
                activeOpacity={0.8}
                disabled
              >
                <Text style={[styles.socialBtnIcon, { color: "#FFF" }]}>𝕏</Text>
                <Text style={[styles.socialBtnText, { color: "#FFF" }]}>Masuk dengan X</Text>
                <Text style={[styles.chevron, { color: "rgba(255,255,255,0.4)" }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Facebook (placeholder) */}
            <Animated.View style={{ opacity: buttonsOpacity[3], width: "100%" }}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: "#1877F2", shadowColor: "#1877F2" }]}
                activeOpacity={0.8}
                disabled
              >
                <Text style={[styles.socialBtnIcon, { color: "#FFF" }]}>f</Text>
                <Text style={[styles.socialBtnText, { color: "#FFF" }]}>Masuk dengan Facebook</Text>
                <Text style={[styles.chevron, { color: "rgba(255,255,255,0.4)" }]}>›</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Divider: Atau ── */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: C.outlineVariant }]} />
              <Text style={[styles.dividerText, { color: C.onSurfaceVariant }]}>Atau</Text>
              <View style={[styles.dividerLine, { backgroundColor: C.outlineVariant }]} />
            </View>

            {/* Guest */}
            <TouchableOpacity
              style={[styles.guestBtn, { backgroundColor: C.secondaryContainer }]}
              activeOpacity={0.8}
              onPress={handleAnonymous}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={C.onSecondaryContainer} />
              ) : (
                <>
                  <Text style={[styles.guestIcon, { color: C.onSecondaryContainer }]}>👤</Text>
                  <Text style={[styles.guestBtnText, { color: C.onSecondaryContainer }]}>
                    Lanjut sebagai Tamu
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Email link */}
            <TouchableOpacity
              style={styles.emailLink}
              activeOpacity={0.6}
              onPress={() => setMode("email")}
            >
              <Text style={[styles.emailLinkText, { color: C.onSurfaceVariant }]}>
                Atau masuk dengan email
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Email Form ── */}
        {mode === "email" && (
          <View style={styles.authSection}>
            <View style={[styles.formCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.formTitle, { color: C.onSurface }]}>
                {isSignUp ? "Daftar dengan Email" : "Masuk dengan Email"}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#3a2a40" : "#FFF",
                    color: C.onSurface,
                    borderColor: C.outlineVariant,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={C.onSurfaceVariant}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#3a2a40" : "#FFF",
                    color: C.onSurface,
                    borderColor: C.outlineVariant,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={C.onSurfaceVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? <Text style={[styles.errorText, { color: C.error }]}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.emailSubmit, { backgroundColor: C.primary }]}
                activeOpacity={0.8}
                onPress={handleEmailAuth}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.emailSubmitText}>{isSignUp ? "Daftar" : "Masuk"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchMode}
                activeOpacity={0.6}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
              >
                <Text style={[styles.switchModeText, { color: C.primary }]}>
                  {isSignUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.6}
                onPress={() => {
                  setMode("select");
                  setError("");
                }}
              >
                <Text style={[styles.backText, { color: C.onSurfaceVariant }]}>← Kembali</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={[styles.footerText, { color: C.onSurfaceVariant }]}>
            Dengan masuk, Anda menyetujui{" "}
            <Text style={[styles.footerLink, { color: C.primary }]}>Ketentuan Layanan</Text> dan{" "}
            <Text style={[styles.footerLink, { color: C.primary }]}>Kebijakan Privasi</Text> kami.
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

  // Floating orbs
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.5,
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
  socialBtnIcon: { fontSize: 18, marginRight: 14, width: 28, textAlign: "center" },
  socialBtnText: { flex: 1, fontSize: 16, fontWeight: "700" },
  chevron: { fontSize: 22, fontWeight: "300", marginLeft: 8 },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },

  // Guest button
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  guestIcon: { fontSize: 18 },
  guestBtnText: { fontSize: 16, fontWeight: "700" },

  // Email link
  emailLink: { alignItems: "center", paddingVertical: 8 },
  emailLinkText: { fontSize: 13, fontWeight: "600" },

  // Form
  formCard: {
    padding: 24,
    borderRadius: 20,
    gap: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  formTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "500",
  },
  errorText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
  emailSubmit: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  emailSubmitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  switchMode: { alignItems: "center", paddingVertical: 6 },
  switchModeText: { fontSize: 13, fontWeight: "600" },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backText: { fontSize: 13, fontWeight: "500" },

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
