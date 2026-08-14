import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppModal from "../../presentation/components/common/AppModal";
import ThemedBackground from "../../presentation/components/common/ThemedBackground";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import type { BackgroundSpec } from "../../presentation/themes/themeData";

export type ThemeKind = "app" | "board" | "keyboard";

export interface ThemePreviewPalettes {
  /** Warna polos + objek `background` (gradien/gambar) — nilai bisa non-string. */
  light: Record<string, unknown>;
  dark: Record<string, unknown>;
}

interface ThemePreviewModalProps {
  visible: boolean;
  kind: ThemeKind;
  name: string;
  tagline: string;
  palettes: ThemePreviewPalettes;
  onClose: () => void;
}

/** Ambil palet mode aktif + aksesor warna dengan fallback (kunci hilang → warna netral). */
function paletteOf(palettes: ThemePreviewPalettes, mode: "light" | "dark") {
  const P = mode === "light" ? palettes.light : palettes.dark;
  const c = (key: string, fallback: string): string => {
    const value = P[key];
    return typeof value === "string" ? value : fallback;
  };
  return { P, c };
}

/**
 * Ambil spec latar (`background`) dari palet mode aktif — warna dasar memakai
 * warna yang dikirim pemanggil; gradien/gambar/overlay dari palet tema.
 */
function backgroundOf(
  palettes: ThemePreviewPalettes,
  mode: "light" | "dark",
  fallbackColor: string,
): BackgroundSpec {
  const P = mode === "light" ? palettes.light : palettes.dark;
  const bg = P.background;
  if (bg && typeof bg === "object") {
    return { color: fallbackColor, ...(bg as Partial<BackgroundSpec>) };
  }
  return { color: fallbackColor };
}

/* ─────────────────────────── Mockup Tema Aplikasi ─────────────────────────── */

