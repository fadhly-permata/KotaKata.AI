import { useEffect, useRef } from "react";
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
 * Masalah yang diperbaiki: react-native-web (JS driver) bermasalah dengan
 * pola `loop.stop()` → `setValue(0)` → loop baru — animasi bisa macet di
 * posisi akhir (orb diam). Dua sumber churn yang dimatikan:
 *  1. Churn fokus (guard `useIsFocused`): di web loop dijalankan SEKALI saat
 *     mount dan hanya berhenti saat unmount — `enabled` diabaikan.
 *  2. Churn render (array specs/values yang tidak stabil — mis. dibuat inline
 *     di body komponen): guard `webStartedRef` memastikan loop web HANYA
 *     dimulai sekali walau effect dijalankan ulang berkali-kali.
 *
 * Di NATIVE loop hanya berjalan saat `enabled` (guard fokus) — tetap menjaga
 * mitigasi force close (PLAN-023/024/027: jangan menumpuk native-driver loop
 * saat layar tertutup di stack navigasi). Pemanggil tetap disarankan memberi
 * specs referensi stabil (useMemo/useRef) supaya native juga tidak churn.
 */
export function useAmbientLoops(specs: AmbientLoopSpec[], enabled: boolean): void {
  // Web: loop dijalankan SEKALI saat mount (deps `[]` → tidak pernah
  // dijalankan ulang karena render/fokus). StrictMode dev tetap aman:
  // mount → start → cleanup → start lagi. specs dibaca lewat ref supaya
  // nilai terbaru terpakai tanpa menjadikannya dependency.
  const specsRef = useRef(specs);
  specsRef.current = specs;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    return startLoops(specsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native: gated fokus (specs stabil dari useMemo/useRef pemanggil).
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!enabled) return;
    return startLoops(specs);
  }, [specs, enabled]);
}
