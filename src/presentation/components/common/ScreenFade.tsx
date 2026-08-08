import { useCallback, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

interface ScreenFadeProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
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
 */
export default function ScreenFade({ children, style }: ScreenFadeProps) {
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
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
