import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";

interface AmbientOrbsProps {
  /** Jumlah orb (default 24 — permintaan pemilik: minimal 20). */
  count?: number;
  /** Palet warna orb. Default: warna khas palet tema aktif. */
  colors?: string[];
  /** Faktor intensitas visual 0–1 (opacity). Default 1. */
  intensity?: number;
}

interface OrbSpec {
  size: number;
  top: number;
  left: number;
  color: string;
  opacity: number;
  /** Fase gerakan 0–1 — tiap orb bergeser, jadi tidak serempak. */
  phase: number;
  /** Jarak naik-turun (px). */
  bounce: number;
}

/**
 * Orb ambien yang menari pelan di latar — komponen SELF-CONTAINED dan reusable
 * (cukup `<AmbientOrbs />`, tanpa perlu scrollY/Animated.Value dari pemilik
 * layar seperti FloatingOrbs). Posisi, ukuran, dan fase gerakan di-random saat
 * mount, boleh saling tumpang tindih; warna diambil dari palet tema aktif.
 *
 * Dirender OTOMATIS oleh ScreenFade (hampir semua layar memakainya, termasuk
 * GameScreen), jadi efek orb ada di SEMUA halaman — bukan cuma Main Menu.
 * Main Menu & halaman Login mematikannya via `orbs={false}` karena sudah punya
 * FloatingOrbs parallax sendiri.
 *
 * Satu Animated.Value + satu native driver untuk semua orb (fase berbeda lewat
 * inputRange interpolasi) — ringan di native; di web otomatis fallback ke
 * driver JS. Tidak menghalangi sentuhan (pointerEvents="none").
 */
export default function AmbientOrbs({ count = 24, colors, intensity = 1 }: AmbientOrbsProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  // Mitigasi force close (PLAN-023/024/027): orb HANYA dianimasikan saat layar
  // mendapat fokus. React Navigation menjaga layar tetap terpasang di stack,
  // jadi tanpa guard ini setiap halaman menjalankan satu native-driver loop
  // 24 orb selamanya walau tertutup layar lain — beban animasi & node native
  // menumpuk di perangkat kelas menengah saat user menjelajah antar halaman.
  // Dengan guard ini hanya layar yang sedang terlihat yang beranimasi.
  const isFocused = useIsFocused();
  const palette =
    colors ?? [C.primary, C.secondary, C.tertiary, C.accent, C.gold, C.success, C.tertiaryContainer];

  const orbs = useMemo<OrbSpec[]>(() => {
    const list: OrbSpec[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        size: 24 + Math.random() * 130,
        top: Math.random() * 100,
        left: Math.random() * 100,
        color: palette[i % palette.length],
        opacity: 0.05 + Math.random() * 0.12,
        phase: Math.random(),
        bounce: 14 + Math.random() * 42,
      });
    }
    return list;
    // Palet tema hanya sumber warna — orb di-generate sekali per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) return; // layar tertutup: diam, tidak menumpuk beban animasi.
    // Gelombang naik-turun kontinu 0→1→0; interpolasi tiap orb memakai
    // inputRange [phase, phase+1] + extrapolate extend sehingga gerakannya
    // bergeser fase (tidak serempak) tapi tetap kontinu di titik balik.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [anim, isFocused]);

  return (
    <View style={styles.container} pointerEvents="none">
      {orbs.map((orb, i) => (
        <Animated.View
          key={i}
          style={[
            styles.orb,
            {
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              backgroundColor: orb.color,
              top: `${orb.top}%`,
              left: `${orb.left}%`,
              opacity: orb.opacity * intensity,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [orb.phase, orb.phase + 1],
                    outputRange: [0, orb.bounce],
                    extrapolate: "extend",
                  }),
                },
                {
                  translateX: anim.interpolate({
                    inputRange: [orb.phase, orb.phase + 1],
                    outputRange: [0, orb.bounce * 0.55],
                    extrapolate: "extend",
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
  },
});
