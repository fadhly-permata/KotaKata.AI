import type { Theme } from "../components/providers/ThemeProvider";

/**
 * Registry tema — sumber palet RUNTIME (offline-first, tanpa menunggu
 * jaringan). Katalog yang sama juga tersimpan di database Supabase
 * (tabel `themes`, lihat supabase/migrations/themes.sql + scripts/db/
 * gen-themes-sql.ts) untuk halaman Pasar; registry ini adalah salinan
 * lokal yang menjamin aplikasi selalu punya palet untuk di-render.
 *
 * Tiga jenis tema:
 *  - app      → palet GLOBAL (semua halaman) — light & dark penuh.
 *  - board    → desain halaman GAME saja: papan, soal (clue pill) & panel hint.
 *  - keyboard → desain InGameKeyboard.
 *
 * KESERAGAMAN TEMA: setiap tema aplikasi (puitis/samudra/senja/hutan) punya
 * versi papan & keyboard dengan NAMA SAMA (paletnya diturunkan dari palet
 * aplikasi) supaya ganti tema tetap senada. Tema papan/keyboard tambahan
 * (tinta, neon, pastel, klasik) tetap ada sebagai gaya alternatif.
 *
 * Tema aplikasi juga membawa `sound` (SoundSpec): gaya audio (rate + volume)
 * yang dipakai sound.ts ke semua efek suara game — tanpa aset audio baru.
 *
 * Tiap palet juga bisa membawa `background` (BackgroundSpec): gradien warna
 * dan/atau URL gambar latar + overlay — dirender oleh komponen
 * `ThemedBackground` (lihat src/presentation/components/common/).
 *
 * ⚠️ Jaga konsistensi dengan `supabase/data/themes.sql` (dibuat otomatis via
 * `bun scripts/db/gen-themes-sql.mjs`).
 */

/* ─────────────────────────── Latar (Background) Tema ─────────────────────────── */

export type BackgroundDirection = "vertical" | "horizontal" | "diagonal-tl" | "diagonal-tr";

/**
 * Latar halaman/panel yang bisa di-custom per tema:
 * - `color`    → warna solid dasar (selalu dipakai, sekaligus fallback).
 * - `gradient` → daftar warna gradien (≥2) — dirender ThemedBackground dengan
 *                lapisan View berwarna bertumpuk (tanpa react-native-svg).
 * - `imageUrl` → URL gambar latar (opsional; butuh jaringan — gradient/color
 *                tetap tampil sebagai fallback saat offline / belum dimuat).
 * - `overlay`  → warna semi-transparan di atas gambar/gradien untuk kontras teks.
 * - `direction`→ arah gradien. Default: "vertical" (atas → bawah).
 */
export interface BackgroundSpec {
  /** Warna solid dasar (fallback). Opsional — resolver (ThemeProvider) yang
   *  mengisinya dari warna latar palet; kalau kosong, dasar jadi transparan. */
  color?: string;
  gradient?: string[];
  direction?: BackgroundDirection;
  imageUrl?: string;
  overlay?: string;
}

/* ─────────────────────────── Bayangan Neumorphic (PLAN-037) ─────────────────────────── */

/**
 * Spec bayangan "timbul" (neumorphism.io): elemen permukaan memakai warna
 * SAMA dengan latar, lalu dibedakan lewat DUA bayangan — terang di kiri-atas
 * dan gelap di kanan-bawah. Dipakai elemen kunci (kartu/panel/tombol) saat
 * tema aplikasi membawa `shadow` (hanya tema neumorphic yang punya).
 * - `light` → warna bayangan terang (kiri-atas), mis. putih semi-transparan.
 * - `dark`  → warna bayangan gelap (kanan-bawah), mis. abu pekat semi-transparan.
 * - `offset`/`blur` → ukuran bayangan normal (default 9 / 16 — nilai klasik
 *   neumorphism.io). `insetOffset`/`insetBlur` untuk state "tertekan".
 */
export interface NeumorphicShadowSpec {
  light: string;
  dark: string;
  offset?: number;
  blur?: number;
  insetOffset?: number;
  insetBlur?: number;
}

/* ─────────────────────────── Suara (Tema Audio) ─────────────────────────── */

/**
 * Kepribadian AUDIO sebuah tema aplikasi — diterapkan oleh sound.ts ke semua
 * efek suara game (tanpa aset audio baru):
 * - `rate`   → kecepatan playback (1.0 = normal; <1 lebih pelan/lembut,
 *              >1 lebih cepat/ceria).
 * - `volume` → volume relatif (0–1).
 */
export interface SoundSpec {
  label: string;
  rate: number;
  volume: number;
}

/**
 * BACKSOUND (suara latar) tema aplikasi — diputar loop pelan oleh sound.ts
 * selama tema ini aktif (URL audio online, MP3 agar kompatibel iOS + web):
 * - `url`    → URL langsung file MP3 (mis. aset suara alam dari Mixkit CDN).
 * - `volume` → volume backsound relatif (0–1; default 0.3 — tetap pelan agar
 *              tidak menenggelamkan efek suara game).
 * - `label`  → nama suara, ditampilkan di kartu tema (halaman Pasar).
 * Disesuaikan: ganti `url` di registry lalu regenerate seed SQL
 * (bun scripts/db/gen-themes-sql.mjs) supaya katalog cloud ikut ter-update.
 */
export interface AmbientSoundSpec {
  label: string;
  url: string;
  volume?: number;
}

/* ─────────────────────────── Tema Aplikasi (Global) ─────────────────────────── */

export interface AppThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  /** Gaya suara tema (rate + volume) — dipakai sound.ts. */
  sound: SoundSpec;
  /** Backsound latar tema (loop, URL audio online) — opsional; dipakai sound.ts. */
  ambient?: AmbientSoundSpec;
  light: Theme;
  dark: Theme;
}

