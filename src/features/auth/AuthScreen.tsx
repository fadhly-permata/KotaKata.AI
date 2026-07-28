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
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useAuth } from "./useAuth";

type AuthMode = "select" | "email";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signInAnonymously, signInWithGoogle, signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(30)).current;
  const btn1Opacity = useRef(new Animated.Value(0)).current;
  const btn2Opacity = useRef(new Animated.Value(0)).current;
  const btn3Opacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(btn1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btn2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(btn3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
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

  const isDark = theme.mode === "dark";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Branding */}
        <Animated.View
          style={[
            styles.logoSection,
            { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] },
          ]}
        >
          <Text style={styles.logoEmoji}>📖</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>KotaKata.AI</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Teka-Teki Silang Puitis
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            Mulai perjalanan bahasamu{'\n'}dari Eja Awal hingga Keabadian Seloka
          </Text>
        </Animated.View>

        {/* Auth Options */}
        {mode === "select" && (
          <View style={styles.authSection}>
            {/* Anonymous */}
            <Animated.View style={{ opacity: btn1Opacity, width: "100%" }}>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
                onPress={handleAnonymous}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>🎭 Main Sebagai Tamu</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Google */}
            <Animated.View style={{ opacity: btn2Opacity, width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.btnOutline,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                activeOpacity={0.7}
                onPress={handleGoogle}
                disabled={actionLoading}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.btnOutlineText, { color: theme.colors.text }]}>
                  Lanjutkan dengan Google
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Email */}
            <Animated.View style={{ opacity: btn3Opacity, width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.btnOutline,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                activeOpacity={0.7}
                onPress={() => setMode("email")}
              >
                <Text style={[styles.btnOutlineText, { color: theme.colors.text }]}>
                  ✉️ Email
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* Email Form */}
        {mode === "email" && (
          <View style={styles.authSection}>
            <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                {isSignUp ? "Daftar dengan Email" : "Masuk dengan Email"}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#2A2A2A" : "#FFF",
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
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
                    backgroundColor: isDark ? "#2A2A2A" : "#FFF",
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
                onPress={handleEmailAuth}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {isSignUp ? "Daftar" : "Masuk"}
                  </Text>
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
                <Text style={[styles.switchModeText, { color: theme.colors.primary }]}>
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
                <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>
                  ← Kembali
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Data tersimpan aman di perangkatmu.{'\n'}Login untuk sinkronisasi cloud.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  logoSection: { alignItems: "center", gap: 8, marginBottom: 36 },
  logoEmoji: { fontSize: 56 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: 1 },
  subtitle: { fontSize: 13, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },
  divider: { height: 1, width: 60, marginVertical: 12 },
  tagline: { fontSize: 14, textAlign: "center", lineHeight: 22, fontStyle: "italic" },
  authSection: { gap: 12, marginBottom: 24 },
  btnPrimary: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
    elevation: 6,
  },
  btnPrimaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  btnOutline: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
    backgroundColor: "#FFF",
    width: 24,
    height: 24,
    textAlign: "center",
    lineHeight: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  btnOutlineText: { fontSize: 15, fontWeight: "600" },
  formCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  formTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: { color: "#E74C3C", fontSize: 13, textAlign: "center" },
  switchMode: { alignItems: "center", paddingVertical: 4 },
  switchModeText: { fontSize: 13, fontWeight: "600" },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backText: { fontSize: 13, fontWeight: "500" },
  footer: { alignItems: "center", marginTop: 8 },
  footerText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