function AppThemeMock({ palettes, mode }: { palettes: ThemePreviewPalettes; mode: "light" | "dark" }) {
  const { c } = paletteOf(palettes, mode);
  const bg = c("background", "#fef7ff");
  const surface = c("surface", "#ffffff");
  const text = c("text", "#2e1a28");
  const textSec = c("textSecondary", "#604868");
  const border = c("border", "#dcc8e0");
  const primary = c("primary", "#e040a0");
  const secondary = c("secondary", "#7c52aa");
  const secContainer = c("secondaryContainer", "#eedcff");
  const tertiary = c("tertiary", "#0096cc");

  return (
    <View style={[styles.appMock, { borderColor: border, overflow: "hidden" }]}>
      {/* Latar tema (gradien/gambar) di belakang mockup. */}
      <ThemedBackground spec={backgroundOf(palettes, mode, bg)} />
      {/* Header */}
      <View style={styles.mockHeader}>
        <Text style={[styles.mockTitle, { color: text }]}>KotaKata AI</Text>
        <View style={[styles.xpPill, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.xpPillText, { color: textSec }]}>⭐ 120 XP</Text>
        </View>
      </View>

      <Text style={[styles.appHero, { color: text }]}>Selamat datang!</Text>
      <Text style={[styles.appBody, { color: textSec }]}>
        Halaman utama dengan palet tema ini — latar, kartu, tombol, dan aksen ikut berubah.
      </Text>

      {/* Kartu menu */}
      <View style={[styles.menuCard, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.menuCardTitle, { color: text }]}>Menu Utama</Text>
        <View style={styles.btnRow}>
          <View style={[styles.btnPrimary, { backgroundColor: primary }]}>
            <Text style={styles.btnPrimaryText}>Mulai Bermain</Text>
          </View>
          <View style={[styles.btnSoft, { backgroundColor: secContainer }]}>
            <Text style={[styles.btnSoftText, { color: secondary }]}>🛍️ Pasar</Text>
          </View>
        </View>
        <View style={styles.btnRow}>
          <View style={[styles.btnSoft, { backgroundColor: tertiary + "1F" }]}>
            <Text style={[styles.btnSoftText, { color: tertiary }]}>🔍 Kata Ditemukan</Text>
          </View>
          <View style={[styles.btnOutlined, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.btnSoftText, { color: text }]}>🏁 Sejarah</Text>
          </View>
        </View>
      </View>

      {/* Swatch lengkap */}
      <View style={[styles.swatchStrip, { backgroundColor: surface, borderColor: border }]}>
        {[bg, surface, primary, secondary, tertiary, text].map((color, i) => (
          <View key={i} style={[styles.swatchChip, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────────── Mockup Tema Papan ─────────────────────────── */

function BoardThemeMock({ palettes, mode }: { palettes: ThemePreviewPalettes; mode: "light" | "dark" }) {
  const { c } = paletteOf(palettes, mode);
  const boardBg = c("boardBackground", "#ffffff");
  const boardBorder = c("boardBorder", "#dcc8e0");
  const cellActive = c("cellActive", "#ffffff");
  const cellActiveText = c("cellActiveText", "#2e1a28");
  const cellBorder = c("cellBorder", "#dcc8e0");
  const cellSelected = c("cellSelected", "#e040a0");
  const cellSelectedText = c("cellSelectedText", "#ffffff");
  const cellHighlight = c("cellHighlight", "#EDE8FF");
  const cellHighlightBorder = c("cellHighlightBorder", "#e040a0");
  const cellSolved = c("cellSolved", "#ffd6ee");
  const cellSolvedText = c("cellSolvedText", "#a02070");
  const cellBlocked = c("cellBlocked", "#2e1a28");
  const cellNumber = c("cellNumber", "#604868");
  const clueBg = c("clueBackground", "#0096cc");
  const clueText = c("clueText", "#ffffff");
  const clueBadgeBg = c("clueBadgeBackground", "#ffffff");
  const clueBadgeText = c("clueBadgeText", "#0096cc");
  const clueArrowBg = c("clueArrowBackground", "rgba(255,255,255,0.18)");
  const hintBg = c("hintBackground", "#ffffff");
  const hintBorder = c("hintBorder", "#dcc8e0");
  const hintPrimary = c("hintPrimary", "#e040a0");
  const hintPrimaryText = c("hintPrimaryText", "#ffffff");
  const hintSecondary = c("hintSecondary", "#eedcff");
  const hintIcon = c("hintIcon", "#7c52aa");
  const hintText = c("hintText", "#2e1a28");

  return (
    <View style={[styles.boardMockWrap, { overflow: "hidden" }]}>
      {/* Latar halaman game (gradien/gambar tema papan). */}
      <ThemedBackground spec={backgroundOf(palettes, mode, boardBg)} />
      {/* Grid mini */}
      <View style={[styles.gridMock, { backgroundColor: boardBg, borderColor: boardBorder }]}>
        {[
          { bg: cellSelected, border: cellSelected, text: cellSelectedText, letter: "A", num: true },
          { bg: cellActive, border: cellBorder, text: cellActiveText, letter: "K", num: false },
          { bg: cellHighlight, border: cellHighlightBorder, text: cellActiveText, letter: "U", num: false },
          { bg: cellSolved, border: cellSolvedText, text: cellSolvedText, letter: "N", num: false },
          { bg: cellBlocked, border: cellBlocked, text: "#000", letter: "", num: false },
        ].map((cell, i) => (
          <View
            key={i}
            style={[
              styles.gridCell,
              { backgroundColor: cell.bg, borderColor: cell.border, borderWidth: i === 0 ? 2 : 1 },
            ]}
          >
            {cell.num && (
              <Text style={[styles.gridCellNum, { color: cellSelectedText }]}>1</Text>
            )}
            <Text style={[styles.gridCellLetter, { color: cell.text }]}>{cell.letter}</Text>
          </View>
        ))}
      </View>

      {/* Clue pill */}
      <View style={[styles.clueMock, { backgroundColor: clueBg }]}>
        <View style={[styles.clueMockArrow, { backgroundColor: clueArrowBg }]}>
          <Text style={styles.clueMockArrowText}>◀</Text>
        </View>
        <View style={[styles.clueMockBadge, { backgroundColor: clueBadgeBg }]}>
          <Text style={[styles.clueMockBadgeText, { color: clueBadgeText }]}>1</Text>
        </View>
        <View style={styles.clueMockTextWrap}>
          <Text style={styles.clueMockLabel}>MENDATAR</Text>
          <Text style={[styles.clueMockText, { color: clueText }]}>awal mula suatu cerita</Text>
        </View>
        <View style={[styles.clueMockArrow, { backgroundColor: clueArrowBg }]}>
          <Text style={styles.clueMockArrowText}>▶</Text>
        </View>
      </View>

      {/* Panel hint */}
      <View style={[styles.hintMock, { backgroundColor: hintBg, borderColor: hintBorder }]}>
        <View style={[styles.hintMockBtn, { backgroundColor: hintPrimary }]}>
          <Text style={[styles.hintMockBtnText, { color: hintPrimaryText }]}>📖 Petunjuk</Text>
        </View>
        <View style={[styles.hintMockBtn, { backgroundColor: hintSecondary }]}>
          <Text style={[styles.hintMockBtnText, { color: hintIcon }]}>🔍</Text>
        </View>
        <View style={[styles.hintMockBtn, { backgroundColor: hintSecondary }]}>
          <Text style={[styles.hintMockBtnText, { color: hintIcon }]}>💡</Text>
        </View>
        <Text style={[styles.hintMockLabel, { color: hintText }]}>Zoom · Petunjuk · Reset</Text>
      </View>
    </View>
  );
}

/* ─────────────────────────── Mockup Tema Keyboard ─────────────────────────── */

function KeyboardThemeMock({ palettes, mode }: { palettes: ThemePreviewPalettes; mode: "light" | "dark" }) {
  const { c } = paletteOf(palettes, mode);
  const panelBg = c("panelBackground", "#ffffff");
  const panelBorder = c("panelBorder", "#dcc8e0");
  const keyBg = c("keyBackground", "#ffffff");
  const keyBorder = c("keyBorder", "#dcc8e0");
  const keyText = c("keyText", "#2e1a28");
  const specialBg = c("specialBackground", "#dcc8e0");
  const navBg = c("navBackground", "#ffffff");
  const navBorder = c("navBorder", "#2e1a28");
  const navText = c("navText", "#2e1a28");

  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "⌫"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  return (
    <View style={[styles.kbMock, { borderTopColor: panelBorder, overflow: "hidden" }]}>
      {/* Latar panel keyboard (gradien/gambar tema keyboard). */}
      <ThemedBackground spec={backgroundOf(palettes, mode, panelBg)} />
      {rows.map((row, ri) => (
        <View key={ri} style={styles.kbRow}>
          {row.map((key, ki) => {
            const isBackspace = key === "⌫";
            const isNav = ri === 2 && ki >= 7;
            return (
              <View
                key={ki}
                style={[
                  styles.kbKey,
                  {
                    backgroundColor: isBackspace ? specialBg : isNav ? navBg : keyBg,
                    borderColor: isNav ? navBorder : keyBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.kbKeyText,
                    { color: isNav ? navText : keyText, fontSize: isBackspace ? 9 : 10 },
                  ]}
                >
                  {key}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={[styles.kbNavRow, { borderTopColor: panelBorder }]}>
        <View style={[styles.kbNavKey, { backgroundColor: navBg, borderColor: navBorder }]}>
          <Text style={[styles.kbNavText, { color: navText }]}>◀</Text>
        </View>
        <View style={[styles.kbNavKey, { backgroundColor: navBg, borderColor: navBorder }]}>
          <Text style={[styles.kbNavText, { color: navText }]}>▶</Text>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────── Toggle Terang/Gelap ─────────────────────────── */

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "light" | "dark";
  onChange: (mode: "light" | "dark") => void;
}) {
  const { theme } = useTheme();
  const C = theme.colors;
  return (
    <View style={[styles.toggleWrap, { backgroundColor: C.secondaryContainer }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange("light")}
        style={[styles.toggleBtn, mode === "light" && { backgroundColor: C.surface }]}
      >
        <Text style={[styles.toggleText, { color: mode === "light" ? C.text : C.textSecondary }]}>
          ☀️ Terang
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange("dark")}
        style={[styles.toggleBtn, mode === "dark" && { backgroundColor: C.surface }]}
      >
        <Text style={[styles.toggleText, { color: mode === "dark" ? C.text : C.textSecondary }]}>
          🌙 Gelap
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─────────────────────────── Modal Utama ─────────────────────────── */

/**
 * Modal Preview tema di halaman Pasar: menampilkan mockup sesuai jenis tema
 * (aplikasi / papan / keyboard) yang diwarnai dengan palet tema yang sedang
 * di-preview, lengkap dengan toggle mode terang/gelap — jadi user tahu efeknya
 * sebelum menekan "Aktifkan".
 */
export default function ThemePreviewModal({
  visible,
  kind,
  name,
  tagline,
  palettes,
  onClose,
}: ThemePreviewModalProps) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  return (
    <AppModal visible={visible} title={`Preview · ${name}`} onClose={onClose} maxWidth={400}>
      <ModeToggle mode={mode} onChange={setMode} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.modalTagline}>{tagline}</Text>
        {kind === "app" ? (
          <AppThemeMock palettes={palettes} mode={mode} />
        ) : kind === "board" ? (
          <BoardThemeMock palettes={palettes} mode={mode} />
        ) : (
          <KeyboardThemeMock palettes={palettes} mode={mode} />
        )}
        <Text style={styles.modalNote}>
          Ini hanya pratinjau — tekan “Aktifkan” di kartu untuk menerapkan tema.
        </Text>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 10, paddingBottom: 4 },
  modalTagline: { fontSize: 12, color: "#8a6d90", textAlign: "center", lineHeight: 16 },

  /* ─── Toggle ─── */
  toggleWrap: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleText: { fontSize: 12, fontWeight: "800" },

  /* ─── Mockup Aplikasi ─── */
  appMock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  mockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mockTitle: { fontSize: 14, fontWeight: "900" },
  xpPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  xpPillText: { fontSize: 10, fontWeight: "700" },
  appHero: { fontSize: 19, fontWeight: "900", letterSpacing: -0.3 },
  appBody: { fontSize: 11, lineHeight: 16 },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  menuCardTitle: { fontSize: 12, fontWeight: "800" },
  btnRow: { flexDirection: "row", gap: 8 },
  btnPrimary: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnPrimaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  btnSoft: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnSoftText: { fontSize: 10, fontWeight: "700" },
  btnOutlined: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1 },
  swatchStrip: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  swatchChip: { flex: 1, height: 22, borderRadius: 6 },

  /* ─── Mockup Papan ─── */
  boardMockWrap: { gap: 8 },
  gridMock: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  gridCell: {
    width: 42,
    height: 42,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  gridCellNum: { position: "absolute", top: 2, left: 4, fontSize: 8, fontWeight: "700" },
  gridCellLetter: { fontSize: 17, fontWeight: "800" },
  clueMock: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  clueMockArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  clueMockArrowText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  clueMockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  clueMockBadgeText: { fontSize: 11, fontWeight: "800" },
  clueMockTextWrap: { flex: 1, gap: 1 },
  clueMockLabel: { fontSize: 8, color: "rgba(255,255,255,0.8)", fontWeight: "700" },
  clueMockText: { fontSize: 12, fontWeight: "700" },
  hintMock: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  hintMockBtn: {
    minWidth: 44,
    height: 32,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  hintMockBtnText: { fontSize: 10, fontWeight: "800" },
  hintMockLabel: { marginLeft: "auto", fontSize: 9, fontWeight: "700" },

  /* ─── Mockup Keyboard ─── */
  kbMock: {
    borderTopWidth: 2,
    borderRadius: 12,
    padding: 8,
    gap: 5,
  },
  kbRow: { flexDirection: "row", gap: 3 },
  kbKey: {
    flex: 1,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  kbKeyText: { fontWeight: "700" },
  kbNavRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 5,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  kbNavKey: {
    width: 42,
    height: 26,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  kbNavText: { fontSize: 10, fontWeight: "800" },

  modalNote: { fontSize: 11, lineHeight: 16, color: "#8a6d90", textAlign: "center" },
});
