import { useEffect } from "react";
import { Animated, Easing, Platform } from "react-native";

export interface AmbientLoopSpec {
  value: Animated.Value;
  /** Durasi satu kaki (0→1 atau 1→0) dalam ms. */
  duration: number;
  /** Jeda sebelum loop mulai (ms) — dipakai stagger antar value agar tidak serempak. */
  startDelay?: number;
  /** Easing per kaki. Default `Easing.inOut(Easing.sin)`. */
  easing?: (t: number) => number;
}

/** Bangun loop naik-turun 0→1→0 kontinu lalu mulai; kembalikan fungsi berhenti. */
function startLoops(specs: AmbientLoopSpec[]): () => void {
  const loops = specs.map((s) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(s.value, {
          toValue: 1,
          duration: s.duration,
          easing: s.easing ?? Easing.inOut(Easing.sin),
          // Di web react-native-web memakai JS driver (flag diabaikan) —
          // `useNativeDriver: false` ditulis eksplisit agar tidak ambigu.
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(s.value, {
          toValue: 0,
          duration: s.duration,
          easing: s.easing ?? Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    ),
  );
  specs.forEach((s) => s.value.setValue(0));
  const timers = loops.map((l, i) => setTimeout(() => l.start(), specs[i]?.startDelay ?? 0));
  return () => {
    timers.forEach(clearTimeout);
    loops.forEach((l) => l.stop());
  };
}

/**
 * Jalankan kumpulan loop naik-turun (0→1→0) yang TIDAK macet di web (PLAN-051).
 *
 * Masalah yang diperbaiki: react-native-web (JS driver) dikenal bermasalah
 * dengan pola `loop.stop()` → `setValue(0)` → loop baru saat layar ganti
 * fokus — animasi bisa macet di posisi akhir (orb diam) sampai navigasi
 * ulang. Karena itu:
 *  - **Web**: loop dijalankan SEKALI saat mount dan hanya berhenti saat
 *    unmount — TANPA churn stop/restart. `enabled` (fokus) diabaikan.
 *  - **Native**: loop hanya berjalan saat `enabled` (guard fokus) — tetap
 *    menjaga mitigasi force close (PLAN-023/024/027: jangan menumpuk
 *    native-driver loop saat layar tertutup di stack navigasi).
 *
 * `specs` HARUS referensi stabil (buat dengan useMemo/useRef di pemanggil)
 * supaya effect tidak restart tiap render.
 */
export function useAmbientLoops(specs: AmbientLoopSpec[], enabled: boolean): void {
  // Web: sekali mount — tidak ada churn stop/restart.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    return startLoops(specs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs]);

  // Native: gated fokus.
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!enabled) return;
    return startLoops(specs);
  }, [specs, enabled]);
}
