import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useTheme } from "../providers/ThemeProvider";

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
}: ConfirmDialogProps) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const confirmColor = variant === "danger" ? "#E74C3C" : theme.colors.primary;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.cancelBtn, { borderColor: theme.colors.border }]}
            activeOpacity={0.6}
            onPress={onCancel}
          >
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: confirmColor }]}
            activeOpacity={0.7}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 24,
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
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: { borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: "600" },
  confirmText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
