import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  name?: string;
  avatarUrl?: string;
  size?: number;
}

/** Avatar pemain: foto profil (Google) kalau ada, kalau nggak inisial nama. */
export default function UserAvatar({ name, avatarUrl, size = 32 }: Props) {
  const { theme } = useTheme();
  const C = theme.colors;
  const radius = Math.round(size / 2);
  const initial = (name?.trim()?.[0] ?? "K").toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: 2,
          borderColor: C.primary,
          backgroundColor: C.secondaryContainer,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: C.secondaryContainer,
          borderColor: C.primary,
        },
      ]}
    >
      <Text style={[styles.initial, { color: C.text, fontSize: Math.round(size * 0.42) }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  initial: { fontWeight: "800" },
});
