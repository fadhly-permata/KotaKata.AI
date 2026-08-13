import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../providers/ThemeProvider";

interface ProgressRingProps {
  /** Progres 0..1 (dikunci aman di dalam komponen). */
  progress: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Progress bar lingkaran dengan persentase di tengahnya — ditampilkan di
 * header dalam game, di samping pill XP. Lingkaran SVG diputar -90° lewat
 * wrapper View supaya mulai dari posisi jam 12 (react-native-svg tidak
 * mendukung transform-origin antar platform secara konsisten).
 */
export default function ProgressRing({
  progress,
  size = 34,
  strokeWidth = 3.5,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.rotated,
          { transform: [{ rotate: "-90deg" }] },
        ]}
      >
        <Svg width={size} height={size}>
          {/* Trek (latar) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Isi progres */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </View>
      <Text
        style={[
          styles.percent,
          { fontSize: Math.max(8, size * 0.26), color: theme.colors.textSecondary },
        ]}
      >
        {Math.round(clamped * 100)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  rotated: {
    // Supaya lingkaran mulai dari atas (jam 12), bukan dari kanan (jam 3).
  },
  percent: {
    fontWeight: "800",
    // Sedikit digeser ke kiri supaya benar-benar berada di tengah lingkaran
    // (teks biasanya tampak bergeser ke kanan karena lebar digit berbeda).
    marginLeft: -1,
  },
});
