import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import ThemedBackground from "../common/ThemedBackground";
import { useGameStore } from "../../stores/gameStore";
import { playLetterPressFeedback, playDeleteFeedback } from "../../../utils/soundFeedback";
import { play } from "../../../utils/sound";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "⌫"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function InGameKeyboard() {
  // Palet KEYBOARD (tema keyboard aktif) — terpisah dari tema aplikasi & papan.
  const { keyboardColors: K, keyboardBackground } = useTheme();
  const inputLetter = useGameStore((s) => s.inputLetter);
  const deleteLetter = useGameStore((s) => s.deleteLetter);
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputOrientation = useGameStore((s) => s.inputOrientation);

  const handlePress = (key: string) => {
    if (key === "⌫") {
      playDeleteFeedback();
      deleteLetter();
    } else {
      // Suara dievaluasi SEBELUM input: kalau huruf terakhir membuat kata
      // lengkap, mainkan "word" (benar) atau "error" (salah).
      playLetterPressFeedback(useGameStore.getState().selectedWordIndex, key);
      inputLetter(key);
    }
  };

  const handleNav = (dir: "up" | "down" | "left" | "right") => {
    play("tap");
    navigateToCell(dir);
  };

  const isHorizontal = inputOrientation === "horizontal";

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: K.panelBackground,
          borderTopColor: K.panelBorder,
          overflow: "hidden",
        },
      ]}
    >
      {/* Latar tema keyboard (gradien/gambar) di belakang tombol. */}
      <ThemedBackground spec={keyboardBackground} />

      {/* Row 1: Q-P */}
      <View style={styles.row}>
        {ROWS[0].map((key) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.6}
            onPress={() => handlePress(key)}
            style={[
              styles.key,
              { backgroundColor: K.keyBackground, borderColor: K.keyBorder },
            ]}
          >
            <Text style={[styles.keyText, { color: K.keyText }]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 2: A-⌫ */}
      <View style={styles.row}>
        {ROWS[1].map((key) => {
          const isBackspace = key === "⌫";
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.6}
              onPress={() => handlePress(key)}
              style={[
                styles.key,
                {
                  backgroundColor: isBackspace ? K.specialBackground : K.keyBackground,
                  borderColor: K.keyBorder,
                  flex: isBackspace ? 1.3 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.keyText,
                  { color: K.keyText, fontSize: isBackspace ? 14 : 18 },
                ]}
              >
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Row 3: Z-M + navigation arrows */}
      <View style={styles.row}>
        {ROWS[2].map((key) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.6}
            onPress={() => handlePress(key)}
            style={[
              styles.key,
              { backgroundColor: K.keyBackground, borderColor: K.keyBorder },
            ]}
          >
            <Text style={[styles.keyText, { color: K.keyText }]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
        {isHorizontal ? (
          <>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleNav("left")}
              style={[
                styles.navKey,
                { backgroundColor: K.navBackground, borderColor: K.navBorder },
              ]}
            >
              <Text style={[styles.navText, { color: K.navText }]}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleNav("right")}
              style={[
                styles.navKey,
                { backgroundColor: K.navBackground, borderColor: K.navBorder },
              ]}
            >
              <Text style={[styles.navText, { color: K.navText }]}>▶</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleNav("up")}
              style={[
                styles.navKey,
                { backgroundColor: K.navBackground, borderColor: K.navBorder },
              ]}
            >
              <Text style={[styles.navText, { color: K.navText }]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleNav("down")}
              style={[
                styles.navKey,
                { backgroundColor: K.navBackground, borderColor: K.navBorder },
              ]}
            >
              <Text style={[styles.navText, { color: K.navText }]}>▼</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  row: {
    flexDirection: "row",
    gap: 4,
  },
  key: {
    flex: 1,
    height: 46,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontWeight: "600",
    fontSize: 18,
  },
  navKey: {
    flex: 1,
    height: 46,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
