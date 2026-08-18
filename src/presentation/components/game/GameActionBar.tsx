import { useCallback, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import TooltipButton from "../common/TooltipButton";
import ZoomIcon from "../icons/ZoomIcon";
import KeyboardIcon from "../icons/KeyboardIcon";
import ListNumbersIcon from "../icons/ListNumbersIcon";
import NextIcon from "../icons/NextIcon";
import { neumorphicShadow } from "../../../utils/neumorphic";
import {
  XP_PENALTY_CLUE_2,
  XP_PENALTY_CLUE_3,
  XP_PENALTY_REVEAL,
} from "../../../domain/usecases/xpEngine";
import type { BoardColors, NeumorphicShadowSpec } from "../../themes/themeData";

/** Rentang & langkah zoom papan — dipakai juga oleh GameScreen (animateZoom). */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.25;

/** Jumlah "halaman" tombol di panel hint (zoom / petunjuk / alat). */
const PAGE_COUNT = 3;

/** Lebar minimum layar untuk mode "desktop" (semua tombol tampil sekaligus). */
const DESKTOP_MIN_WIDTH = 700;

interface GameActionBarProps {
  /** Palet PAPAN (tema papan aktif) — panel hint ikut berganti tema papan. */
  colors: BoardColors;
  /** Bayangan neumorphic tema aktif (PLAN-037) — opsional, hanya neumorfik. */
  shadow?: NeumorphicShadowSpec;
  zoomLevel: number;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  /* PLAN-057: tombol Clue 2 & Clue 3 dipisah — masing-masing punya flag & callback sendiri. */
  clue2Opened: boolean;
  clue3Opened: boolean;
  allCluesOpened: boolean;
  aiMode: boolean;
  clue2Disabled: boolean;
  onRevealClue2: () => void;
  clue3Disabled: boolean;
  onRevealClue3: () => void;
  revealLetterDisabled: boolean;
  onRevealLetter: () => void;
  revealWordDisabled: boolean;
  onRevealWord: () => void;
  keyboardVisible: boolean;
  onToggleKeyboard: () => void;
  onReset: () => void;
}

/** Separator visual antar grup tombol (PLAN-058). */
function ActionSeparator({ color }: { color: string }) {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
}

/** Label grup tombol (PLAN-058). */
function GroupLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.groupLabel, { color }]}>{label}</Text>
  );
}

/**
 * Panel aksi (hint) di bawah clue pill.
 *
 * PLAN-056: Non-ponsel (≥700px) → semua tombol tampil sekaligus tanpa pager.
 * Ponsel (<700px) → pager 3 halaman seperti semula (zoom / petunjuk / alat).
 * PLAN-057: Tombol buka Clue 2 & Clue 3 dipisah (dua tombol terpisah).
 * PLAN-058: Tombol dikelompokkan berdasarkan fungsi dengan separator:
 *   [Zoom] | [Petunjuk: Clue2 · Clue3 · Huruf · Kata] | [Alat: Reset · Keyboard]
 */
