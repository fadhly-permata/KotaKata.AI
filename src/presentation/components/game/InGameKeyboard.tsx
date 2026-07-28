import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { useGameStore } from "../../stores/gameStore";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

export default function InGameKeyboard() {
  const { theme } = useTheme();
  const inputLetter = useGameStore((s) => s.inputLetter);
  const deleteLetter = useGameStore((s) => s.deleteLetter);
  const navigateToCell = useGameStore((s) => s.navigateToCell);
  const inputOrientation = useGameStore((s) => s.inputOrientation);

  const handlePress = (key: string) => {
    if (key === "⌫") {
      deleteLetter();
    } else {
      inputLetter(key);
    }
  };

  const isHorizontal = inputOrientation === "horizontal";

  return (
    <View style={styles.container}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => {
            const isBackspace = key === "⌫";
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.6}
                onPress={() => handlePress(key)}
                style={[
                  styles.key,
                  {
                    backgroundColor: isBackspace
                      ? theme.colors.border
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                    minWidth: isBackspace ? 64 : key === "Z" ? 56 : 32,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.keyText,
                    { color: theme.colors.text, fontSize: isBackspace ? 14 : 18 },
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Navigation row */}
      <View style={styles.row}>
        {isHorizontal ? (
          <>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigateToCell("left")}
              style={[styles.navKey, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.navText, { color: theme.colors.text }]}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigateToCell("right")}
              style={[styles.navKey, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.navText, { color: theme.colors.text }]}>▶</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigateToCell("up")}
              style={[styles.navKey, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.navText, { color: theme.colors.text }]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigateToCell("down")}
              style={[styles.navKey, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.navText, { color: theme.colors.text }]}>▼</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  key: {
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  keyText: {
    fontWeight: "600",
  },
  navKey: {
    width: 56,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
