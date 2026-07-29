import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";
import { useGameStore } from "../../stores/gameStore";

interface TopBarProps {
  showBack?: boolean;
  title?: string;
  onBack?: () => void;
}

export default function TopBar({ showBack = true, onBack }: TopBarProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const navigation = useNavigation();
  const totalXp = useGameStore((s) => s.totalXp);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.topBar, { backgroundColor: C.surface }]}>
      <View style={styles.topBarLeft}>
        {showBack && (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={handleBack}
          >
            <Text style={[styles.backBtnText, { color: C.text }]}>←</Text>
          </TouchableOpacity>
        )}
        <View
          style={[
            styles.avatar,
            { backgroundColor: C.secondaryContainer, borderColor: C.primary },
          ]}
        >
          <Text style={[styles.avatarText, { color: C.text }]}>K</Text>
        </View>
        <Text style={[styles.appTitle, { color: C.primary }]}>KotaKata AI</Text>
      </View>

      <View style={[styles.xpPill, { backgroundColor: C.secondaryContainer }]}>
        <Text style={[styles.xpPillText, { color: C.secondary }]}>⭐ {totalXp} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 16 : 48,
    paddingBottom: 12,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { fontSize: 16, fontWeight: "700" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarText: { fontSize: 12, fontWeight: "800" },
  appTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  xpPillText: { fontSize: 11, fontWeight: "700" },
});