export default function GameActionBar({
  colors: C,
  shadow,
  zoomLevel,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  clue2Opened,
  clue3Opened,
  allCluesOpened,
  aiMode,
  clue2Disabled,
  onRevealClue2,
  clue3Disabled,
  onRevealClue3,
  revealLetterDisabled,
  onRevealLetter,
  revealWordDisabled,
  onRevealWord,
  keyboardVisible,
  onToggleKeyboard,
  onReset,
}: GameActionBarProps) {
  const { width: winW } = useWindowDimensions();
  const isDesktop = winW >= DESKTOP_MIN_WIDTH;

  // Pager state (hanya dipakai di mode mobile / ponsel).
  const [pageWidth, setPageWidth] = useState(() => Math.max(160, winW - 56));
  const pageWidthRef = useRef(pageWidth);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onLayoutPager = useCallback((w: number) => {
    pageWidthRef.current = w;
    setPageWidth(w);
  }, []);

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, next));
      pageRef.current = clamped;
      setPage(clamped);
      scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true });
    },
    [pageWidth],
  );

  const syncPageFromOffset = useCallback((x: number) => {
    const w = pageWidthRef.current;
    if (w <= 0) return;
    const p = Math.round(x / w);
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, p));
    if (clamped !== pageRef.current) {
      pageRef.current = clamped;
      setPage(clamped);
    }
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      scrollX.setValue(x);
      syncPageFromOffset(x);
    },
    [scrollX, syncPageFromOffset],
  );

  const leftArrowOpacity = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.45],
    outputRange: [0.25, 1],
    extrapolate: "clamp",
  });
  const rightArrowOpacity = scrollX.interpolate({
    inputRange: [(PAGE_COUNT - 2) * pageWidth, (PAGE_COUNT - 1) * pageWidth],
    outputRange: [1, 0.25],
    extrapolate: "clamp",
  });

  /* ── Tombol zoom (Reusable) ──────────────────────────────────────────── */
  const zoomButtons = (
    <>
      <TooltipButton
        tooltip="Perkecil tampilan papan (zoom out)"
        icon="🔍"
        style={[
          styles.zoomBtnSmall,
          { backgroundColor: C.hintSecondary, opacity: zoomLevel <= ZOOM_MIN ? 0.4 : 1 },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={onZoomOut}
      >
        <ZoomIcon variant="out" size={18} color={C.hintText} />
      </TooltipButton>
      <TooltipButton
        tooltip="Atur ulang zoom ke 100%"
        icon="🔍"
        style={[styles.zoomResetBtn, { backgroundColor: C.hintBackground, borderColor: C.hintBorder }]}
        activeOpacity={0.7}
        onPress={onResetZoom}
      >
        <Text maxFontSizeMultiplier={1.2} style={[styles.zoomLabel, { color: C.hintTextSecondary }]}>
          {Math.round(zoomLevel * 100)}%
        </Text>
      </TooltipButton>
      <TooltipButton
        tooltip="Perbesar tampilan papan (zoom in)"
        icon="🔍"
        style={[
          styles.zoomBtnSmall,
          { backgroundColor: C.hintSecondary, opacity: zoomLevel >= ZOOM_MAX ? 0.4 : 1 },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={onZoomIn}
      >
        <ZoomIcon variant="in" size={18} color={C.hintText} />
      </TooltipButton>
    </>
  );

  /* ── Tombol petunjuk (PLAN-057: Clue 2 & Clue 3 terpisah) ──────────────── */
  const clueButtons = (
    <>
      {/* Clue 2 — PLAN-057: tombol terpisah */}
      <TooltipButton
        tooltip={
          clue2Opened
            ? "Petunjuk ke-2 sudah dibuka ✓"
            : aiMode
              ? "Buka petunjuk ke-2 (gratis — Mode AI tanpa XP)"
              : `Petunjuk ke-2 — −${XP_PENALTY_CLUE_2} XP (sekali, lalu gratis)`
        }
        icon="📖"
        accessibilityLabel={clue2Opened ? "Petunjuk ke-2 sudah dibuka" : "Buka petunjuk ke-2"}
        style={[
          styles.actionItem,
          {
            backgroundColor: clue2Opened ? C.hintBackground : C.hintPrimary,
            opacity: clue2Disabled ? 0.4 : 1,
          },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (!clue2Disabled) onRevealClue2();
        }}
      >
        <ListNumbersIcon size={18} color={clue2Opened ? C.hintTextSecondary : C.hintPrimaryText} />
        <View style={[styles.clueBadge, { backgroundColor: clue2Opened ? C.hintBorder : C.hintBadgeBackground }]}>
          <Text style={[styles.clueBadgeText, { color: clue2Opened ? C.hintTextSecondary : C.hintBadgeText }]}>
            {clue2Opened ? "✓" : "2"}
          </Text>
        </View>
      </TooltipButton>

      {/* Clue 3 — PLAN-057: tombol terpisah */}
      <TooltipButton
        tooltip={
          clue3Opened
            ? "Petunjuk ke-3 sudah dibuka ✓"
            : aiMode
              ? "Buka petunjuk ke-3 (gratis — Mode AI tanpa XP)"
              : `Petunjuk ke-3 — −${XP_PENALTY_CLUE_3} XP (sekali, lalu gratis)`
        }
        icon="🔤"
        accessibilityLabel={clue3Opened ? "Petunjuk ke-3 sudah dibuka" : "Buka petunjuk ke-3"}
        style={[
          styles.actionItem,
          {
            backgroundColor: clue3Opened ? C.hintBackground : C.hintSecondary,
            opacity: !clue2Opened ? 0.4 : 1, // nonaktif kalau clue 2 belum dibuka
          },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (clue2Opened && !clue3Disabled) onRevealClue3();
        }}
      >
        <Text style={[styles.actionIcon, { color: clue3Opened ? C.hintTextSecondary : C.hintIcon }]}>🔤</Text>
        <View style={[styles.clueBadge, { backgroundColor: clue3Opened ? C.hintBorder : C.hintBadgeBackground }]}>
          <Text style={[styles.clueBadgeText, { color: clue3Opened ? C.hintTextSecondary : C.hintBadgeText }]}>
            {clue3Opened ? "✓" : "3"}
          </Text>
        </View>
      </TooltipButton>

      {/* Reveal letter */}
      <TooltipButton
        tooltip={
          revealLetterDisabled
            ? "Semua huruf kata ini sudah benar/terkunci — tidak ada yang bisa dibuka"
            : aiMode
              ? "Buka satu huruf dari kata terpilih (gratis — Mode AI tanpa XP)"
              : `Buka satu huruf dari kata terpilih (−${XP_PENALTY_REVEAL} XP)`
        }
        icon="🔍"
        accessibilityLabel="Buka satu huruf"
        style={[
          styles.actionItem,
          { backgroundColor: C.hintSecondary, opacity: revealLetterDisabled ? 0.4 : 1 },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (!revealLetterDisabled) onRevealLetter();
        }}
      >
        <Text style={[styles.actionIcon, { color: C.hintIcon }]}>🔍</Text>
      </TooltipButton>

      {/* Reveal word */}
      <TooltipButton
        tooltip={
          revealWordDisabled
            ? "Semua huruf kata ini sudah benar/terkunci — tidak ada yang bisa dibuka"
            : aiMode
              ? "Buka semua huruf kata (gratis — Mode AI tanpa XP)"
              : `Buka semua huruf kata — −${XP_PENALTY_REVEAL} XP (tanpa XP kata)`
        }
        icon="💡"
        accessibilityLabel="Buka semua huruf"
        style={[
          styles.actionItem,
          { backgroundColor: C.hintSecondary, opacity: revealWordDisabled ? 0.4 : 1 },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (!revealWordDisabled) onRevealWord();
        }}
      >
        <Text style={[styles.actionIcon, { color: C.hintIcon }]}>💡</Text>
      </TooltipButton>
    </>
  );

  /* ── Tombol alat ──────────────────────────────────────────────────────── */
  const toolButtons = (
    <>
      <TooltipButton
        tooltip="Reset papan — kosongkan jawaban & XP"
        icon="🔄"
        style={[styles.actionItem, { backgroundColor: C.hintSecondary }, neumorphicShadow(shadow)]}
        activeOpacity={0.7}
        onPress={onReset}
      >
        <Text style={[styles.rstBtnText, { color: C.hintIcon }]}>🔄</Text>
      </TooltipButton>

      <TooltipButton
        tooltip={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
        icon="⌨️"
        accessibilityLabel={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
        style={[
          styles.actionItem,
          { backgroundColor: C.hintBackground, borderWidth: 1, borderColor: C.hintBorder },
          neumorphicShadow(shadow),
        ]}
        activeOpacity={0.7}
        onPress={onToggleKeyboard}
      >
        <KeyboardIcon size={24} />
      </TooltipButton>
    </>
  );

  /* ═══════════════════════════════════════════════════════════════════════
   * Mode Desktop (PLAN-056): ≥700px → semua tombol sekaligus, berkelompok
   * dengan separator (PLAN-058).
   * ═══════════════════════════════════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <View
        style={[
          styles.actionBarDesktop,
          { backgroundColor: C.hintBackground, borderColor: C.hintBorder },
          neumorphicShadow(shadow),
        ]}
      >
        {/* Grup: Zoom */}
        <View style={styles.desktopGroup}>
          <GroupLabel label="Zoom" color={C.hintTextSecondary} />
          <View style={styles.desktopGroupRow}>{zoomButtons}</View>
        </View>

        <ActionSeparator color={C.hintBorder} />

        {/* Grup: Petunjuk */}
        <View style={styles.desktopGroup}>
          <GroupLabel label="Petunjuk" color={C.hintTextSecondary} />
          <View style={styles.desktopGroupRow}>{clueButtons}</View>
        </View>

        <ActionSeparator color={C.hintBorder} />

        {/* Grup: Alat */}
        <View style={styles.desktopGroup}>
          <GroupLabel label="Alat" color={C.hintTextSecondary} />
          <View style={styles.desktopGroupRow}>{toolButtons}</View>
        </View>
      </View>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * Mode Mobile (ponsel): pager 3 halaman seperti semula.
   * ═══════════════════════════════════════════════════════════════════════ */
  return (
    <View
      style={[
        styles.actionBar,
        { backgroundColor: C.hintBackground, borderColor: C.hintBorder },
        neumorphicShadow(shadow),
      ]}
    >
      <TouchableOpacity
        accessibilityLabel="Panel alat sebelumnya"
        accessibilityHint="Geser ke halaman tombol sebelumnya"
        disabled={page === 0}
        activeOpacity={0.7}
        onPress={() => goToPage(page - 1)}
        style={[styles.arrowBtn, { backgroundColor: C.hintSecondary }, neumorphicShadow(shadow)]}
      >
        <Animated.View style={{ opacity: leftArrowOpacity }}>
          <NextIcon flipped size={16} color={C.hintIcon} />
        </Animated.View>
      </TouchableOpacity>

      <View
        style={styles.pager}
        onLayout={(e) => onLayoutPager(e.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={(e) =>
            syncPageFromOffset(e.nativeEvent.contentOffset.x)
          }
          scrollEventThrottle={16}
          style={styles.pagerScroll}
        >
          {/* Halaman 1: Zoom */}
          <View style={[styles.page, { width: pageWidth }]}>{zoomButtons}</View>

          {/* Halaman 2: Petunjuk */}
          <View style={[styles.page, { width: pageWidth }]}>{clueButtons}</View>

          {/* Halaman 3: Alat */}
          <View style={[styles.page, { width: pageWidth }]}>{toolButtons}</View>
        </ScrollView>

        <View style={styles.dotsRow} pointerEvents="none">
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? C.hintPrimary : C.hintBorder },
              ]}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        accessibilityLabel="Panel alat berikutnya"
        accessibilityHint="Geser ke halaman tombol berikutnya"
        disabled={page === PAGE_COUNT - 1}
        activeOpacity={0.7}
        onPress={() => goToPage(page + 1)}
        style={[styles.arrowBtn, { backgroundColor: C.hintSecondary }, neumorphicShadow(shadow)]}
      >
        <Animated.View style={{ opacity: rightArrowOpacity }}>
          <NextIcon size={16} color={C.hintIcon} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ─── Mode mobile (ponsel) — pager seperti semula ─── */
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  arrowBtn: {
    width: 32,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pager: { flex: 1, marginHorizontal: 4 },
  pagerScroll: { flexGrow: 0 },
  page: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 6,
    height: 40,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    height: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  /* ─── Mode desktop (PLAN-056): semua tombol sekaligus ─── */
  actionBarDesktop: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 6,
  },
  desktopGroup: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  desktopGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* ─── Shared ─── */
  separator: {
    width: 1,
    height: 36,
    borderRadius: 0.5,
    marginHorizontal: 4,
  },
  groupLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  zoomBtnSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  zoomResetBtn: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "center" },
  actionItem: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 18 },
  clueBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  clueBadgeText: { fontSize: 9, fontWeight: "800" },
  rstBtnText: { fontSize: 16 },
});
