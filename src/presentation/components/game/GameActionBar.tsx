import { useCallback, useRef, useState } from "react";
import {
  Animated,
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
import {
  XP_PENALTY_CLUE_2,
  XP_PENALTY_CLUE_3,
  XP_PENALTY_REVEAL,
} from "../../../domain/usecases/xpEngine";
import type { BoardColors } from "../../themes/themeData";

/** Rentang & langkah zoom papan — dipakai juga oleh GameScreen (animateZoom). */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.25;

/** Jumlah "halaman" tombol di panel hint (zoom / petunjuk / alat). */
const PAGE_COUNT = 3;

interface GameActionBarProps {
  /** Palet PAPAN (tema papan aktif) — panel hint ikut berganti tema papan. */
  colors: BoardColors;
  zoomLevel: number;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  allCluesOpened: boolean;
  nextClueToReveal: 2 | 3;
  aiMode: boolean;
  revealClueDisabled: boolean;
  onRevealClue: () => void;
  revealLetterDisabled: boolean;
  onRevealLetter: () => void;
  revealWordDisabled: boolean;
  onRevealWord: () => void;
  keyboardVisible: boolean;
  onToggleKeyboard: () => void;
  onReset: () => void;
}

/**
 * Panel aksi (hint) di bawah clue pill — PLAN-035: semua tombol (zoom,
 * petunjuk clue/huruf/kata, reset & keyboard) dibagi jadi beberapa Halaman
 * yang bisa di-swipe kiri/kanan + panah ◀ ▶ (seperti navigasi soal di
 * CluePill), sehingga panel cukup TINGGI SATU BARIS dan tidak memakan banyak
 * ruang layar. Transisi antar halaman memakai paging ScrollView yang halus
 * (snap per halaman) + opacity panah mengikuti posisi scroll.
 *
 * Halaman:
 *   0 — Zoom (perkecil / 100% / perbesar)
 *   1 — Petunjuk (buka clue 2→3, reveal huruf, reveal kata)
 *   2 — Alat (reset papan, toggle keyboard)
 */
export default function GameActionBar({
  colors: C,
  zoomLevel,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  allCluesOpened,
  nextClueToReveal,
  aiMode,
  revealClueDisabled,
  onRevealClue,
  revealLetterDisabled,
  onRevealLetter,
  revealWordDisabled,
  onRevealWord,
  keyboardVisible,
  onToggleKeyboard,
  onReset,
}: GameActionBarProps) {
  const { width: winW } = useWindowDimensions();
  // Lebar satu halaman = lebar area pager (diukur onLayout; fallback awal
  // memakai lebar layar dikurangi padding panel supaya tidak blank).
  const [pageWidth, setPageWidth] = useState(() => Math.max(160, winW - 56));
  const pageWidthRef = useRef(pageWidth);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  // Posisi scroll X — menggerakkan opacity panah kanan/kiri secara FLUID
  // (panah kiri redup di halaman 0, panah kanan redup di halaman terakhir).
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

  // Perbarui halaman aktif saat swipe (momentum selesai / saat berhenti).
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

  return (
    <View
      style={[
        styles.actionBar,
        { backgroundColor: C.hintBackground, borderColor: C.hintBorder },
      ]}
    >
      {/* ◀ Panah kiri — pindah ke halaman tombol sebelumnya */}
      <TouchableOpacity
        accessibilityLabel="Panel alat sebelumnya"
        accessibilityHint="Geser ke halaman tombol sebelumnya"
        disabled={page === 0}
        activeOpacity={0.7}
        onPress={() => goToPage(page - 1)}
        style={[styles.arrowBtn, { backgroundColor: C.hintSecondary }]}
      >
        <Animated.View style={{ opacity: leftArrowOpacity }}>
          <NextIcon flipped size={16} color={C.hintIcon} />
        </Animated.View>
      </TouchableOpacity>

      {/* Pager — halaman tombol bisa di-swipe kiri/kanan (paging halus) */}
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
          {/* ─── Halaman 1: Zoom ─── */}
          <View style={[styles.page, { width: pageWidth }]}>
            <TooltipButton
              tooltip="Perkecil tampilan papan (zoom out)"
              icon="🔍"
              style={[
                styles.zoomBtnSmall,
                { backgroundColor: C.hintSecondary, opacity: zoomLevel <= ZOOM_MIN ? 0.4 : 1 },
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
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.zoomLabel, { color: C.hintTextSecondary }]}
              >
                {Math.round(zoomLevel * 100)}%
              </Text>
            </TooltipButton>
            <TooltipButton
              tooltip="Perbesar tampilan papan (zoom in)"
              icon="🔍"
              style={[
                styles.zoomBtnSmall,
                { backgroundColor: C.hintSecondary, opacity: zoomLevel >= ZOOM_MAX ? 0.4 : 1 },
              ]}
              activeOpacity={0.7}
              onPress={onZoomIn}
            >
              <ZoomIcon variant="in" size={18} color={C.hintText} />
            </TooltipButton>
          </View>

          {/* ─── Halaman 2: Petunjuk (reveal) ─── */}
          <View style={[styles.page, { width: pageWidth }]}>
            {/* Reveal petunjuk — buka clue 2 dulu, lalu 3 (XP potong sekali) */}
            <TooltipButton
              tooltip={
                allCluesOpened
                  ? "Semua petunjuk sudah terbuka"
                  : nextClueToReveal === 2
                    ? aiMode
                      ? "Buka petunjuk ke-2 (gratis — Mode AI tanpa XP)"
                      : `Petunjuk ke-2 — −${XP_PENALTY_CLUE_2} XP (sekali, lalu gratis)`
                    : aiMode
                      ? "Buka petunjuk ke-3 (gratis — Mode AI tanpa XP)"
                      : `Petunjuk ke-3 — −${XP_PENALTY_CLUE_3} XP (sekali, lalu gratis)`
              }
              icon="📖"
              accessibilityLabel={
                allCluesOpened
                  ? "Semua petunjuk sudah terbuka"
                  : `Buka petunjuk ke-${nextClueToReveal}`
              }
              style={[
                styles.actionItem,
                {
                  backgroundColor: allCluesOpened ? C.hintBackground : C.hintPrimary,
                  opacity: revealClueDisabled ? 0.4 : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (!revealClueDisabled) onRevealClue();
              }}
            >
              <ListNumbersIcon size={18} color={allCluesOpened ? C.hintTextSecondary : C.hintPrimaryText} />
              <View style={[styles.clueBadge, { backgroundColor: allCluesOpened ? C.hintBorder : C.hintBadgeBackground }]}>
                <Text
                  style={[
                    styles.clueBadgeText,
                    { color: allCluesOpened ? C.hintTextSecondary : C.hintBadgeText },
                  ]}
                >
                  {allCluesOpened ? "✓" : nextClueToReveal}
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
                {
                  backgroundColor: C.hintSecondary,
                  opacity: revealLetterDisabled ? 0.4 : 1,
                },
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
                {
                  backgroundColor: C.hintSecondary,
                  opacity: revealWordDisabled ? 0.4 : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (!revealWordDisabled) onRevealWord();
              }}
            >
              <Text style={[styles.actionIcon, { color: C.hintIcon }]}>💡</Text>
            </TooltipButton>
          </View>

          {/* ─── Halaman 3: Alat (Reset + Keyboard) ─── */}
          <View style={[styles.page, { width: pageWidth }]}>
            <TooltipButton
              tooltip="Reset papan — kosongkan jawaban & XP"
              icon="🔄"
              style={[styles.actionItem, { backgroundColor: C.hintSecondary }]}
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
              ]}
              activeOpacity={0.7}
              onPress={onToggleKeyboard}
            >
              <KeyboardIcon size={24} />
            </TooltipButton>
          </View>
        </ScrollView>

        {/* Indikator halaman — titik kecil di bawah tombol */}
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

      {/* ▶ Panah kanan — pindah ke halaman tombol berikutnya */}
      <TouchableOpacity
        accessibilityLabel="Panel alat berikutnya"
        accessibilityHint="Geser ke halaman tombol berikutnya"
        disabled={page === PAGE_COUNT - 1}
        activeOpacity={0.7}
        onPress={() => goToPage(page + 1)}
        style={[styles.arrowBtn, { backgroundColor: C.hintSecondary }]}
      >
        <Animated.View style={{ opacity: rightArrowOpacity }}>
          <NextIcon size={16} color={C.hintIcon} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    // Radius tetap (PLAN-034): panel satu baris, rapi di semua layar.
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