const puitis: AppThemeDefinition = {
  id: "puitis",
  name: "Puitis",
  tagline: "Merah muda & ungu — identitas KotaKata",
  description:
    "Tema bawaan KotaKata AI: latar pink-putih lembut di mode terang dan plum gelap di mode gelap, dengan aksen ungu & biru langit.",
  isDefault: true,
  priceLabel: "Gratis · Tema Aktif",
  sound: { label: "Klasik", rate: 1, volume: 1 },
  ambient: {
    label: "Rintik hujan lembut",
    url: "https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: { gradient: ["#fef7ff", "#f7eaff", "#eef3ff"] },
    colors: {
      background: "#fef7ff",
      surface: "#ffffff",
      text: "#2e1a28",
      textSecondary: "#604868",
      border: "#dcc8e0",
      primary: "#e040a0",
      secondary: "#7c52aa",
      secondaryContainer: "#eedcff",
      tertiary: "#0096cc",
      tertiaryContainer: "#40c0ee",
      accent: "#e040a0",
      gold: "#FDCB6E",
      success: "#00B894",
      error: "#e53e3e",
      cellActive: "#ffffff",
      cellBorder: "#dcc8e0",
      cellText: "#2e1a28",
      cellBlocked: "#2e1a28",
      cellLocked: "#dcc8e0",
      cellSolved: "#ffd6ee",
      cellSolvedText: "#a02070",
    },
  },
  dark: {
    mode: "dark",
    background: { gradient: ["#1a1020", "#231326", "#161c2c"] },
    colors: {
      background: "#1a1020",
      surface: "#2a1a30",
      text: "#fef7ff",
      textSecondary: "#b8a0b8",
      border: "#4a3850",
      primary: "#f0a0cc",
      secondary: "#c8a8e8",
      secondaryContainer: "#3a2850",
      tertiary: "#80d0f0",
      tertiaryContainer: "#004466",
      accent: "#f0a0cc",
      gold: "#F9CA24",
      success: "#55EFC4",
      error: "#ff6b6b",
      cellActive: "#2a1a30",
      cellBorder: "#4a3850",
      cellText: "#fef7ff",
      cellBlocked: "#1a1020",
      cellLocked: "#4a3850",
      cellSolved: "#47203f",
      cellSolvedText: "#f0a0cc",
    },
  },
};

const samudra: AppThemeDefinition = {
  id: "samudra",
  name: "Samudra",
  tagline: "Biru laut & teal yang menenangkan",
  description:
    "Palet samudra: biru dalam & teal segar dengan aksen koral. Terasa teduh di mode terang dan seperti menyelam di malam hari saat mode gelap.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Tenang", rate: 0.88, volume: 0.8 },
  ambient: {
    label: "Ombak laut",
    url: "https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3",
    volume: 0.35,
  },
  light: {
    mode: "light",
    background: {
      gradient: ["#eef7fb", "#e2f2f7", "#e8f6f1"],
      imageUrl: "https://picsum.photos/seed/kotakata-samudra/1080/1920",
      overlay: "rgba(238,247,251,0.78)",
    },
    colors: {
      background: "#eef7fb",
      surface: "#ffffff",
      text: "#0e2a3a",
      textSecondary: "#4a6b7a",
      border: "#c3dbe6",
      primary: "#0087b8",
      secondary: "#0f8a8a",
      secondaryContainer: "#d8f2f2",
      tertiary: "#ff8a5c",
      tertiaryContainer: "#ffd9c8",
      accent: "#0087b8",
      gold: "#F5B942",
      success: "#0aa87e",
      error: "#d64545",
      cellActive: "#ffffff",
      cellBorder: "#c3dbe6",
      cellText: "#0e2a3a",
      cellBlocked: "#0e2a3a",
      cellLocked: "#c3dbe6",
      cellSolved: "#cdeef7",
      cellSolvedText: "#00607f",
    },
  },
  dark: {
    mode: "dark",
    background: {
      gradient: ["#061a24", "#0a2233", "#062430"],
      imageUrl: "https://picsum.photos/seed/kotakata-samudra/1080/1920",
      overlay: "rgba(6,26,36,0.82)",
    },
    colors: {
      background: "#061a24",
      surface: "#0d2a38",
      text: "#eef7fb",
      textSecondary: "#8fb4c4",
      border: "#1f4454",
      primary: "#4fc3e8",
      secondary: "#5fd0d0",
      secondaryContainer: "#123a42",
      tertiary: "#ffa07a",
      tertiaryContainer: "#5a2a18",
      accent: "#4fc3e8",
      gold: "#F9CA24",
      success: "#55EFC4",
      error: "#ff7a7a",
      cellActive: "#0d2a38",
      cellBorder: "#1f4454",
      cellText: "#eef7fb",
      cellBlocked: "#061a24",
      cellLocked: "#1f4454",
      cellSolved: "#0e3d4f",
      cellSolvedText: "#4fc3e8",
    },
  },
};

const senja: AppThemeDefinition = {
  id: "senja",
  name: "Senja",
  tagline: "Oranye hangat & ungu senja",
  description:
    "Nuansa senja: oranye hangat, ungu dusk, dan mawar lembut. Cocok untuk bermain santai di sore hari.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Hangat", rate: 0.95, volume: 0.95 },
  ambient: {
    label: "Jangkrik malam",
    url: "https://assets.mixkit.co/active_storage/sfx/1789/1789-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: {
      gradient: ["#fdf3ec", "#fbe8dc", "#f6e6f3"],
      imageUrl: "https://picsum.photos/seed/kotakata-senja/1080/1920",
      overlay: "rgba(253,243,236,0.8)",
    },
    colors: {
      background: "#fdf3ec",
      surface: "#ffffff",
      text: "#3a241a",
      textSecondary: "#7a5c4a",
      border: "#ecd4c4",
      primary: "#d96c3f",
      secondary: "#8a5a9e",
      secondaryContainer: "#f3e3f7",
      tertiary: "#c94f6d",
      tertiaryContainer: "#ffd9e2",
      accent: "#d96c3f",
      gold: "#E8A33D",
      success: "#2e9e6b",
      error: "#d64545",
      cellActive: "#ffffff",
      cellBorder: "#ecd4c4",
      cellText: "#3a241a",
      cellBlocked: "#3a241a",
      cellLocked: "#ecd4c4",
      cellSolved: "#ffe0d1",
      cellSolvedText: "#b0502a",
    },
  },
  dark: {
    mode: "dark",
    background: {
      gradient: ["#241420", "#331a2a", "#2b1b33"],
      imageUrl: "https://picsum.photos/seed/kotakata-senja/1080/1920",
      overlay: "rgba(36,20,32,0.84)",
    },
    colors: {
      background: "#241420",
      surface: "#35202e",
      text: "#fdf3ec",
      textSecondary: "#c2a492",
      border: "#57394a",
      primary: "#ff9c6b",
      secondary: "#c9a0dd",
      secondaryContainer: "#46284f",
      tertiary: "#ff8aa5",
      tertiaryContainer: "#6e2838",
      accent: "#ff9c6b",
      gold: "#F9CA24",
      success: "#55EFC4",
      error: "#ff7a7a",
      cellActive: "#35202e",
      cellBorder: "#57394a",
      cellText: "#fdf3ec",
      cellBlocked: "#241420",
      cellLocked: "#57394a",
      cellSolved: "#5a2e3a",
      cellSolvedText: "#ff9c6b",
    },
  },
};

