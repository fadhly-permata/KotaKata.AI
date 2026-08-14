import type { ReactNode } from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import type { BackgroundDirection, BackgroundSpec } from "../../themes/themeData";

interface ThemedBackgroundProps {
  /** Spec latar (warna solid + gradien + opsional gambar/overlay). */
  spec: BackgroundSpec;
  /** Gaya tambahan (mis. borderRadius + overflow hidden untuk sudut membulat). */
  style?: StyleProp<ViewStyle>;
  /** Konten opsional yang dirender DI ATAS latar (lebih jarang; umumnya konten
   *  diposisikan sebagai sibling oleh pemakai komponen ini). */
  children?: ReactNode;
}

/** Koordinat SVG LinearGradient per arah. Default: vertical (atas → bawah). */
function gradientCoords(direction: BackgroundDirection) {
  switch (direction) {
    case "horizontal":
      return { x1: "0", y1: "0", x2: "1", y2: "0" };
    case "diagonal-tl":
      return { x1: "0", y1: "0", x2: "1", y2: "1" };
    case "diagonal-tr":
      return { x1: "1", y1: "0", x2: "0", y2: "1" };
    case "vertical":
    default:
      return { x1: "0", y1: "0", x2: "0", y2: "1" };
  }
}

/**
 * Lapisan latar tema: warna solid dasar → gradien (react-native-svg, tanpa
 * modul native tambahan) → gambar URL (opsional) → overlay kontras. Dipakai
 * sebagai lapisan absolute-fill di belakang konten halaman/panel.
 */
export default function ThemedBackground({ spec, style, children }: ThemedBackgroundProps) {
  const { color = "transparent", gradient, direction = "vertical", imageUrl, overlay } = spec;
  const stops = gradient && gradient.length >= 2 ? gradient : undefined;
  const coords = gradientCoords(direction);

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* 1) Warna solid dasar (fallback & pengganti gradien bila tidak ada). */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />

      {/* 2) Gradien (jika didefinisikan). */}
      {stops && (
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="themed-background" {...coords}>
              {stops.map((stopColor, i) => (
                <Stop
                  key={i}
                  offset={i / (stops.length - 1)}
                  stopColor={stopColor}
                  stopOpacity={1}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#themed-background)" />
        </Svg>
      )}

      {/* 3) Gambar latar (jika ada URL) — gradient/color tetap jadi fallback. */}
      {imageUrl ? (
        <ImageBackground
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      {/* 4) Overlay kontras teks (di atas gambar/gradien). */}
      {overlay ? <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} /> : null}

      {children}
    </View>
  );
}
