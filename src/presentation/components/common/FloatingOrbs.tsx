import { Animated, StyleSheet, View } from "react-native";

export interface FloatingOrbSpec {
  width: number;
  height: number;
  backgroundColor: string;
  opacity: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  /** Nilai translateY saat scrollY bergerak 0 → 300 (efek parallax). */
  parallaxRange: [number, number];
  /** Nilai translateY saat animasi idle bergerak 0 → 1 (naik-turun halus). */
  bounceRange: [number, number];
}

interface FloatingOrbsProps {
  scrollY: Animated.Value;
  orbs: FloatingOrbSpec[];
  /** Satu Animated.Value per orb — dijalankan loop naik-turun oleh pemilik layar. */
  orbBounce: Animated.Value[];
}

/**
 * Latar belakang orb floating bersama (parallax saat scroll + idle bounce).
 * Dipakai MainMenu & AuthScreen — dulu kode render-nya duplikat di kedua
 * layar; sekarang cukup lewat `orbs` + `scrollY` + `orbBounce`.
 * Tidak menghalangi sentuhan (pointerEvents="none").
 */
export default function FloatingOrbs({ scrollY, orbs, orbBounce }: FloatingOrbsProps) {
  return (
    <View style={styles.floatingContainer} pointerEvents="none">
      {orbs.map((spec, i) => (
        <Animated.View
          key={i}
          style={[
            styles.floatingOrb,
            {
              width: spec.width,
              height: spec.height,
              backgroundColor: spec.backgroundColor,
              top: spec.top as any,
              left: spec.left as any,
              right: spec.right as any,
              bottom: spec.bottom as any,
              opacity: spec.opacity,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 300],
                    outputRange: spec.parallaxRange,
                    extrapolate: "clamp",
                  }),
                },
                {
                  translateY: orbBounce[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: spec.bounceRange,
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
  floatingContainer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    zIndex: -1,
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 9999,
  },
});