const hutan: AppThemeDefinition = {
  id: "hutan",
  name: "Hutan",
  tagline: "Hijau rimba & zaitun yang segar",
  description:
    "Palet hutan: hijau rimba yang teduh, zaitun hangat, dan langit biru sebagai aksen. Tenang dan natural di kedua mode.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Segar", rate: 1.08, volume: 0.9 },
  ambient: {
    label: "Hujan di hutan",
    url: "https://assets.mixkit.co/active_storage/sfx/1225/1225-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: { gradient: ["#f0f7ee", "#e5f2e1", "#ecf5f0"] },
    colors: {
      background: "#f0f7ee",
      surface: "#ffffff",
      text: "#1d3322",
      textSecondary: "#55705c",
      border: "#c9ddc5",
      primary: "#2f8f4e",
      secondary: "#6a7f3f",
      secondaryContainer: "#e6f2dc",
      tertiary: "#4a7fc0",
      tertiaryContainer: "#dcebfa",
      accent: "#2f8f4e",
      gold: "#D9A43B",
      success: "#2e9e6b",
      error: "#d64545",
      cellActive: "#ffffff",
      cellBorder: "#c9ddc5",
      cellText: "#1d3322",
      cellBlocked: "#1d3322",
      cellLocked: "#c9ddc5",
      cellSolved: "#d8efd4",
      cellSolvedText: "#1f6b3a",
    },
  },
  dark: {
    mode: "dark",
    background: { gradient: ["#0d1f12", "#12291b", "#0f2026"] },
    colors: {
      background: "#0d1f12",
      surface: "#152b1c",
      text: "#f0f7ee",
      textSecondary: "#92af99",
      border: "#2c4a37",
      primary: "#5fbe7f",
      secondary: "#a3bd6e",
      secondaryContainer: "#243a28",
      tertiary: "#8ab8e8",
      tertiaryContainer: "#17304a",
      accent: "#5fbe7f",
      gold: "#F9CA24",
      success: "#55EFC4",
      error: "#ff7a7a",
      cellActive: "#152b1c",
      cellBorder: "#2c4a37",
      cellText: "#f0f7ee",
      cellBlocked: "#0d1f12",
      cellLocked: "#2c4a37",
      cellSolved: "#1e3d2b",
      cellSolvedText: "#5fbe7f",
    },
  },
};

const neumorfik: AppThemeDefinition = {
  id: "neumorfik",
  name: "Neumorfik",
  tagline: "Soft UI lembut — permukaan senada & bayangan timbul",
  description:
    "Tema neumorphism (gaya neumorphism.io): latar abu lembut, permukaan memakai warna SAMA dengan latar sehingga elemen tampak timbul lewat bayangan terang-gelap, aksen biru. Minimalis, bersih, nyaman dipakai lama.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Lembut", rate: 0.85, volume: 0.75 },
  ambient: {
    label: "Kicau burung pagi",
    url: "https://assets.mixkit.co/active_storage/sfx/2472/2472-preview.mp3",
    volume: 0.28,
  },
  light: {
    mode: "light",
    // Gaya neumorphism.io klasik: latar abu #e0e5ec, surface = SAMA dengan
    // latar, bayangan terang kiri-atas + gelap kanan-bawah (nilai klasiknya).
    background: { gradient: ["#e6eaf0", "#dde2ea"] },
    shadow: {
      light: "rgba(255,255,255,0.65)",
      dark: "rgba(163,177,198,0.6)",
      offset: 9,
      blur: 16,
      insetOffset: 3,
      insetBlur: 6,
    },
    colors: {
      background: "#e0e5ec",
      surface: "#e0e5ec",
      text: "#5b6779",
      textSecondary: "#8b94a5",
      border: "#d2d9e2",
      primary: "#3d5afe",
      secondary: "#5b6b8c",
      secondaryContainer: "#d2d9e2",
      tertiary: "#5273b8",
      tertiaryContainer: "#d5ddec",
      accent: "#3d5afe",
      gold: "#e0b45a",
      success: "#4fae7f",
      error: "#d9706a",
      cellActive: "#e6ebf2",
      cellBorder: "#d0d7e0",
      cellText: "#5b6779",
      cellBlocked: "#b8c1cf",
      cellLocked: "#d0d7e0",
      cellSolved: "#c9dcff",
      cellSolvedText: "#2f5be8",
    },
  },
  dark: {
    mode: "dark",
    // Dark neumorphism: abu gelap senada, surface = latar, bayangan terang
    // sangat halus di kiri-atas + gelap pekat di kanan-bawah.
    background: { gradient: ["#232930", "#1c2126"] },
    shadow: {
      light: "rgba(255,255,255,0.05)",
      dark: "rgba(0,0,0,0.6)",
      offset: 9,
      blur: 16,
      insetOffset: 3,
      insetBlur: 6,
    },
    colors: {
      background: "#1f2429",
      surface: "#1f2429",
      text: "#d8dee9",
      textSecondary: "#8f98a8",
      border: "#2a3037",
      primary: "#7d9bff",
      secondary: "#9aa7c0",
      secondaryContainer: "#2a3037",
      tertiary: "#6fc1b0",
      tertiaryContainer: "#22333a",
      accent: "#7d9bff",
      gold: "#e0b45a",
      success: "#5fbf92",
      error: "#e0807a",
      cellActive: "#232930",
      cellBorder: "#2a3037",
      cellText: "#d8dee9",
      cellBlocked: "#161a1f",
      cellLocked: "#2a3037",
      cellSolved: "#2b3a63",
      cellSolvedText: "#9db8ff",
    },
  },
};

