import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";
import type { AmbientFxKind } from "../../themes/themeData";

/**
 * Efek partikel LATAR yang mengikuti SUASANA backsound tema (PLAN-044):
 * hujan → rintik turun, angin → garis melintas, api unggun → bara naik,
 * jangkrik → kelap-kelip, ombak → garis bergelombang, angin sepoi → dedaunan
 * melayang. Dirender ScreenFade MENGGANTIKAN orb saat tema mendefinisikan
 * `ambientFx`.
 *
 * Prioritas: RINGAN & AMAN (mengikuti mitigasi force close PLAN-023/024/027):
 *  - partikel sedikit (≤12) dan tiap partikel = SATU Animated.Value + native
 *    driver (loop Animated, tanpa re-render tiap frame);
 *  - `pointerEvents="none"` dan `overflow: hidden`;
 *  - animasi HANYA jalan saat layar mendapat fokus (useIsFocused) — layar
 *    tertutup di stack navigasi tidak menumpuk beban animasi.
 */
export default function AmbientFx({ fx }: { fx: AmbientFxKind }) {
  const { theme } = useTheme();
  const C = theme.colors;
  const isDark = theme.mode === "dark";
  const isFocused = useIsFocused();
  const { width: winW, height: winH } = useWindowDimensions();

  const parts = useMemo(() => buildParticles(fx, { C, isDark, winW, winH }), [fx, C, isDark, winW, winH]);
  // Satu Animated.Value per partikel — dibuat sekali per mount.
  const values = useMemo(() => parts.map(() => new Animated.Value(0)), [parts]);

  useEffect(() => {
    // Web (PLAN-051): loop berjalan sekali saat mount TANPA churn stop/restart
    // saat ganti fokus — react-native-web bisa macet dengan pola itu (orb
    // diam di posisi akhir). Native: hanya saat layar fokus (mitigasi force
    // close PLAN-023/024/027 — jangan menumpuk loop saat layar tertutup).
    if (Platform.OS !== "web" && !isFocused) return;
    const loops = parts.map((p, i) => makeLoop(p, values[i]));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [isFocused, parts, values]);

  return (
    <View style={styles.container} pointerEvents="none">
      {parts.map((p, i) => {
        const v = values[i];
        const isBar = p.shape === "bar";
        return (
          <Animated.View
            key={i}
            style={[
              p.shape === "bar" ? styles.bar : styles.dot,
              {
                top: `${p.top}%`,
                left: `${p.left}%`,
                width: isBar ? (p.horizontal ? p.size : p.thickness) : p.size,
                height: isBar ? (p.horizontal ? p.thickness : p.size) : p.size,
                borderRadius: isBar ? p.thickness / 2 : p.size / 2,
                backgroundColor: p.color,
                opacity: p.opacityRange ? v.interpolate(p.opacityRange) : p.opacity,
                transform: [
                  { translateY: v.interpolate(p.tyRange) },
                  { translateX: v.interpolate(p.txRange) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

type Interp = { inputRange: number[]; outputRange: number[]; extrapolate?: "clamp" | "extend" };

interface Particle {
  top: number;
  left: number;
  size: number;
  thickness: number;
  color: string;
  opacity: number;
  shape: "bar" | "dot";
  horizontal: boolean;
  duration: number;
  delay: number;
  /** 0..1 = maju saja (loop reset); 2 = maju-mundur (seperti orb). */
  loop: 1 | 2;
  txRange: Interp;
  tyRange: Interp;
  opacityRange: Interp | null;
}

function interp(inputRange: number[], outputRange: number[], clamp = false): Interp {
  return { inputRange, outputRange, extrapolate: clamp ? "clamp" : "extend" };
}

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function buildParticles(
  fx: AmbientFxKind,
  ctx: { C: ReturnType<typeof useTheme>["theme"]["colors"]; isDark: boolean; winW: number; winH: number },
): Particle[] {
  const { C, isDark, winW, winH } = ctx;
  const list: Particle[] = [];
  const add = (p: Omit<Particle, "tyRange" | "txRange" | "opacityRange"> & Partial<Pick<Particle, "tyRange" | "txRange" | "opacityRange">>) =>
    list.push({
      tyRange: interp([0, 1], [0, 0]),
      txRange: interp([0, 1], [0, 0]),
      opacityRange: null,
      ...p,
    } as Particle);

  switch (fx) {
    case "rain": {
      // Rintik hujan: garis tipis jatuh miring dari atas, cepat, loop 1 arah.
      const color = isDark ? "rgba(200,220,255,0.5)" : "rgba(90,115,160,0.4)";
      for (let i = 0; i < 12; i++) {
        const dur = rnd(700, 1400);
        add({
          top: rnd(-110, -5),
          left: rnd(0, 98),
          size: rnd(16, 30),
          thickness: 1.5,
          color,
          opacity: rnd(0.35, 0.8),
          shape: "bar",
          horizontal: false,
          duration: dur,
          delay: rnd(0, 900),
          loop: 1,
          tyRange: interp([0, 1], [0, winH * 1.35]),
          txRange: interp([0, 1], [0, -winH * 0.18]),
        });
      }
      break;
    }
    case "wind": {
      // Angin: garis horizontal melintas kiri→kanan, lambat.
      const color = isDark ? "rgba(255,255,255,0.3)" : "rgba(140,160,190,0.45)";
      for (let i = 0; i < 9; i++) {
        add({
          top: rnd(2, 95),
          left: rnd(-110, -10),
          size: rnd(60, 160),
          thickness: rnd(1.5, 3),
          color,
          opacity: rnd(0.25, 0.6),
          shape: "bar",
          horizontal: true,
          duration: rnd(5000, 10000),
          delay: rnd(0, 4000),
          loop: 1,
          txRange: interp([0, 1], [0, winW * 1.7]),
        });
      }
      break;
    }
    case "embers": {
      // Bara api unggun: titik naik dari bawah, memudar di atas.
      for (let i = 0; i < 10; i++) {
        const dur = rnd(4000, 8000);
        add({
          top: rnd(60, 100),
          left: rnd(0, 96),
          size: rnd(2.5, 5),
          thickness: 1,
          color: pick([C.gold, "#ff9d4d", "#ffd166"]),
          opacity: 0.9,
          shape: "dot",
          horizontal: false,
          duration: dur,
          delay: rnd(0, 3000),
          loop: 1,
          tyRange: interp([0, 1], [0, -winH * 1.15]),
          txRange: interp([0, 1], [0, rnd(-30, 30)]),
          opacityRange: interp([0, 0.12, 0.65, 1], [0, 1, 0.85, 0], true),
        });
      }
      break;
    }
    case "fireflies": {
      // Kunang-kunang: titik diam yang kelap-kelip pelan.
      for (let i = 0; i < 10; i++) {
        add({
          top: rnd(5, 92),
          left: rnd(2, 94),
          size: rnd(2.5, 4.5),
          thickness: 1,
          color: pick([C.gold, C.primary, "#ffe08a"]),
          opacity: 0.8,
          shape: "dot",
          horizontal: false,
          duration: rnd(1800, 3800),
          delay: rnd(0, 2500),
          loop: 2,
          opacityRange: interp([0, 0.5, 1], [0.08, 0.85, 0.08], true),
        });
      }
      break;
    }
    case "waves": {
      // Ombak: garis horizontal lembut naik-turun (maju-mundur, lambat).
      const color = isDark ? "rgba(255,255,255,0.22)" : "rgba(120,150,190,0.35)";
      for (let i = 0; i < 6; i++) {
        add({
          top: 8 + i * 14 + rnd(-3, 3),
          left: rnd(-5, 5),
          size: winW * rnd(0.55, 0.85),
          thickness: rnd(1.5, 2.5),
          color,
          opacity: rnd(0.35, 0.7),
          shape: "bar",
          horizontal: true,
          duration: rnd(5500, 9000),
          delay: rnd(0, 2000),
          loop: 2,
          tyRange: interp([0, 1], [0, rnd(10, 22)]),
        });
      }
      break;
    }
    case "breeze": {
      // Angin sepoi/dedaunan: titik kecil melayang pelan ke kanan-bawah.
      const color = isDark ? "rgba(220,235,255,0.4)" : "rgba(110,140,120,0.4)";
      for (let i = 0; i < 8; i++) {
        add({
          top: rnd(-10, 90),
          left: rnd(-20, 60),
          size: rnd(3, 6),
          thickness: 1,
          color: pick([color, C.secondary, C.tertiary]),
          opacity: rnd(0.25, 0.55),
          shape: "dot",
          horizontal: false,
          duration: rnd(7000, 12000),
          delay: rnd(0, 4000),
          loop: 1,
          txRange: interp([0, 1], [0, winW * 1.5]),
          tyRange: interp([0, 1], [0, rnd(40, 120)]),
        });
      }
      break;
    }
    case "none":
    default:
      break;
  }
  return list;
}

function makeLoop(p: Particle, v: Animated.Value): Animated.CompositeAnimation {
  if (p.loop === 2) {
    // Maju-mundur halus (kelap-kelip, ombak) — pola sama seperti orb.
    return Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: p.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
  }
  // Satu arah kontinu (hujan/angin/bara/melayang): loop linear dengan reset —
  // partikel kembali ke posisi awal tiap siklus (seolah muncul lagi).
  return Animated.loop(
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.timing(v, {
        toValue: 1,
        duration: p.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]),
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
  },
  dot: {
    position: "absolute",
  },
});
