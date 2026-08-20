import { type ReactNode } from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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

/**
 * Jumlah lapisan warna untuk gradien non-SVG. Semakin banyak makin halus,
 * tapi cukup mahal juga — 10 band sudah terlihat mulus di layar ponsel.
 */
const GRADIENT_BANDS = 10;

/**
 * Gradien dibuat dengan LAPISAN VIEW BERWARNA bertumpuk (tanpa react-native-svg):
 * react-native-svg pernah menjadi tersangka force close di beberapa perangkat
 * (lihat PLAN-023/024/025), jadi latar tema tidak lagi memakai SVG sama sekali.
 * Semua platform (native + web) merender deretan View — murah, stabil, dan
 * tidak membutuhkan modul native tambahan.
 */

/** Interpolasi warna hex (#rrggbb) antar dua warna, t ∈ [0, 1]. */
function interpolateHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ra = parseInt(pa.slice(0, 2), 16);
  const ga = parseInt(pa.slice(2, 4), 16);
  const ba = parseInt(pa.slice(4, 6), 16);
  const rb = parseInt(pb.slice(0, 2), 16);
  const gb = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const blue = Math.round(ba + (bb - ba) * t);
  return `#${[r, g, blue].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Bangun daftar warna band (count buah) di sepanjang stop gradien. */
function buildBands(stops: string[], count: number): string[] {
  const bands: string[] = [];
  for (let i = 0; i < count; i++) {
    const pos = (i + 0.5) / count; // titik tengah band
    const seg = pos * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(seg));
    const t = seg - idx;
    bands.push(interpolateHex(stops[idx], stops[idx + 1], t));
  }
  return bands;
}

/** Lapisan gradien: deretan View berwarna sesuai arah (tanpa SVG). */
function GradientLayer({ stops, direction }: { stops: string[]; direction: BackgroundDirection }) {
  const bands = buildBands(stops, GRADIENT_BANDS);

  // Diagonal: band vertikal di dalam wadah yang di-rotate + di-scale supaya
  // sudut-ke-sudut tertutup (scale > √2 menjamin tidak ada pojok kosong).
  if (direction === "diagonal-tl" || direction === "diagonal-tr") {
    const rotate = direction === "diagonal-tl" ? "-12deg" : "12deg";
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, styles.diagClip]}>
          <View style={[styles.diagRotate, { transform: [{ rotate }, { scale: 1.6 }] }]}>
            <View style={styles.column}>
              {bands.map((c, i) => (
                <View key={i} style={[styles.band, { backgroundColor: c }]} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  const horizontal = direction === "horizontal";
  return (
    <View style={[StyleSheet.absoluteFill, horizontal ? styles.row : styles.column]}>
      {bands.map((c, i) => (
        <View key={i} style={[styles.band, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

/**
 * Lapisan latar tema: warna solid dasar → gradien (lapisan View, tanpa
 * react-native-svg) → gambar URL (opsional) → overlay kontras. Dipakai
 * sebagai lapisan absolute-fill di belakang konten halaman/panel.
 */
export default function ThemedBackground({ spec, style, children }: ThemedBackgroundProps) {
  const { color = "transparent", gradient, direction = "vertical", imageUrl, overlay } = spec;
  const stops = gradient && gradient.length >= 2 ? gradient : undefined;

  return (
    <View style={[StyleSheet.absoluteFill, style, { pointerEvents: "none" as const }]}>
      {/* 1) Warna solid dasar (fallback & pengganti gradien bila tidak ada). */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />

      {/* 2) Gradien (jika didefinisikan) — lapisan View berwarna, bukan SVG. */}
      {stops ? <GradientLayer stops={stops} direction={direction} /> : null}

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

const styles = StyleSheet.create({
  column: { flex: 1, flexDirection: "column" },
  row: { flex: 1, flexDirection: "row" },
  band: { flex: 1 },
  diagClip: { overflow: "hidden" },
  diagRotate: { flex: 1 },
});