export const APP_THEMES: AppThemeDefinition[] = [puitis, samudra, senja, hutan, neumorfik];

/* ─────────────────────────── Tema Papan (Halaman Game) ─────────────────────────── */

export interface BoardColors {
  /** Latar & border wadah grid. */
  boardBackground: string;
  boardBorder: string;
  /** Sel kosong / biasa. */
  cellActive: string;
  cellActiveText: string;
  cellBorder: string;
  /** Sel terpilih (kursor). */
  cellSelected: string;
  cellSelectedText: string;
  /** Sel dalam kata yang sedang disorot (bukan terpilih). */
  cellHighlight: string;
  cellHighlightBorder: string;
  /** Sel sudah terjawab benar. */
  cellSolved: string;
  cellSolvedText: string;
  /** Sel hitam (blocked). */
  cellBlocked: string;
  /** Nomor clue di pojok sel. */
  cellNumber: string;
  /** Soal (clue pill). */
  clueBackground: string;
  clueText: string;
  clueTextMuted: string;
  clueBadgeBackground: string;
  clueBadgeText: string;
  clueArrowBackground: string;
  clueDivider: string;
  /** Latar HALAMAN GAME (di balik papan & panel bawah) — gradien/gambar opsional. */
  background?: BackgroundSpec;
  /** Panel hint (action bar). */
  hintBackground: string;
  hintBorder: string;
  hintPrimary: string;
  hintPrimaryText: string;
  hintSecondary: string;
  hintIcon: string;
  hintText: string;
  hintTextSecondary: string;
  hintBadgeBackground: string;
  hintBadgeText: string;
}

export interface BoardThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  light: BoardColors;
  dark: BoardColors;
}

const papanPuitis: BoardThemeDefinition = {
  id: "puitis",
  name: "Puitis",
  tagline: "Tampilan papan klasik KotaKata",
  description:
    "Papan default: sel pink muda saat terjawab, aksen ungu & biru langit di soal dan panel petunjuk. Konsisten dengan tema aplikasi.",
  isDefault: true,
  priceLabel: "Gratis · Tema Aktif",
  light: {
    boardBackground: "#ffffff",
    background: { gradient: ["#f9f0fc", "#f4eafa"] },
    boardBorder: "#dcc8e0",
    cellActive: "#ffffff",
    cellActiveText: "#2e1a28",
    cellBorder: "#dcc8e0",
    cellSelected: "#e040a0",
    cellSelectedText: "#ffffff",
    cellHighlight: "#EDE8FF",
    cellHighlightBorder: "#e040a0",
    cellSolved: "#ffd6ee",
    cellSolvedText: "#a02070",
    cellBlocked: "#2e1a28",
    cellNumber: "#604868",
    clueBackground: "#0096cc",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#0096cc",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#ffffff",
    hintBorder: "#dcc8e0",
    hintPrimary: "#e040a0",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#eedcff",
    hintIcon: "#7c52aa",
    hintText: "#2e1a28",
    hintTextSecondary: "#604868",
    hintBadgeBackground: "#dcc8e0",
    hintBadgeText: "#7c52aa",
  },
  dark: {
    boardBackground: "#2a1a30",
    background: { gradient: ["#241430", "#1a1020"] },
    boardBorder: "#4a3850",
    cellActive: "#2a1a30",
    cellActiveText: "#fef7ff",
    cellBorder: "#4a3850",
    cellSelected: "#f0a0cc",
    cellSelectedText: "#2a1a30",
    cellHighlight: "#2A2938",
    cellHighlightBorder: "#f0a0cc",
    cellSolved: "#47203f",
    cellSolvedText: "#f0a0cc",
    cellBlocked: "#1a1020",
    cellNumber: "#b8a0b8",
    clueBackground: "#0096cc",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#0096cc",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#2a1a30",
    hintBorder: "#4a3850",
    hintPrimary: "#f0a0cc",
    hintPrimaryText: "#2a1a30",
    hintSecondary: "#3a2850",
    hintIcon: "#c8a8e8",
    hintText: "#fef7ff",
    hintTextSecondary: "#b8a0b8",
    hintBadgeBackground: "#4a3850",
    hintBadgeText: "#c8a8e8",
  },
};

