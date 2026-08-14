import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { subscribeAmbientStatus } from "../../../utils/sound";
import { useTheme } from "../providers/ThemeProvider";

/**
 * Hint kecil (web saja): browser memblokir autoplay audio sampai user
 * berinteraksi, jadi backsound tema baru mulai setelah gestur pertama.
 * Pill ini memberi tahu user kenapa suara latar belum terdengar, lalu
 * menghilang sendiri setelah beberapa detik (muncul lagi saat status
 * \"diblokir\" berubah). Di native tidak dirender sama sekali.
 */
export default function AmbientSoundHint() {
  const { theme } = useTheme();
  const [blocked, setBlocked] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeAmbientStatus(setBlocked), []);

  useEffect(() => {
    if (!blocked) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, [blocked]);

  if (Platform.OS !== "web" || !visible) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        style={[
          styles.pill,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          🔊 Ketuk layar untuk memutar suara latar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: "center",
    zIndex: 50,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  text: { fontSize: 13, fontWeight: "600" },
});
