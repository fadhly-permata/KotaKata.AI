import { StyleSheet, Text, View } from "react-native";
import TooltipButton from "../common/TooltipButton";
import ZoomIcon from "../icons/ZoomIcon";
import KeyboardIcon from "../icons/KeyboardIcon";
import ListNumbersIcon from "../icons/ListNumbersIcon";
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

interface GameActionBarProps {
  /** Palet PAPAN (tema papan aktif) — panel hint ikut berganti tema papan. */
  colors: BoardColors;
  /** Layar ponsel (< 480px): baris kedua (Reset + Keyboard) bisa di-collapse. */
  compactBar: boolean;
  toolsExpanded: boolean;
  onToggleTools: () => void;
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
 * Panel aksi di bawah clue pill: zoom papan, tombol petunjuk (buka clue
 * 2/3, reveal huruf, reveal kata) plus Reset & toggle Keyboard. flexWrap
 * membuat baris turun (bukan overlap) saat layar sempit; di layar ponsel
 * tombol keyboard turun sendiri ke baris kedua (pojok kanan).
 * Di-extract dari GameScreen supaya file layar tetap ramping.
 */
export default function GameActionBar({
  colors: C,
  compactBar,
  toolsExpanded,
  onToggleTools,
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
  return (
    <View
      style={[
        styles.actionBar,
        // PLAN-034: di layar ponsel sempit panel membungkus jadi 2 baris —
        // radius dibuat tetap (bukan pill 999) supaya panel multi-baris tetap
        // rapi dan tidak tampak seperti kapsul raksasa / bergeser (offset).
        { flexWrap: "wrap", rowGap: 10, paddingHorizontal: compactBar ? 10 : 14 },
        { backgroundColor: C.hintBackground, borderColor: C.hintBorder },
      ]}
    >
      {/* Zoom Controls (Left) — kaca pembesar + / − */}
      <View style={styles.zoomGroup}>
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

      {/* Divider — hanya ditampilkan di layar lebar */}
      {!compactBar && <View style={[styles.actionDivider, { backgroundColor: C.hintBorder }]} />}

      {/* Reveal Actions (Center) — label statis + 3 tombol icon */}
      <View style={[styles.revealGroup, compactBar ? styles.revealGroupCompact : null]}>
        {!compactBar && (
          <Text maxFontSizeMultiplier={1.2} style={[styles.clueLabelText, { color: C.hintTextSecondary }]}>
            Petunjuk
          </Text>
        )}

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

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Expand/Collapse — menggantikan posisi tombol Reset di baris pertama
          (khusus layar ponsel). Reset + Keyboard pindah ke baris kedua yang
          bisa di-collapse supaya panel tidak memakan banyak layar. */}
      {compactBar && (
        <TooltipButton
          tooltip={
            toolsExpanded
              ? "Sembunyikan panel alat (Reset & Keyboard)"
              : "Tampilkan panel alat (Reset & Keyboard)"
          }
          icon="⚙️"
          accessibilityLabel={toolsExpanded ? "Sembunyikan panel alat" : "Tampilkan panel alat"}
          style={[styles.rstBtn, { backgroundColor: C.hintSecondary }]}
          activeOpacity={0.7}
          onPress={onToggleTools}
        >
          <Text style={[styles.rstBtnText, { color: C.hintIcon }]}>
            {toolsExpanded ? "▲" : "▼"}
          </Text>
        </TooltipButton>
      )}

      {/* Reset + Keyboard — SATU grup utuh (flex row + gap) supaya keduanya
          selalu berdampingan, tidak pernah terpisah baris saat wrap di layar
          lebar sempit (480–560px). Di layar ponsel grup ini jadi baris kedua
          (collapsible, rata kanan); di tablet/desktop inline satu baris. */}
      {(!compactBar || toolsExpanded) && (
        <View
          style={
            compactBar
              ? [styles.kbRowMobile, { gap: 6, alignItems: "center" }]
              : { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" }
          }
        >
          {/* actionItem (40×40) sama dengan tombol keyboard supaya sejajar */}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    // Radius tetap (bukan pill 999): panel bisa membungkus 2 baris di layar
    // ponsel sempit — pill 999 membuat kapsul raksasa yang tampak kebesaran
    // dan bergeser di Android lama (PLAN-034).
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  zoomGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  actionDivider: { width: 1, height: 24, marginHorizontal: 8 },
  revealGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  revealGroupCompact: { flexGrow: 1, justifyContent: "space-between" },
  actionItem: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 18 },
  clueLabelText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3, marginRight: 4 },
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
  rstBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  rstBtnText: { fontSize: 16 },
  kbRowMobile: { width: "100%", flexDirection: "row", justifyContent: "flex-end" },
});