const papanTinta: BoardThemeDefinition = {
  id: "tinta",
  name: "Tinta",
  tagline: "Crossword klasik koran: hitam putih & merah",
  description:
    "Suasana teka-teki silang koran sungguhan: kertas krem, sel hitam pekat, dan aksen merah untuk kata yang terjawab.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#faf7f0",
    background: { gradient: ["#faf7f0", "#f1ede2"] },
    boardBorder: "#b8b2a6",
    cellActive: "#ffffff",
    cellActiveText: "#1c1c1c",
    cellBorder: "#a8a29a",
    cellSelected: "#1c1c1c",
    cellSelectedText: "#ffffff",
    cellHighlight: "#e8e4da",
    cellHighlightBorder: "#1c1c1c",
    cellSolved: "#c0392b",
    cellSolvedText: "#ffffff",
    cellBlocked: "#1c1c1c",
    cellNumber: "#88827a",
    clueBackground: "#1c1c1c",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.75)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#1c1c1c",
    clueArrowBackground: "rgba(255,255,255,0.2)",
    clueDivider: "rgba(255,255,255,0.3)",
    hintBackground: "#ffffff",
    hintBorder: "#b8b2a6",
    hintPrimary: "#1c1c1c",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#efeae0",
    hintIcon: "#5a554d",
    hintText: "#1c1c1c",
    hintTextSecondary: "#6b655c",
    hintBadgeBackground: "#d8d2c6",
    hintBadgeText: "#1c1c1c",
  },
  dark: {
    boardBackground: "#17171a",
    background: { gradient: ["#17171a", "#101013"] },
    boardBorder: "#3c3c42",
    cellActive: "#202024",
    cellActiveText: "#f2f2f2",
    cellBorder: "#3c3c42",
    cellSelected: "#f2f2f2",
    cellSelectedText: "#17171a",
    cellHighlight: "#2a2a30",
    cellHighlightBorder: "#f2f2f2",
    cellSolved: "#e04a3a",
    cellSolvedText: "#ffffff",
    cellBlocked: "#101013",
    cellNumber: "#9a9aa2",
    clueBackground: "#101013",
    clueText: "#f2f2f2",
    clueTextMuted: "rgba(255,255,255,0.75)",
    clueBadgeBackground: "#f2f2f2",
    clueBadgeText: "#101013",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.3)",
    hintBackground: "#202024",
    hintBorder: "#3c3c42",
    hintPrimary: "#f2f2f2",
    hintPrimaryText: "#17171a",
    hintSecondary: "#2a2a30",
    hintIcon: "#b9b9c2",
    hintText: "#f2f2f2",
    hintTextSecondary: "#9a9aa2",
    hintBadgeBackground: "#3c3c42",
    hintBadgeText: "#f2f2f2",
  },
};

const papanNeon: BoardThemeDefinition = {
  id: "neon",
  name: "Neon",
  tagline: "Grid gelap dengan neon cyan & magenta",
  description:
    "Papan futuristik: latar biru malam, sel aktif neon cyan, kata terjawab magenta. Soal & panel petunjuk ikut bergaya neon.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#101626",
    background: { gradient: ["#101626", "#0a0f1c"] },
    boardBorder: "#2a3a5e",
    cellActive: "#16203a",
    cellActiveText: "#e8f0ff",
    cellBorder: "#2a3a5e",
    cellSelected: "#00e5ff",
    cellSelectedText: "#00122a",
    cellHighlight: "#1c2c52",
    cellHighlightBorder: "#00e5ff",
    cellSolved: "#ff2fd6",
    cellSolvedText: "#ffffff",
    cellBlocked: "#0a0f1c",
    cellNumber: "#6f8ac0",
    clueBackground: "#0f1b33",
    clueText: "#d6f6ff",
    clueTextMuted: "rgba(214,246,255,0.75)",
    clueBadgeBackground: "#00e5ff",
    clueBadgeText: "#00122a",
    clueArrowBackground: "rgba(0,229,255,0.16)",
    clueDivider: "rgba(0,229,255,0.35)",
    hintBackground: "#101626",
    hintBorder: "#2a3a5e",
    hintPrimary: "#00e5ff",
    hintPrimaryText: "#00122a",
    hintSecondary: "#1c2c52",
    hintIcon: "#7ceaff",
    hintText: "#e8f0ff",
    hintTextSecondary: "#8fa8d8",
    hintBadgeBackground: "#2a3a5e",
    hintBadgeText: "#00e5ff",
  },
  dark: {
    boardBackground: "#101626",
    background: { gradient: ["#101626", "#0a0f1c"] },
    boardBorder: "#2a3a5e",
    cellActive: "#16203a",
    cellActiveText: "#e8f0ff",
    cellBorder: "#2a3a5e",
    cellSelected: "#00e5ff",
    cellSelectedText: "#00122a",
    cellHighlight: "#1c2c52",
    cellHighlightBorder: "#00e5ff",
    cellSolved: "#ff2fd6",
    cellSolvedText: "#ffffff",
    cellBlocked: "#0a0f1c",
    cellNumber: "#6f8ac0",
    clueBackground: "#0f1b33",
    clueText: "#d6f6ff",
    clueTextMuted: "rgba(214,246,255,0.75)",
    clueBadgeBackground: "#00e5ff",
    clueBadgeText: "#00122a",
    clueArrowBackground: "rgba(0,229,255,0.16)",
    clueDivider: "rgba(0,229,255,0.35)",
    hintBackground: "#101626",
    hintBorder: "#2a3a5e",
    hintPrimary: "#00e5ff",
    hintPrimaryText: "#00122a",
    hintSecondary: "#1c2c52",
    hintIcon: "#7ceaff",
    hintText: "#e8f0ff",
    hintTextSecondary: "#8fa8d8",
    hintBadgeBackground: "#2a3a5e",
    hintBadgeText: "#00e5ff",
  },
};

const papanSamudra: BoardThemeDefinition = {
  id: "samudra",
  name: "Samudra",
  tagline: "Papan biru laut & teal yang menenangkan",
  description:
    "Papan senada tema aplikasi Samudra: sel aktif biru laut, kata terjawab biru muda, soal & panel petunjuk teal segar.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#ffffff",
    background: { gradient: ["#eef7fb", "#e2f2f7"] },
    boardBorder: "#c3dbe6",
    cellActive: "#ffffff",
    cellActiveText: "#0e2a3a",
    cellBorder: "#c3dbe6",
    cellSelected: "#0087b8",
    cellSelectedText: "#ffffff",
    cellHighlight: "#d8f2f2",
    cellHighlightBorder: "#0087b8",
    cellSolved: "#cdeef7",
    cellSolvedText: "#00607f",
    cellBlocked: "#0e2a3a",
    cellNumber: "#4a6b7a",
    clueBackground: "#0f8a8a",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#0f8a8a",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#ffffff",
    hintBorder: "#c3dbe6",
    hintPrimary: "#0087b8",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#d8f2f2",
    hintIcon: "#0f8a8a",
    hintText: "#0e2a3a",
    hintTextSecondary: "#4a6b7a",
    hintBadgeBackground: "#c3dbe6",
    hintBadgeText: "#0e2a3a",
  },
  dark: {
    boardBackground: "#0d2a38",
    background: { gradient: ["#0d2a38", "#061a24"] },
    boardBorder: "#1f4454",
    cellActive: "#0d2a38",
    cellActiveText: "#eef7fb",
    cellBorder: "#1f4454",
    cellSelected: "#4fc3e8",
    cellSelectedText: "#061a24",
    cellHighlight: "#123a42",
    cellHighlightBorder: "#4fc3e8",
    cellSolved: "#0e3d4f",
    cellSolvedText: "#4fc3e8",
    cellBlocked: "#061a24",
    cellNumber: "#8fb4c4",
    clueBackground: "#0f8a8a",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#0f8a8a",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#0d2a38",
    hintBorder: "#1f4454",
    hintPrimary: "#4fc3e8",
    hintPrimaryText: "#061a24",
    hintSecondary: "#123a42",
    hintIcon: "#5fd0d0",
    hintText: "#eef7fb",
    hintTextSecondary: "#8fb4c4",
    hintBadgeBackground: "#1f4454",
    hintBadgeText: "#4fc3e8",
  },
};

