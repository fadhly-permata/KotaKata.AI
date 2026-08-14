/**
 * Katalog tema yang dijual di halaman Pasar (Store).
 *
 * Saat ini baru ada 1 tema bawaan ("Puitis") yang mendukung mode terang &
 * gelap dan dipilih sebagai default. Struktur ini sengaja dibuat berbasis
 * daftar (`THEME_PRODUCTS`) supaya ke depan tema baru cukup ditambahkan satu
 * entri + satu pasangan palet di ThemeProvider — tema-tema inilah yang nanti
 * menjadi konten berbayar (mata pencaharian sampingan).
 */
export type ThemeProductId = "puitis";

export interface ThemeProduct {
  id: ThemeProductId;
  name: string;
  tagline: string;
  description: string;
  /** Tema bawaan yang sudah aktif sejak awal (tidak perlu dibeli/dipilih). */
  isDefault: boolean;
  /** Label harga/status — mis. "Gratis" / "Rp 10.000" saat tema berbayar hadir. */
  priceLabel: string;
  /** Warna swatch untuk preview mode terang & gelap (dari palet ThemeProvider). */
  swatches: { light: string[]; dark: string[] };
}

export const THEME_PRODUCTS: ThemeProduct[] = [
  {
    id: "puitis",
    name: "Puitis",
    tagline: "Merah muda & ungu — identitas KotaKata",
    description:
      "Tema bawaan KotaKata AI: latar pink-putih lembut di mode terang dan plum gelap di mode gelap, dengan aksen ungu & biru langit. Konsisten di semua halaman.",
    isDefault: true,
    priceLabel: "Gratis · Tema Aktif",
    swatches: {
      light: ["#fef7ff", "#e040a0", "#7c52aa", "#0096cc", "#ffd6ee"],
      dark: ["#1a1020", "#f0a0cc", "#c8a8e8", "#80d0f0", "#47203f"],
    },
  },
];
