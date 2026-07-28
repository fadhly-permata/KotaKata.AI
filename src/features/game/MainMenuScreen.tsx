import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MENU_ITEMS: Array<{ label: string; screen: keyof RootStackParamList; icon: string }> = [
  { label: "Main Game", screen: "Game", icon: "🎮" },
  { label: "Sejarah Saya", screen: "History", icon: "📖" },
  { label: "Profil", screen: "Profile", icon: "👤" },
  { label: "Pengaturan", screen: "Settings", icon: "⚙️" },
];

export default function MainMenuScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>KotaKata.AI</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Teka-Teki Silang
      </Text>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            activeOpacity={0.7}
            style={[styles.menuItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => nav.navigate(item.screen)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{item.label}</Text>
            <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 40, letterSpacing: 2 },
  menu: { width: "100%", maxWidth: 320, gap: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: { fontSize: 22, marginRight: 14 },
  menuLabel: { fontSize: 16, fontWeight: "600", flex: 1 },
  arrow: { fontSize: 22, fontWeight: "300" },
});
