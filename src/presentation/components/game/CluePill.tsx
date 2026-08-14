import { StyleSheet, Text, View, type GestureResponderHandlers } from "react-native";
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
  return (
    <View style={[styles.cluePill, { backgroundColor: "#0096cc" }]} {...panHandlers}>
      {/* Nav kata */}
      <TooltipButton
        tooltip="Kata sebelumnya"
        icon="◀️"
        activeOpacity={0.7}
        onPress={onPrevWord}
        style={styles.clueArrow}
      >
        <NextIcon flipped size={17} color="#FFF" />
      </TooltipButton>
      <View style={styles.clueNumberBadge}>
        <Text style={styles.clueNumberText}>{wordNumber}</Text>
      </View>
      <TooltipButton
        tooltip="Kata berikutnya"
        icon="▶️"
        activeOpacity={0.7}
        onPress={onNextWord}
        style={styles.clueArrow}
      >
        <NextIcon size={17} color="#FFF" />
      </TooltipButton>

      {/* Separator */}
      <View style={[styles.clueDivider, { backgroundColor: "rgba(255,255,255,0.35)" }]} />

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
        style={[styles.clueSwitchBtn, { opacity: canRotateClue ? 1 : 0.4 }]}
      >
        <NumberSquareIcon number={shownClueLevel} size={20} color="#FFF" />
      </TooltipButton>

      {/* Isi clue — teks utuh (tanpa numberOfLines) supaya tidak pernah
          terpotong; tinggi pill mengikuti panjang teks (auto-height). */}
      <View style={styles.clueContent}>
        <View style={styles.clueTextWrap}>
          <Text style={styles.clueOrientation}>{clueLevelLabel}</Text>
          <Text style={styles.clueMain}>{clueLevelText}</Text>
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
  },
  clueArrow: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  clueNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  clueNumberText: { fontSize: 13, fontWeight: "800", color: "#0096cc" },
  clueSwitchBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    marginRight: 6,
  },
  clueDivider: { width: 1, height: 24, marginHorizontal: 6, borderRadius: 1 },
  clueContent: { flex: 1, paddingHorizontal: 2, minWidth: 0 },
  clueTextWrap: { flex: 1, flexShrink: 1, minWidth: 0 },
  clueOrientation: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clueMain: { fontSize: 14, color: "#FFF", fontWeight: "600", lineHeight: 19 },
});
