import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";
import { useGameStore } from "../../stores/gameStore";
import { useAuth } from "../../../features/auth/useAuth";
import UserAvatar from "./UserAvatar";

interface TopBarProps {
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ showBack = true, onBack }: TopBarProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const navigation = useNavigation();
  // Safe-area inset status bar — tanpa ini konten halaman masuk ke balik status
  // bar (edge-to-edge Android 15+) dan terlihat seperti layar fullscreen.
  // Web melaporkan insets 0, jadi tampilan web tidak berubah.
  const insets = useSafeAreaInsets();
  const totalXp = useGameStore((s) => s.totalXp);
  const { user } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: C.surface,
          paddingTop: Platform.OS === "web" ? 0 : insets.top + 6,
        },
      ]}
    >
      <View style={[styles.topBar, { backgroundColor: C.surface }]}>
        <View style={styles.topBarLeft}>
          {showBack && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: C.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={handleBack}
            >
              <Text style={[styles.backBtnText, { color: C.text }]}>‹</Text>
            </TouchableOpacity>
          )}
          <UserAvatar name={user?.displayName} avatarUrl={user?.avatarUrl} size={32} />
          <Text style={[styles.appTitle, { color: C.primary }]}>KotaKata AI</Text>
        </View>

        <View style={[styles.xpPill, { backgroundColor: C.secondaryContainer }]}>
          <Text style={[styles.xpPillText, { color: C.secondary }]}>⭐ {totalXp} XP</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {},
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 32,
    textAlign: "center",
  },
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
