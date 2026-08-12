import { useEffect, useRef, type ReactNode } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { play } from "../../../utils/sound";

interface AppModalProps {
  visible: boolean;
  /** Judul di header (opsional). */
  title?: string;
  onClose: () => void;
  children?: ReactNode;
  /** Tap di luar kartu menutup dialog (default true). */
  dismissable?: boolean;
  /** Lebar maksimal kartu (default 380). */
  maxWidth?: number;
}

/**
 * Modal dialog bersama — SATU pola untuk semua popup aplikasi: backdrop gelap,
 * kartu spring masuk, header dengan tombol [✕] konsisten di kanan atas, dan
 * tap di luar kartu menutup (kecuali `dismissable={false}` untuk dialog yang
 * mengharuskan aksi). Dipakai oleh Kata Ajaib, Daftar Tier, Leaderboard,
 * error AI, dan dialog perubahan tier — supaya tidak ada lagi gaya close yang
 * berbeda antar popup.
 */
export default function AppModal({
  visible,
  title,
  onClose,
  children,
  dismissable = true,
  maxWidth = 380,
}: AppModalProps) {
  const { theme } = useTheme();
  const C = theme.colors;
  const { width: winW, height: winH } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(18)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    play("popup");
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    translateYAnim.setValue(18);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 110, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateYAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardWidth = Math.min(maxWidth, winW - 40);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={dismissable ? onClose : undefined}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              maxHeight: winH * 0.85,
              backgroundColor: C.surface,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {title != null ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              {dismissable && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => {
                    play("tap");
                    onClose();
                  }}
                >
                  <Text style={[styles.closeIcon, { color: C.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 30,
  },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  closeIcon: { fontSize: 15, fontWeight: "800", lineHeight: 18 },
});
