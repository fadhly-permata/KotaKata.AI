import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { useGameStore } from "../../presentation/stores/gameStore";
import { useAuth } from "../auth/useAuth";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);
  const { signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isDark = themeMode === "dark" || (themeMode === "system" && theme.mode === "dark");

  const toggleTheme = () => {
    setThemeMode(isDark ? "light" : "dark");
  };

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      reset();
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    } catch (e: any) {
      // Silently fail — user stays on settings
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  }, [signOut, reset, navigation]);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Tampilan */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tampilan</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Mode Gelap</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#ccc", true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Efek Suara</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#ccc", true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Akun */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Akun</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.6}
            onPress={() => setShowSignOutConfirm(true)}
            disabled={signingOut}
          >
            <Text style={[styles.actionText, { color: theme.colors.error }]}>
              {signingOut ? "Keluar..." : "Keluar Akun"}
            </Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>
              Kembali ke halaman login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data</Text>
          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            Total XP tersimpan: {totalXp}
          </Text>
          <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.6}>
            <Text style={styles.dangerText}>Hapus Data Lokal</Text>
          </TouchableOpacity>
        </View>

        {/* Log Aplikasi — detail dibuka lewat layar terpisah */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Log Aplikasi</Text>
          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            Setiap issue (error / warning) otomatis tercatat. Lihat detail log saat
            dibutuhkan.
          </Text>
          <TouchableOpacity
            style={[styles.logOpenBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("LogViewer")}
          >
            <Text style={[styles.logOpenBtnText, { color: theme.colors.secondary }]}>
              📄 Lihat Log Aplikasi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tentang */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tentang</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Versi</Text>
            <Text style={[styles.settingValue, { color: theme.colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Aplikasi</Text>
            <Text style={[styles.settingValue, { color: theme.colors.text }]}>KotaKata.AI</Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Keluar Akun"
        message="Apakah kamu yakin ingin keluar? Progres game akan tetap tersimpan."
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
        variant="danger"
        emoji="🚪"
      />

    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingValue: { fontSize: 14, fontWeight: "600" },
  settingHint: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1 },
  actionRow: { paddingVertical: 8 },
  actionText: { fontSize: 15, fontWeight: "600" },
  actionHint: { fontSize: 12, marginTop: 2 },
  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
  },
  dangerText: { color: "#E74C3C", fontSize: 14, fontWeight: "600" },
  logOpenBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  logOpenBtnText: { fontSize: 14, fontWeight: "700" },
});
