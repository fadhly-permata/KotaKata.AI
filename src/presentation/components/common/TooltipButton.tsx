import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";

declare const require: (id: string) => any;

export type TooltipPosition = "top" | "bottom";

export interface TooltipButtonProps
  extends Omit<TouchableOpacityProps, "children" | "onLongPress" | "onPressOut"> {
  /** Teks penjelasan yang muncul saat tombol di-hold lama. */
  tooltip: string;
  /** Emoji/ikon kecil di depan teks tooltip (opsional). */
  icon?: string;
  /** Posisi tooltip relatif terhadap tombol. */
  tooltipPosition?: TooltipPosition;
  /** Style tambahan untuk wrapper (misal margin luar). */
  wrapperStyle?: ViewStyle;
  children: ReactNode;
}

/** Lama tombol ditekan sebelum tooltip muncul. */
const LONG_PRESS_MS = 450;
/** Tooltip otomatis menghilang jika pengguna terus menahan tombol. */
const AUTO_HIDE_MS = 6000;
const TOOLTIP_BG = "rgba(15, 18, 30, 0.95)";
const TOOLTIP_TEXT = "#FFF";

/**
 * Tombol yang menampilkan tooltip penjelasan saat ditekan lama
 * (hold tap/click). Tekan singkat tetap menjalankan aksi normal tombol.
 *
 * Tooltip berukuran otomatis mengikuti isi (auto width), tetapi tidak pernah
 * lebih lebar dari layar. Di web dirender lewat portal ke <body> dengan posisi
 * fixed supaya selalu tampil di atas elemen lain (menghindari masalah stacking
 * context di RN-web) — posisi di-clamp agar tidak terpotong tepi layar.
 * Di native dirender inline di atas tombol.
 */
export default function TooltipButton({
  tooltip,
  icon,
  tooltipPosition = "top",
  wrapperStyle,
  children,
  ...rest
}: TooltipButtonProps) {
  const [visible, setVisible] = useState(false);
  // Posisi tombol relatif viewport (web) untuk penempatan portal.
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  // Posisi horizontal tooltip setelah di-clamp ke dalam layar (web).
  const [tipLeft, setTipLeft] = useState<number | null>(null);
  const wrapRef = useRef<View>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWeb = Platform.OS === "web";
  // require dinamis + inline requires Metro: react-dom hanya dievaluasi di web.
  const createPortal = useMemo(
    () => (isWeb ? (require("react-dom").createPortal as (node: ReactNode, container: Element) => ReactNode) : null),
    [isWeb],
  );

  const showTooltip = useCallback(() => {
    if (isWeb && wrapRef.current) {
      const node = wrapRef.current as unknown as HTMLElement;
      const rect = node.getBoundingClientRect();
      setAnchor({ x: rect.left + rect.width / 2, y: rect.top });
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, [isWeb]);

  const hideTooltip = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(false);
  }, []);

  // Setelah tooltip dirender, ukur lebarnya lalu geser posisinya supaya
  // tidak pernah keluar dari batas layar (auto-size, max 100% lebar layar).
  useEffect(() => {
    if (!isWeb || !visible || !anchor || !tipRef.current) return;
    const boxWidth = tipRef.current.getBoundingClientRect().width;
    const half = Math.min(boxWidth / 2, (window.innerWidth - 16) / 2);
    const minX = half + 8;
    const maxX = Math.max(minX, window.innerWidth - half - 8);
    setTipLeft(Math.min(Math.max(anchor.x, minX), maxX));
  }, [isWeb, visible, anchor, tooltip]);

  const arrowColor = TOOLTIP_BG;
  const arrowStyle: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: tooltipPosition === "top" ? `5px solid ${arrowColor}` : undefined,
    borderBottom: tooltipPosition === "bottom" ? `5px solid ${arrowColor}` : undefined,
  };

  return (
    <View ref={wrapRef} style={[styles.wrap, wrapperStyle]}>
      <TouchableOpacity
        {...rest}
        onLongPress={showTooltip}
        onPressOut={hideTooltip}
        delayLongPress={LONG_PRESS_MS}
        accessibilityHint={tooltip}
      >
        {children}
      </TouchableOpacity>

      {/* Native: tooltip inline di atas tombol (Yoga menghitung lebar konten dengan benar). */}
      {visible && !isWeb && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltipWrap,
            tooltipPosition === "top" ? styles.tooltipTop : styles.tooltipBottom,
          ]}
        >
          <View style={styles.tooltipBox}>
            {icon ? <Text style={styles.tooltipIcon}>{icon}</Text> : null}
            <Text style={styles.tooltipText}>{tooltip}</Text>
          </View>
          <View style={[styles.arrow, tooltipPosition === "top" ? styles.arrowTop : styles.arrowBottom]} />
        </View>
      )}

      {/* Web: portal ke body — bebas dari stacking context aplikasi. */}
      {isWeb && visible && anchor && createPortal
        ? createPortal(
            <div
              ref={tipRef}
              style={{
                position: "fixed",
                left: tipLeft ?? anchor.x,
                top: anchor.y,
                transform: tooltipPosition === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                marginTop: tooltipPosition === "top" ? -8 : 8,
                width: "max-content",
                maxWidth: "calc(100vw - 16px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2147483000,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: TOOLTIP_BG,
                  borderRadius: 9,
                  padding: "6px 11px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {icon ? (
                  <span style={{ fontSize: 14, lineHeight: "16px" }}>{icon}</span>
                ) : null}
                <span
                  style={{
                    color: TOOLTIP_TEXT,
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: "16px",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                  }}
                >
                  {tooltip}
                </span>
              </div>
              <div style={arrowStyle} />
            </div>,
            document.body,
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  tooltipWrap: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  tooltipTop: { bottom: "100%", marginBottom: 8 },
  tooltipBottom: { top: "100%", marginTop: 8 },
  tooltipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TOOLTIP_BG,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  tooltipIcon: { fontSize: 14, lineHeight: 16 },
  tooltipText: {
    color: TOOLTIP_TEXT,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "center",
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
  },
  arrowTop: {
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: TOOLTIP_BG,
  },
  arrowBottom: {
    borderBottomWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: TOOLTIP_BG,
  },
});
