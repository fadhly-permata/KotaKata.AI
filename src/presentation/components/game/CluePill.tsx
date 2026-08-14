import { StyleSheet, Text, View, type GestureResponderHandlers } from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import TooltipButton from "../common/TooltipButton";
import NextIcon from "../icons/NextIcon";
import NumberSquareIcon from "../icons/NumberSquareIcon";

export type ShownClueLevel = 1 | 2 | 3;

interface CluePillProps {
  /** Handler swipe kiri/kanan untuk ganti kata (dibuat oleh GameScreen). */
  panHandlers: GestureResponderHandlers;
  onPrevWord: () => void;
  onNextWord: () => void;
  /** Nomor clue kata yang sedang dipilih (dari sel pertama kata). */
  wordNumber: number | string;
  canRotateClue: boolean;
  clue3Opened: boolean;
  shownClueLevel: ShownClueLevel;
  clueLevelLabel: string;
  clueLevelText: string;
  onSwitchClue: () => void;
}

/**
 * Panel soal (clue pill) di bawah papan: navigasi kata (◀ ▶), nomor clue,
 * tombol ganti tampilan clue (utama → penjelasan → sinonim) dan teks clue.
 * Tinggi pill mengikuti teks (auto-height) — TANPA overflow hidden, karena di
 * Android overflow:hidden + borderRadius memotong baris teks yang terbungkus.
 * Di-extract dari GameScreen supaya file layar tetap ramping.
 */
export default function CluePill({
  panHandlers,
  onPrevWord,
  onNextWord,
  wordNumber,
  canRotateClue,
  clue3Opened,
  shownClueLevel,
  clueLevelLabel,
  clueLevelText,
  onSwitchClue,
}: CluePillProps) {
  // Palet PAPAN (tema papan aktif) — panel soal ikut berganti tema papan.
  const { boardColors: B } = useTheme();
  return (
    <View style={[styles.cluePill, { backgroundColor: B.clueBackground }]} {...panHandlers}>
      {/* Nav kata */}
      <TooltipButton
        tooltip="Kata sebelumnya"
        icon="◀️"
        activeOpacity={0.7}
        onPress={onPrevWord}
        style={[styles.clueArrow, { backgroundColor: B.clueArrowBackground }]}
      >
        <NextIcon flipped size={17} color={B.clueText} />
      </TooltipButton>
      <View style={[styles.clueNumberBadge, { backgroundColor: B.clueBadgeBackground }]}>
        <Text style={[styles.clueNumberText, { color: B.clueBadgeText }]}>{wordNumber}</Text>
      </View>
      <TooltipButton
        tooltip="Kata berikutnya"
        icon="▶️"
        activeOpacity={0.7}
        onPress={onNextWord}
        style={[styles.clueArrow, { backgroundColor: B.clueArrowBackground }]}
      >
        <NextIcon size={17} color={B.clueText} />
      </TooltipButton>

      {/* Separator */}
      <View style={[styles.clueDivider, { backgroundColor: B.clueDivider }]} />

      {/* Tombol ganti tampilan clue — ditaruh di DEPAN teks clue biar konteksnya jelas */}
      <TooltipButton
        tooltip={
          !canRotateClue
            ? "Buka petunjuk lain dulu untuk bisa mengganti tampilan clue"
            : clue3Opened
              ? "Ganti tampilan clue (utama → penjelasan → sinonim)"
              : "Ganti tampilan clue (utama ↔ penjelasan)"
        }
        icon="🔁"
        accessibilityLabel="Ganti tampilan clue"
        activeOpacity={0.7}
        onPress={() => {
          if (canRotateClue) onSwitchClue();
        }}
        style={[
          styles.clueSwitchBtn,
          { backgroundColor: B.clueArrowBackground, opacity: canRotateClue ? 1 : 0.4 },
        ]}
      >
        <NumberSquareIcon number={shownClueLevel} size={20} color={B.clueText} />
      </TooltipButton>

      {/* Isi clue — teks utuh (tanpa numberOfLines) supaya tidak pernah
          terpotong; tinggi pill mengikuti panjang teks (auto-height). */}
      <View style={styles.clueContent}>
        <View style={styles.clueTextWrap}>
          <Text style={[styles.clueOrientation, { color: B.clueTextMuted }]}>{clueLevelLabel}</Text>
          <Text style={[styles.clueMain, { color: B.clueText }]}>{clueLevelText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cluePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
    position: "relative",
    // PENTING: pill tidak boleh pernah disusutkan oleh layout (mis. saat
    // keyboard virtual tampil di HP dan ruang vertikal sempit). flexShrink: 0
    // menjamin tinggi pill selalu mengikuti isi teks (auto-height) — kalau
    // Yoga boleh mengecilkan pill, baris teks clue yang terbungkus bisa
    // terpotong di ponsel.
    flexShrink: 0,
  },
  clueArrow: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  clueNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  clueNumberText: { fontSize: 13, fontWeight: "800" },
  clueSwitchBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    marginRight: 6,
  },
  clueDivider: { width: 1, height: 24, marginHorizontal: 6, borderRadius: 1 },
  clueContent: { flex: 1, paddingHorizontal: 2, minWidth: 0, flexShrink: 0 },
  clueTextWrap: { flex: 1, flexShrink: 0, minWidth: 0 },
  clueOrientation: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clueMain: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
});