const papanSenja: BoardThemeDefinition = {
  id: "senja",
  name: "Senja",
  tagline: "Papan hangat oranye & ungu senja",
  description:
    "Papan senada tema aplikasi Senja: sel aktif oranye hangat, kata terjawab peach, soal ungu dusk.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#ffffff",
    background: { gradient: ["#fdf3ec", "#fbe8dc"] },
    boardBorder: "#ecd4c4",
    cellActive: "#ffffff",
    cellActiveText: "#3a241a",
    cellBorder: "#ecd4c4",
    cellSelected: "#d96c3f",
    cellSelectedText: "#ffffff",
    cellHighlight: "#f3e3f7",
    cellHighlightBorder: "#d96c3f",
    cellSolved: "#ffe0d1",
    cellSolvedText: "#b0502a",
    cellBlocked: "#3a241a",
    cellNumber: "#7a5c4a",
    clueBackground: "#8a5a9e",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#8a5a9e",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#ffffff",
    hintBorder: "#ecd4c4",
    hintPrimary: "#d96c3f",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#f3e3f7",
    hintIcon: "#8a5a9e",
    hintText: "#3a241a",
    hintTextSecondary: "#7a5c4a",
    hintBadgeBackground: "#ecd4c4",
    hintBadgeText: "#8a5a9e",
  },
  dark: {
    boardBackground: "#35202e",
    background: { gradient: ["#35202e", "#241420"] },
    boardBorder: "#57394a",
    cellActive: "#35202e",
    cellActiveText: "#fdf3ec",
    cellBorder: "#57394a",
    cellSelected: "#ff9c6b",
    cellSelectedText: "#241420",
    cellHighlight: "#46284f",
    cellHighlightBorder: "#ff9c6b",
    cellSolved: "#5a2e3a",
    cellSolvedText: "#ff9c6b",
    cellBlocked: "#241420",
    cellNumber: "#c2a492",
    clueBackground: "#8a5a9e",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#8a5a9e",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#35202e",
    hintBorder: "#57394a",
    hintPrimary: "#ff9c6b",
    hintPrimaryText: "#241420",
    hintSecondary: "#46284f",
    hintIcon: "#c9a0dd",
    hintText: "#fdf3ec",
    hintTextSecondary: "#c2a492",
    hintBadgeBackground: "#57394a",
    hintBadgeText: "#ff9c6b",
  },
};

const papanHutan: BoardThemeDefinition = {
  id: "hutan",
  name: "Hutan",
  tagline: "Papan hijau rimba yang teduh",
  description:
    "Papan senada tema aplikasi Hutan: sel aktif hijau rimba, kata terjawab hijau muda, soal biru langit.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#ffffff",
    background: { gradient: ["#f0f7ee", "#e5f2e1"] },
    boardBorder: "#c9ddc5",
    cellActive: "#ffffff",
    cellActiveText: "#1d3322",
    cellBorder: "#c9ddc5",
    cellSelected: "#2f8f4e",
    cellSelectedText: "#ffffff",
    cellHighlight: "#e6f2dc",
    cellHighlightBorder: "#2f8f4e",
    cellSolved: "#d8efd4",
    cellSolvedText: "#1f6b3a",
    cellBlocked: "#1d3322",
    cellNumber: "#55705c",
    clueBackground: "#4a7fc0",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#4a7fc0",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#ffffff",
    hintBorder: "#c9ddc5",
    hintPrimary: "#2f8f4e",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#e6f2dc",
    hintIcon: "#6a7f3f",
    hintText: "#1d3322",
    hintTextSecondary: "#55705c",
    hintBadgeBackground: "#c9ddc5",
    hintBadgeText: "#1f6b3a",
  },
  dark: {
    boardBackground: "#152b1c",
    background: { gradient: ["#152b1c", "#0d1f12"] },
    boardBorder: "#2c4a37",
    cellActive: "#152b1c",
    cellActiveText: "#f0f7ee",
    cellBorder: "#2c4a37",
    cellSelected: "#5fbe7f",
    cellSelectedText: "#0d1f12",
    cellHighlight: "#243a28",
    cellHighlightBorder: "#5fbe7f",
    cellSolved: "#1e3d2b",
    cellSolvedText: "#5fbe7f",
    cellBlocked: "#0d1f12",
    cellNumber: "#92af99",
    clueBackground: "#4a7fc0",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#4a7fc0",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#152b1c",
    hintBorder: "#2c4a37",
    hintPrimary: "#5fbe7f",
    hintPrimaryText: "#0d1f12",
    hintSecondary: "#243a28",
    hintIcon: "#a3bd6e",
    hintText: "#f0f7ee",
    hintTextSecondary: "#92af99",
    hintBadgeBackground: "#2c4a37",
    hintBadgeText: "#5fbe7f",
  },
};

