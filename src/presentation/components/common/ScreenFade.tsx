import { useCallback, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../providers/ThemeProvider";
import ThemedBackground from "./ThemedBackground";
import AmbientOrbs from "./AmbientOrbs";
import AmbientFx from "./AmbientFx";
import AmbientSoundHint from "./AmbientSoundHint";
import type { BackgroundSpec } from "../../themes/themeData";

interface ScreenFadeProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Spec latar layar. Default: background tema aplikasi aktif.
   * Kirim `background={null}` untuk layar yang ingin memakai warna solid
   * dari `style`-nya sendiri tanpa lapisan latar tema.
   */
  background?: BackgroundSpec | null;
  /**
   * Render orb ambien di belakang konten (default true — efek orb di semua
   * halaman). Main Menu & Login mematikan via `orbs={false}` karena sudah
   * punya FloatingOrbs parallax sendiri.
   */
  orbs?: boolean;
}

/**
 * Animasi masuk layar yang jalan di SEMUA platform — termasuk web, karena
 * `@react-navigation/native-stack` hanya menganimasikan transisi di
 * iOS/Android (react-native-screens), di web transisinya tidak dirender.
 *
 * Animasi dipicu lewat useFocusEffect, BUKAN useEffect saat mount: React
 * Navigation tidak me-remount layar yang sudah pernah dibuka (layar tetap
 * terpasang di stack), jadi animasi berbasis mount hanya jalan sekali.
 * Dengan useFocusEffect, halaman memudar masuk + naik sedikit dari bawah
 * SETIAP kali layar mendapat fokus — termasuk saat kembali dari layar lain.
 *
 * Sejak dukungan background tema (gradien/gambar), ScreenFade otomatis
 * merender lapisan latar tema aplikasi aktif di belakang konten layar —
 * lihat `ThemedBackground`. Warna solid yang dikirim lewat `style`
 * (backgroundColor) tetap dipakai sebagai dasar di bawah lapisan itu.
 */
export default function ScreenFade({ children, style, background, orbs = true }: ScreenFadeProps) {
  const { theme: activeTheme, background: appBackground } = useTheme();
  const ambientFx = activeTheme.ambientFx;
  const anim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [anim]),
  );

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <Animated.View style={[styles.fill, { opacity: anim, transform: [{ translateY }] }, style]}>
      <ThemedBackground spec={background ?? appBackground} />
      {/* PLAN-044: tema yang punya suasana backsound spesifik (hujan/angin/
          bara/dll) menggantikan orb dengan partikel yang mengikuti suasana
          itu; tema lain tetap pakai orb biasa. */}
      {orbs && (ambientFx && ambientFx !== "none" ? <AmbientFx fx={ambientFx} /> : <AmbientOrbs />)}
      {children}
      {/* Web: hint saat backsound diblokir autoplay (native: tidak dirender). */}
      <AmbientSoundHint />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
