import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TierBadge from "../../presentation/components/common/TierBadge";
import SavedBoardList from "../../presentation/components/game/SavedBoardList";
import { useGameStore } from "../../presentation/stores/gameStore";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList, "MainMenu">;

export default function MainMenuScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);

  const handlePlay = () => {
    reset();
    navigation.navigate("Game");
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={[styles.logoEmoji]}>📖</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>KotaKata.AI</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Teka-Teki Silang Puitis
          </Text>
        </View>

        {/* Tier Progress */}
        <TierBadge totalXp={totalXp} />

        {/* Saved boards */}
        <SavedBoardList
          boards={[]}
          onResume={() => {}}
          onDelete={() => {}}
        />

        {/* Main navigation buttons */}
        <View style={styles.menuButtons}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.8}
            onPress={handlePlay}
          >
            <Text style={styles.playBtnText}>🎮 Main Sekarang</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("History")}
          >
            <Text style={[styles.navBtnText, { color: theme.colors.text }]}>📖 Sejarah Saya</Text>
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtnSmall, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={[styles.navBtnTextSmall, { color: theme.colors.text }]}>👤 Profil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtnSmall, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={[styles.navBtnTextSmall, { color: theme.colors.text }]}>⚙️ Pengaturan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingTop: 48 },
  logoSection: { alignItems: "center", gap: 4, paddingVertical: 16 },
  logoEmoji: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  subtitle: { fontSize: 14, fontWeight: "500", letterSpacing: 2, textTransform: "uppercase" },
  menuButtons: { gap: 12 },
  playBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnText: { color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  navBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  navBtnText: { fontSize: 15, fontWeight: "600" },
  navRow: { flexDirection: "row", gap: 12 },
  navBtnSmall: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  navBtnTextSmall: { fontSize: 14, fontWeight: "600" },
});