const papanNeumorfik: BoardThemeDefinition = {
  id: "neumorfik",
  name: "Neumorfik",
  tagline: "Papan soft UI lembut senada tema aplikasi",
  description:
    "Papan senada tema aplikasi Neumorfik: permukaan abu senada, sel aktif lembut, kata terjawab biru, soal & panel petunjuk minimalis.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#e0e5ec",
    background: { gradient: ["#e6eaf0", "#dde2ea"] },
    boardBorder: "#d2d9e2",
    cellActive: "#e6ebf2",
    cellActiveText: "#5b6779",
    cellBorder: "#d0d7e0",
    cellSelected: "#3d5afe",
    cellSelectedText: "#ffffff",
    cellHighlight: "#dfe6f0",
    cellHighlightBorder: "#3d5afe",
    cellSolved: "#c9dcff",
    cellSolvedText: "#2f5be8",
    cellBlocked: "#b8c1cf",
    cellNumber: "#8b94a5",
    clueBackground: "#3d5afe",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#3d5afe",
    clueArrowBackground: "rgba(255,255,255,0.18)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "#e0e5ec",
    hintBorder: "#d2d9e2",
    hintPrimary: "#3d5afe",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#d2d9e2",
    hintIcon: "#5b6779",
    hintText: "#5b6779",
    hintTextSecondary: "#8b94a5",
    hintBadgeBackground: "#d2d9e2",
    hintBadgeText: "#3d5afe",
  },
  dark: {
    boardBackground: "#1f2429",
    background: { gradient: ["#232930", "#1c2126"] },
    boardBorder: "#2a3037",
    cellActive: "#232930",
    cellActiveText: "#d8dee9",
    cellBorder: "#2a3037",
    cellSelected: "#7d9bff",
    cellSelectedText: "#101318",
    cellHighlight: "#2a3140",
    cellHighlightBorder: "#7d9bff",
    cellSolved: "#2b3a63",
    cellSolvedText: "#9db8ff",
    cellBlocked: "#161a1f",
    cellNumber: "#8f98a8",
    clueBackground: "#7d9bff",
    clueText: "#101318",
    clueTextMuted: "rgba(16,19,24,0.8)",
    clueBadgeBackground: "#101318",
    clueBadgeText: "#7d9bff",
    clueArrowBackground: "rgba(16,19,24,0.15)",
    clueDivider: "rgba(16,19,24,0.3)",
    hintBackground: "#1f2429",
    hintBorder: "#2a3037",
    hintPrimary: "#7d9bff",
    hintPrimaryText: "#101318",
    hintSecondary: "#2a3037",
    hintIcon: "#9db8ff",
    hintText: "#d8dee9",
    hintTextSecondary: "#8f98a8",
    hintBadgeBackground: "#2a3037",
    hintBadgeText: "#9db8ff",
  },
};

export const BOARD_THEMES: BoardThemeDefinition[] = [papanPuitis, papanSamudra, papanSenja, papanHutan, papanTinta, papanNeon, papanNeumorfik];

/* ─────────────────────────── Tema Keyboard ─────────────────────────── */

export interface KeyboardColors {
  panelBackground: string;
  panelBorder: string;
  keyBackground: string;
  keyBorder: string;
  keyText: string;
  /** Tombol khusus (backspace). */
  specialBackground: string;
  /** Latar panel keyboard — gradien/gambar opsional (panel tetap solid bila kosong). */
  background?: BackgroundSpec;
  /** Tombol navigasi panah. */
  navBackground: string;
  navBorder: string;
  navText: string;
}

export interface KeyboardThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  light: KeyboardColors;
  dark: KeyboardColors;
}

const keyboardPuitis: KeyboardThemeDefinition = {
  id: "puitis",
  name: "Puitis",
  tagline: "Keyboard klasik senada tema aplikasi",
  description:
    "Keyboard default: tombol senada dengan palet aplikasi, tombol hapus lebih pekat agar mudah ditemukan.",
  isDefault: true,
  priceLabel: "Gratis · Tema Aktif",
  light: {
    panelBackground: "#ffffff",
    panelBorder: "#dcc8e0",
    keyBackground: "#ffffff",
    keyBorder: "#dcc8e0",
    keyText: "#2e1a28",
    specialBackground: "#dcc8e0",
    navBackground: "#ffffff",
    navBorder: "#2e1a28",
    navText: "#2e1a28",
  },
  dark: {
    panelBackground: "#2a1a30",
    panelBorder: "#4a3850",
    keyBackground: "#2a1a30",
    keyBorder: "#4a3850",
    keyText: "#fef7ff",
    specialBackground: "#4a3850",
    navBackground: "#2a1a30",
    navBorder: "#fef7ff",
    navText: "#fef7ff",
  },
};

const keyboardPastel: KeyboardThemeDefinition = {
  id: "pastel",
  name: "Pastel",
  tagline: "Tombol lembut dengan aksen ungu",
  description:
    "Keyboard bernuansa pastel: tombol cerah dengan tepi halus dan aksen ungu pada tombol navigasi.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#fbf3fa",
    background: { gradient: ["#fbf3fa", "#f5eaf9"] },
    panelBorder: "#ead8f0",
    keyBackground: "#ffffff",
    keyBorder: "#e6d3ec",
    keyText: "#4a3550",
    specialBackground: "#e0b8e8",
    navBackground: "#f3e0f8",
    navBorder: "#7c52aa",
    navText: "#7c52aa",
  },
  dark: {
    panelBackground: "#2e2138",
    background: { gradient: ["#2e2138", "#372944"] },
    panelBorder: "#4a3a5a",
    keyBackground: "#3a2a48",
    keyBorder: "#4a3a5a",
    keyText: "#f6ecfb",
    specialBackground: "#6e4a86",
    navBackground: "#4a3860",
    navBorder: "#c8a8e8",
    navText: "#c8a8e8",
  },
};

