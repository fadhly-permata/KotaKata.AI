import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { loggerWarn } from "../../utils/logger";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { buttonShadow } from "../../utils/skin";
import TopBar from "../../presentation/components/common/TopBar";
import {
  isSoundEnabled,
  setSoundEnabled,
  isAmbientEnabled,
  setAmbientEnabled,
  play,
} from "../../utils/sound";
import {
  getAiProviderConfig,
  getAllSavedProviders,
  getActiveProvider,
  setActiveProvider,
  providerLabel,
  providerPreset,
  type AiProviderPreset,
} from "../../utils/aiProvider";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [ambientEnabled, setAmbientEnabledState] = useState(isAmbientEnabled());
  const [aiStatus, setAiStatus] = useState<{ label: string; model: string } | null>(null);
  const [savedProviders, setSavedProviders] = useState<AiProviderPreset[]>([]);
  const [activeProvider, setActiveProviderState] = useState<AiProviderPreset>("openrouter");

  // Baca status provider AI tersimpan (BYOK) untuk ditampilkan di pengaturan.
  // useFocusEffect: reload setiap kali layar mendapat fokus (termasuk saat
  // kembali dari halaman kelola provider AI).
  const refreshAiProviders = useCallback(async () => {
    try {
      const [cfg, saved, active] = await Promise.all([
        getAiProviderConfig(),
        getAllSavedProviders(),
        getActiveProvider(),
      ]);
      if (cfg) setAiStatus({ label: providerLabel(cfg.provider), model: cfg.model });
      else setAiStatus(null);
      setSavedProviders(saved);
      setActiveProviderState(active);
    } catch (err) {
      loggerWarn("Gagal memuat status provider AI di Pengaturan", err);
    }
  }, []);

  useEffect(() => {
    void refreshAiProviders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAiProviders();
    }, [refreshAiProviders]),
  );

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

  // Backsound tema: toggle terpisah dari efek suara. Mati → backsound berhenti;
  // nyala → backsound tema aktif diputar lagi (kalau efek suara juga nyala).
  const toggleAmbient = useCallback((value: boolean) => {
    setAmbientEnabledState(value);
    void setAmbientEnabled(value);
  }, []);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Tampilan & Suara */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tampilan & Suara</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Mode Gelap</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Efek Suara</Text>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Backsound Tema</Text>
              <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
                Suara latar tema (ombak, hujan, jangkrik, dll.)
              </Text>
            </View>
            <Switch
              value={ambientEnabled}
              onValueChange={toggleAmbient}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Main Mode AI */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Main Mode AI</Text>
          {savedProviders.length === 0 ? (
            <>
              <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
                Main dengan soal yang dibuat AI. Belum ada provider diatur.
              </Text>
              <TouchableOpacity
                style={[styles.logOpenBtn, { backgroundColor: theme.colors.secondaryContainer }, buttonShadow(theme)]}
                activeOpacity={0.7}
                onPress={() => {
                  play("tap");
                  navigation.navigate("AiProvider");
                }}
              >
                <Text style={[styles.logOpenBtnText, { color: theme.colors.secondary }]}>
                  🤖 Tambahkan Provider AI
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.settingHint, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
                Pilih provider default untuk Main Mode AI & Editor Soal:
              </Text>
              {savedProviders.map((p) => {
                const isActive = p === activeProvider;
                const cfgLabel = providerLabel(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.providerRow, {
                      backgroundColor: isActive
                        ? theme.colors.primary + "15"
                        : theme.colors.secondaryContainer,
                      borderColor: isActive ? theme.colors.primary : "transparent",
                    }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      play("tap");
                      await setActiveProvider(p);
                      setActiveProviderState(p);
                      const cfg = await getAiProviderConfig();
                      if (cfg) setAiStatus({ label: providerLabel(cfg.provider), model: cfg.model });
                    }}
                  >
                    <Text style={[styles.providerRowRadio, { color: isActive ? theme.colors.primary : theme.colors.textSecondary }]}>
                      {isActive ? "◉" : "○"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.providerRowLabel, { color: theme.colors.text }]}>
                        {cfgLabel}
                      </Text>
                      {isActive && aiStatus && (
                        <Text style={[styles.providerRowModel, { color: theme.colors.textSecondary }]}>
                          {aiStatus.model}
                        </Text>
                      )}
                    </View>
                    {isActive && (
                      <Text style={[styles.providerRowActive, { color: theme.colors.primary }]}>Aktif</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.logOpenBtn, { backgroundColor: theme.colors.secondaryContainer, marginTop: 4 }, buttonShadow(theme)]}
                activeOpacity={0.7}
                onPress={() => {
                  play("tap");
                  navigation.navigate("AiProvider");
                }}
              >
                <Text style={[styles.logOpenBtnText, { color: theme.colors.secondary }]}>
                  ⚙️ Kelola Provider AI
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Log Aplikasi — detail dibuka lewat layar terpisah */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Log Aplikasi</Text>
          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            Setiap issue (error / warning) otomatis tercatat. Lihat detail log saat
            dibutuhkan.
          </Text>
          <TouchableOpacity
            style={[styles.logOpenBtn, { backgroundColor: theme.colors.secondaryContainer }, buttonShadow(theme)]}
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
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.6}
            onPress={() => {
              play("tap");
              void Linking.openURL("https://github.com/fadhly-permata");
            }}
            accessibilityRole="link"
            accessibilityLabel="Author Fadhly Permata — buka profil GitHub"
          >
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Author</Text>
            <Text style={[styles.settingValue, { color: theme.colors.primary }]}>Fadhly Permata ↗</Text>
          </TouchableOpacity>
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
  settingLabelWrap: { flex: 1, gap: 2, paddingRight: 12 },
  settingValue: { fontSize: 14, fontWeight: "600" },
  settingHint: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1 },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  providerRowRadio: { fontSize: 18 },
  providerRowLabel: { fontSize: 14, fontWeight: "600" },
  providerRowModel: { fontSize: 12, marginTop: 2 },
  providerRowActive: { fontSize: 12, fontWeight: "700" },
  logOpenBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  logOpenBtnText: { fontSize: 14, fontWeight: "700" },
});
