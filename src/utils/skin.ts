import type { ViewStyle } from "react-native";
import type { Theme } from "../presentation/components/providers/ThemeProvider";
import { neumorphicShadow, type NeumorphicState } from "./neumorphic";

/**
 * Helper SKIN (PLAN-038) — cara TERPUSAT komponen mengambil gaya permukaan
 * dari token tema (warna + radius + shadow), supaya efek tema (mis. bayangan
 * neumorphic) merata ke SEMUA komponen & semua halaman, dan tema baru cukup
 * mendefinisikan token tanpa mengubah komponen satu per satu.
 *
 * Semua helper aman untuk tema apa pun: token yang tidak diisi punya fallback
 * (lihat komentar per fungsi). Tema yang tidak membawa `shadow` → tanpa
 * bayangan (perilaku lama).
 */

/** Radius dasar permukaan dari token tema (fallback 14). */
export function themeRadius(theme: Theme): number {
  return theme.radius ?? 14;
}

/** Tone permukaan: raised (timbul) / inset (tertekan) / flat (datar). */
export type SkinTone = "raised" | "inset" | "flat";

/**
 * Gaya permukaan generik (kartu/panel/list item): warna `surface` + radius
 * tema + bayangan tema (jika ada).
 * - tone `raised` → bayangan timbul (default saat tema punya shadow).
 * - tone `inset` → bayangan tertekan (mis. input di tema neumorphic).
 * - tone `flat` → tanpa bayangan (hanya warna + radius).
 */
export function surfaceStyle(theme: Theme, tone: SkinTone = "raised", radius?: number): ViewStyle {
  const style: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: radius ?? themeRadius(theme),
  };
  if (theme.shadow && tone !== "flat") {
    Object.assign(style, neumorphicShadow(theme.shadow, tone === "inset" ? "pressed" : "raised"));
  }
  return style;
}

/** Gaya chip/badge kecil (fallback secondaryContainer/secondary). */
export function chipStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.chipBackground ?? theme.colors.secondaryContainer,
    borderRadius: 999,
  };
}

/** Warna teks chip/badge (fallback secondary). */
export function chipTextColor(theme: Theme): string {
  return theme.colors.chipText ?? theme.colors.secondary;
}

/** Gaya input/field (fallback surface/border). */
export function inputStyle(theme: Theme, radius?: number): ViewStyle {
  const C = theme.colors;
  return {
    backgroundColor: C.inputBackground ?? C.surface,
    borderColor: C.inputBorder ?? C.border,
    borderRadius: radius ?? Math.round(themeRadius(theme) * 0.8),
  };
}

/** Warna overlay modal/dialog (fallback hitam semi-transparan). */
export function overlayColor(theme: Theme): string {
  return theme.colors.overlay ?? "rgba(0,0,0,0.45)";
}

/** Teks di atas warna primary (fallback putih). */
export function textOnPrimary(theme: Theme): string {
  return theme.colors.textOnPrimary ?? "#FFFFFF";
}

/**
 * Pilih warna teks yang kontras untuk latar warna ARBITRER (PLAN-038):
 * hitung relative luminance (WCAG) dari hex, lalu kembalikan putih atau
 * gelap. Dipakai kartu berwarna yang mengikuti token tema (mis. kartu bento
 * Main Menu) supaya teks tetap terbaca di tema mana pun, terang atau gelap.
 */
export function contrastText(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return "#FFFFFF";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return l > 0.35 ? "#111827" : "#FFFFFF";
}

/** Re-export tipe state shadow biar pemakai skin tidak perlu import 2x. */
export type { NeumorphicState };