const keyboardKlasik: KeyboardThemeDefinition = {
  id: "klasik",
  name: "Klasik",
  tagline: "Monokrom bersih & tegas",
  description:
    "Keyboard hitam-putih yang bersih: tanpa warna mencolok, fokus pada kejelasan tombol.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#f5f5f2",
    background: { gradient: ["#f5f5f2", "#ebeae4"] },
    panelBorder: "#d5d2c8",
    keyBackground: "#ffffff",
    keyBorder: "#d5d2c8",
    keyText: "#222222",
    specialBackground: "#d9d5ca",
    navBackground: "#ffffff",
    navBorder: "#444444",
    navText: "#222222",
  },
  dark: {
    panelBackground: "#1a1a1a",
    background: { gradient: ["#1a1a1a", "#222222"] },
    panelBorder: "#3a3a3a",
    keyBackground: "#262626",
    keyBorder: "#3a3a3a",
    keyText: "#f2f2f2",
    specialBackground: "#454545",
    navBackground: "#262626",
    navBorder: "#f2f2f2",
    navText: "#f2f2f2",
  },
};

const keyboardSamudra: KeyboardThemeDefinition = {
  id: "samudra",
  name: "Samudra",
  tagline: "Keyboard biru laut senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Samudra: tombol putih-biru muda, navigasi biru laut.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#ffffff",
    background: { gradient: ["#eef7fb", "#e2f2f7"] },
    panelBorder: "#c3dbe6",
    keyBackground: "#ffffff",
    keyBorder: "#c3dbe6",
    keyText: "#0e2a3a",
    specialBackground: "#c3dbe6",
    navBackground: "#ffffff",
    navBorder: "#0087b8",
    navText: "#0087b8",
  },
  dark: {
    panelBackground: "#0d2a38",
    background: { gradient: ["#0d2a38", "#0a2233"] },
    panelBorder: "#1f4454",
    keyBackground: "#0d2a38",
    keyBorder: "#1f4454",
    keyText: "#eef7fb",
    specialBackground: "#1f4454",
    navBackground: "#0d2a38",
    navBorder: "#4fc3e8",
    navText: "#4fc3e8",
  },
};

const keyboardSenja: KeyboardThemeDefinition = {
  id: "senja",
  name: "Senja",
  tagline: "Keyboard hangat senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Senja: tombol putih-cream, navigasi oranye hangat.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#ffffff",
    background: { gradient: ["#fdf3ec", "#fbe8dc"] },
    panelBorder: "#ecd4c4",
    keyBackground: "#ffffff",
    keyBorder: "#ecd4c4",
    keyText: "#3a241a",
    specialBackground: "#ecd4c4",
    navBackground: "#ffffff",
    navBorder: "#d96c3f",
    navText: "#d96c3f",
  },
  dark: {
    panelBackground: "#35202e",
    background: { gradient: ["#35202e", "#331a2a"] },
    panelBorder: "#57394a",
    keyBackground: "#35202e",
    keyBorder: "#57394a",
    keyText: "#fdf3ec",
    specialBackground: "#57394a",
    navBackground: "#35202e",
    navBorder: "#ff9c6b",
    navText: "#ff9c6b",
  },
};

const keyboardHutan: KeyboardThemeDefinition = {
  id: "hutan",
  name: "Hutan",
  tagline: "Keyboard hijau segar senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Hutan: tombol putih-hijau muda, navigasi hijau rimba.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#ffffff",
    background: { gradient: ["#f0f7ee", "#e5f2e1"] },
    panelBorder: "#c9ddc5",
    keyBackground: "#ffffff",
    keyBorder: "#c9ddc5",
    keyText: "#1d3322",
    specialBackground: "#c9ddc5",
    navBackground: "#ffffff",
    navBorder: "#2f8f4e",
    navText: "#2f8f4e",
  },
  dark: {
    panelBackground: "#152b1c",
    background: { gradient: ["#152b1c", "#12291b"] },
    panelBorder: "#2c4a37",
    keyBackground: "#152b1c",
    keyBorder: "#2c4a37",
    keyText: "#f0f7ee",
    specialBackground: "#2c4a37",
    navBackground: "#152b1c",
    navBorder: "#5fbe7f",
    navText: "#5fbe7f",
  },
};

const keyboardNeumorfik: KeyboardThemeDefinition = {
  id: "neumorfik",
  name: "Neumorfik",
  tagline: "Keyboard soft UI lembut senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Neumorfik: tombol abu senada yang tampak timbul, navigasi biru — bersih dan minimalis.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#e0e5ec",
    panelBorder: "#d2d9e2",
    keyBackground: "#e0e5ec",
    keyBorder: "#d2d9e2",
    keyText: "#5b6779",
    specialBackground: "#d2d9e2",
    background: { gradient: ["#e6eaf0", "#dde2ea"] },
    navBackground: "#e0e5ec",
    navBorder: "#3d5afe",
    navText: "#3d5afe",
  },
  dark: {
    panelBackground: "#1f2429",
    panelBorder: "#2a3037",
    keyBackground: "#1f2429",
    keyBorder: "#2a3037",
    keyText: "#d8dee9",
    specialBackground: "#2a3037",
    background: { gradient: ["#232930", "#1c2126"] },
    navBackground: "#1f2429",
    navBorder: "#7d9bff",
    navText: "#7d9bff",
  },
};

export const KEYBOARD_THEMES: KeyboardThemeDefinition[] = [
  keyboardPuitis,
  keyboardSamudra,
  keyboardSenja,
  keyboardHutan,
  keyboardPastel,
  keyboardKlasik,
  keyboardNeumorfik,
];

/* ─────────────────────────── Resolver ─────────────────────────── */

export const DEFAULT_APP_THEME_ID = "puitis";
export const DEFAULT_BOARD_THEME_ID = "puitis";
export const DEFAULT_KEYBOARD_THEME_ID = "puitis";

export function getAppThemeById(id: string): AppThemeDefinition {
  return APP_THEMES.find((t) => t.id === id) ?? puitis;
}

export function getBoardThemeById(id: string): BoardThemeDefinition {
  return BOARD_THEMES.find((t) => t.id === id) ?? papanPuitis;
}

export function getKeyboardThemeById(id: string): KeyboardThemeDefinition {
  return KEYBOARD_THEMES.find((t) => t.id === id) ?? keyboardPuitis;
}
