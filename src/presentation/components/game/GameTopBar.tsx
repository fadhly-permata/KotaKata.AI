import { StyleSheet, Text, View } from "react-native";
import TooltipButton from "../common/TooltipButton";
import ProgressRing from "./ProgressRing";
import { neumorphicShadow } from "../../../utils/neumorphic";
import type { Theme } from "../providers/ThemeProvider";
import type { NeumorphicShadowSpec } from "../../themes/themeData";

interface GameTopBarProps {
  colors: Theme["colors"];
  isDark: boolean;
  onToggleTheme: () => void;
  aiMode: boolean;
  compactBar: boolean;
  totalXp: number;
  currentXp: number;
  fillProgress: number;
  /** inset status bar (0 di web) — padding atas mengikuti inset supaya konten
   *  tidak masuk ke balik status bar (looks fullscreen di Android edge-to-edge). */
  topInset: number;
  onBack: () => void;
  /** Bayangan neumorphic tema aktif (PLAN-037) — opsional, hanya neumorfik. */
  shadow?: NeumorphicShadowSpec;
}

/**
 * Header layar game: kembali, judul, badge Mode AI, label XP, progress ring
 * (persentase di dalam lingkaran) dan toggle cepat tema terang/gelap.
 * Di-extract dari GameScreen supaya file layar tetap ramping.
 */
export default function GameTopBar({
  colors: C,
  isDark,
  onToggleTheme,
  aiMode,
  compactBar,
  totalXp,
  currentXp,
  fillProgress,
  topInset,
  onBack,
  shadow,
}: GameTopBarProps) {
  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: C.surface,
          paddingTop: 12 + topInset,
          // Layar ponsel sempit (PLAN-034): padding & jarak diperkecil supaya
          // toolbar tidak tampak kebesaran / terdorong keluar layar.
          paddingHorizontal: compactBar ? 12 : 16,
          paddingVertical: compactBar ? 10 : 12,
          gap: compactBar ? 6 : 8,
        },
        // PLAN-037: permukaan senada latar tampak "timbul" pada tema neumorfik.
        neumorphicShadow(shadow),
      ]}
    >
      <View style={[styles.topBarLeft, { flexShrink: 1, minWidth: 0, gap: compactBar ? 8 : 10 }]}>
        <TooltipButton
          tooltip="Kembali ke menu utama"
          icon="🏠"
          style={[styles.backBtn, { backgroundColor: C.secondaryContainer }]}
          activeOpacity={0.7}
          onPress={onBack}
        >
          <Text style={[styles.backBtnText, { color: C.text }]}>‹</Text>
        </TooltipButton>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[styles.appTitle, { flexShrink: 1, color: C.primary }]}
        >
          KotaKata AI
        </Text>
      </View>
      <View style={[styles.topBarRight, { gap: compactBar ? 6 : 8 }]}>
        {aiMode && !compactBar && (
          <View
            style={[styles.aiModeBadge, { backgroundColor: C.primary + "1A", borderColor: C.primary }]}
          >
            <Text style={[styles.aiModeBadgeText, { color: C.primary }]}>🤖 Mode AI</Text>
          </View>
        )}
        <View
          style={[
            styles.xpPill,
            { backgroundColor: C.secondaryContainer, paddingHorizontal: compactBar ? 10 : 12 },
          ]}
        >
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[styles.xpPillText, { color: C.secondary }]}
          >
            ⭐ {totalXp + currentXp} XP
          </Text>
        </View>
        {/* Progress lingkaran dengan persentase di tengah — hanya tampil
            di dalam game (header layar game, di samping label XP). */}
        <ProgressRing progress={fillProgress} size={compactBar ? 30 : 34} />
        {/* Pemisah vertikal — disembunyikan di layar ponsel sempit untuk
            menghemat ruang (PLAN-034). */}
        {!compactBar && <View style={[styles.topBarDivider, { backgroundColor: C.border }]} />}
        {/* Switch cepat tema terang/gelap */}
        <TooltipButton
          tooltip={isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
          icon={isDark ? "☀️" : "🌙"}
          accessibilityLabel={isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
          style={[styles.themeToggle, { backgroundColor: C.secondaryContainer }]}
          activeOpacity={0.7}
          onPress={onToggleTheme}
        >
          <Text style={[styles.themeToggleText, { color: C.secondary }]}>
            {isDark ? "☀️" : "🌙"}
          </Text>
        </TooltipButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarLeft: { flexDirection: "row", alignItems: "center" },
  topBarRight: { flexDirection: "row", alignItems: "center" },
  aiModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  aiModeBadgeText: { fontSize: 11, fontWeight: "800", color: "#0096cc" },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  backBtnText: { fontSize: 18, fontWeight: "600", lineHeight: 32, textAlign: "center" },
  appTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 999,
    // Jangan pernah melebihi ukuran konten di layar sempit.
    flexShrink: 1,
  },
  xpPillText: { fontSize: 12, fontWeight: "700" },
  topBarDivider: { width: 1, height: 20, marginHorizontal: 2, borderRadius: 1 },
  themeToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  themeToggleText: { fontSize: 16, lineHeight: 18 },
});
