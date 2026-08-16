import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { play } from "../../../utils/sound";
import { buttonShadow, overlayColor, solidSurfaceColor, textOnPrimary } from "../../../utils/skin";
import { useEscapeClose } from "./useEscapeClose";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "normal";
  emoji?: string;
  /** Ikon (emoji) di tombol konfirmasi — opsional, bikin tombol lebih ceria. */
  confirmIcon?: string;
  /** Ikon (emoji) di tombol batal — opsional. */
  cancelIcon?: string;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = "normal",
  emoji,
  confirmIcon,
  cancelIcon,
}: ConfirmDialogProps) {
  const { theme } = useTheme();
  // Responsif: layar sempit (HP) → tombol vertikal menumpuk; layar lebar →
  // dua tombol berdampingan.
  const { width: winW } = useWindowDimensions();
  const isNarrow = winW < 400;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(18)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ESC (web) = Batal — membatalkan dialog konfirmasi tanpa aksi berbahaya.
  useEscapeClose(visible, onCancel);

  useEffect(() => {
    if (visible) {
      // Popup muncul — efek suara "whoosh" halus.
      play("popup");
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      translateYAnim.setValue(18);
      backdropAnim.setValue(0);
      // Spring ceria: kartu membesar sedikit melewati ukuran asli lalu
      // mendarat halus — lebih hidup daripada timing linear.
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 110, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const confirmColor = variant === "danger" ? theme.colors.error : theme.colors.primary;

  return (
    <View style={styles.wrapper}>
      {/* Backdrop memudar masuk pelan — elegan, tidak mencolok. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: backdropAnim, backgroundColor: overlayColor(theme) },
        ]}
      />
      <Animated.View
        style={[
          styles.dialog,
          {
            // PLAN-043: kartu dialog SOLID — jangan tembus pandang (tema
            // glass/frost memakai surface rgba yang membuat teks sulit dibaca).
            backgroundColor: solidSurfaceColor(theme),
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>

        <View style={[styles.buttons, isNarrow ? styles.buttonsNarrow : styles.buttonsWide]}>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.cancelBtn,
              { borderColor: theme.colors.border },
              buttonShadow(theme),
            ]}
            activeOpacity={0.6}
            onPress={() => {
              play("tap");
              onCancel();
            }}
          >
            <View style={styles.btnLabelRow}>
              {cancelIcon ? <Text style={styles.btnIcon}>{cancelIcon}</Text> : null}
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>{cancelText}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: confirmColor }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              onConfirm();
            }}
          >
            <View style={styles.btnLabelRow}>
              {confirmIcon ? <Text style={styles.btnIcon}>{confirmIcon}</Text> : null}
              <Text style={[styles.confirmText, { color: textOnPrimary(theme) }]}>
                {confirmText}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 24,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emoji: { fontSize: 36 },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  buttons: {
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  buttonsNarrow: {
    flexDirection: "column",
  },
  buttonsWide: {
    flexDirection: "row",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnIcon: { fontSize: 15 },
  cancelBtn: { borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: "600" },
  confirmText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
