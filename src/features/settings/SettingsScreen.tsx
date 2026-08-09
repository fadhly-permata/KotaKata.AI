import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { isSoundEnabled, setSoundEnabled, play } from "../../utils/sound";
import {
  getAiProviderConfig,
  providerLabel,
} from "../../utils/aiProvider";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [aiStatus, setAiStatus] = useState<{ label: string; model: string } | null>(null);

  // Baca status provider AI tersimpan (BYOK) untuk ditampilkan di pengaturan.
  useEffect(() => {
    let cancelled = false;
    getAiProviderConfig().then((cfg) => {
      if (cancelled || !cfg) return;
      setAiStatus({ label: providerLabel(cfg.provider), model: cfg.model });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "system" && theme.mode === "dark");

  const toggleTheme = () => {
    setThemeMode(isDark ? "light" : "dark");
  };

  // Efek Suara: simpan preferensi ke AsyncStorage. Saat dinyalakan ulang,
  // bunyikan tap sebagai konfirmasi bahwa suara benar-benar aktif.
  const toggleSound = useCallback((value: boolean) => {
    setSoundEnabledState(value);
    void setSoundEnabled(value);
    if (value) play("tap");
  }, []);

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
              onValueChange={toggleSound}
              trackColor={{ false: "#ccc", true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Main Mode AI */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Main Mode AI</Text>
          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            {aiStatus
              ? `Aktif: ${aiStatus.label} · ${aiStatus.model}`
              : "Main dengan soal yang dibuat AI. Belum ada provider diatur."}
          </Text>
          <TouchableOpacity
            style={[styles.logOpenBtn, { backgroundColor: theme.colors.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              navigation.navigate("AiProvider");
            }}
          >
            <Text style={[styles.logOpenBtnText, { color: theme.colors.secondary }]}>
              🤖 {aiStatus ? "Ubah Provider AI" : "Tambahkan Provider AI"}
            </Text>
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
  logOpenBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  logOpenBtnText: { fontSize: 14, fontWeight: "700" },
});
