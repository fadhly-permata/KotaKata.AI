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
import type { Theme } from "../providers/ThemeProvider";

/** Rentang & langkah zoom papan — dipakai juga oleh GameScreen (animateZoom). */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.25;

interface GameActionBarProps {
  colors: Theme["colors"];
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
        { flexWrap: "wrap", rowGap: 10 },
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      {/* Zoom Controls (Left) — kaca pembesar + / − */}
      <View style={styles.zoomGroup}>
        <TooltipButton
          tooltip="Perkecil tampilan papan (zoom out)"
          icon="🔍"
          style={[
            styles.zoomBtnSmall,
            { backgroundColor: C.secondaryContainer, opacity: zoomLevel <= ZOOM_MIN ? 0.4 : 1 },
          ]}
          activeOpacity={0.7}
          onPress={onZoomOut}
        >
          <ZoomIcon variant="out" size={18} color={C.text} />
        </TooltipButton>
        <TooltipButton
          tooltip="Atur ulang zoom ke 100%"
          icon="🔍"
          style={[styles.zoomResetBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          activeOpacity={0.7}
          onPress={onResetZoom}
        >
          <Text style={[styles.zoomLabel, { color: C.textSecondary }]}>
            {Math.round(zoomLevel * 100)}%
          </Text>
        </TooltipButton>
        <TooltipButton
          tooltip="Perbesar tampilan papan (zoom in)"
          icon="🔍"
          style={[
            styles.zoomBtnSmall,
            { backgroundColor: C.secondaryContainer, opacity: zoomLevel >= ZOOM_MAX ? 0.4 : 1 },
          ]}
          activeOpacity={0.7}
          onPress={onZoomIn}
        >
          <ZoomIcon variant="in" size={18} color={C.text} />
        </TooltipButton>
      </View>

      {/* Divider — hanya ditampilkan di layar lebar */}
      {!compactBar && <View style={[styles.actionDivider, { backgroundColor: C.border }]} />}

      {/* Reveal Actions (Center) — label statis + 3 tombol icon */}
      <View style={[styles.revealGroup, compactBar ? styles.revealGroupCompact : null]}>
        {!compactBar && (
          <Text style={[styles.clueLabelText, { color: C.textSecondary }]}>Petunjuk</Text>
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
              backgroundColor: allCluesOpened ? C.surface : C.primary,
              opacity: revealClueDisabled ? 0.4 : 1,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (!revealClueDisabled) onRevealClue();
          }}
        >
          <ListNumbersIcon size={18} color={allCluesOpened ? C.textSecondary : "#FFF"} />
          <View style={[styles.clueBadge, { backgroundColor: allCluesOpened ? C.border : "#FFF" }]}>
            <Text
              style={[
                styles.clueBadgeText,
                { color: allCluesOpened ? C.textSecondary : C.primary },
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
              backgroundColor: C.secondaryContainer,
              opacity: revealLetterDisabled ? 0.4 : 1,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (!revealLetterDisabled) onRevealLetter();
          }}
        >
          <Text style={[styles.actionIcon, { color: C.secondary }]}>🔍</Text>
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
              backgroundColor: C.secondaryContainer,
              opacity: revealWordDisabled ? 0.4 : 1,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (!revealWordDisabled) onRevealWord();
          }}
        >
          <Text style={[styles.actionIcon, { color: C.secondary }]}>💡</Text>
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
          style={[styles.rstBtn, { backgroundColor: C.secondaryContainer }]}
          activeOpacity={0.7}
          onPress={onToggleTools}
        >
          <Text style={[styles.rstBtnText, { color: C.secondary }]}>
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
            style={[styles.actionItem, { backgroundColor: C.secondaryContainer }]}
            activeOpacity={0.7}
            onPress={onReset}
          >
            <Text style={[styles.rstBtnText, { color: C.secondary }]}>🔄</Text>
          </TooltipButton>

          <TooltipButton
            tooltip={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
            icon="⌨️"
            accessibilityLabel={keyboardVisible ? "Sembunyikan keyboard" : "Tampilkan keyboard di layar"}
            style={[
              styles.actionItem,
              { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
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
    paddingHorizontal: 14,
    borderRadius: 999,
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
