import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

/** Warna konfeti ceria. */
const CELEBRATE_COLORS = [
  "#FF6B6B",
  "#FFD166",
  "#06D6A0",
  "#4D96FF",
  "#B388FF",
  "#FF8A65",
  "#7ED6DF",
  "#F9A8D4",
];

/** Warna hujan murung (abu-biru redup) untuk tier turun. */
const SAD_COLORS = ["#90A4AE", "#78909C", "#607D8B", "#B0BEC5", "#CFD8DC", "#546E7A"];

interface ConfettiProps {
  /** Jumlah partikel (default 60; mode murung 36). */
  count?: number;
  /** Durasi jatuh partikel (ms, default 2600). */
  duration?: number;
  /** Mode murung: hujan pelan warna abu tanpa rotasi (efek \"turun level\"). */
  sad?: boolean;
}

interface Particle {
  id: number;
  left: number; // posisi awal horizontal (persen lebar)
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number; // goyangan horizontal (px)
  spin: number; // total rotasi (derajat)
  round: boolean;
}

/**
 * Konfeti ringan tanpa dependency baru: partikel Animated jatuh dari atas
 * dengan delay/acak, goyangan horizontal, dan rotasi. Berjalan di semua
 * platform (web: fallback JS driver). Dipakai di dialog Permainan Selesai dan
 * popup tier naik (`sad` untuk efek hujan murung saat tier turun).
 */
export default function Confetti({
  count = 60,
  duration = 2600,
  sad = false,
}: ConfettiProps) {
  const { width: _winW, height: winH } = useWindowDimensions();
  const n = sad ? Math.min(count, 36) : count;

  const values = useRef<Animated.Value[]>([]);
  if (values.current.length === 0) {
    values.current = Array.from({ length: n }, () => new Animated.Value(0));
  }

  const palette = sad ? SAD_COLORS : CELEBRATE_COLORS;

  const particles = useMemo<Particle[]>(() => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: n }, (_, id) => ({
      id,
      left: rnd(0, 100),
      size: sad ? rnd(3, 6) : rnd(6, 12),
      color: palette[Math.floor(Math.random() * palette.length)],
      delay: rnd(0, sad ? 900 : 500),
      duration: rnd(duration * 0.7, duration * 1.2),
      drift: rnd(-40, 40),
      spin: sad ? 0 : rnd(360, 1080),
      round: Math.random() < 0.3,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, sad]);

  useEffect(() => {
    const anims = values.current.map((v, i) =>
      Animated.sequence([
        Animated.delay(particles[i].delay),
        Animated.timing(v, {
          toValue: 1,
          duration: particles[i].duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(anims).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallDistance = winH + 80;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const v = values.current[i];
        const translateY = v.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, fallDistance],
        });
        const translateX = v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, p.drift, p.drift * 1.6],
        });
        const rotate = v.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.spin}deg`],
        });
        const opacity = v.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: `${p.left}%`,
                width: p.size,
                height: sad ? p.size * 2.4 : p.size * 1.4,
                borderRadius: p.round ? 99 : 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
  },
});
