import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { useGameStore } from "../../presentation/stores/gameStore";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const totalXp = useGameStore((s) => s.totalXp);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Theme */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tampilan</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Mode Gelap</Text>
            <Switch
              value={theme.mode === "dark"}
              onValueChange={() => {}}
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

        {/* About */}
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
      </View>
    </ScrollView>
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
  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
  },
  dangerText: { color: "#E74C3C", fontSize: 14, fontWeight: "600" },
});
