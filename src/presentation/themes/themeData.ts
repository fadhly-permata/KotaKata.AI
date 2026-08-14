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
 * ⚠️ Jaga konsistensi dengan `supabase/data/themes.sql` (dibuat otomatis via
 * `bun scripts/db/gen-themes-sql.mjs`).
 */

/* ─────────────────────────── Tema Aplikasi (Global) ─────────────────────────── */

export interface AppThemeDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
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
  light: {
    mode: "light",
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
  light: {
    mode: "light",
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
  light: {
    mode: "light",
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
  light: {
    mode: "light",
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

export const APP_THEMES: AppThemeDefinition[] = [puitis, samudra, senja, hutan];

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

export const BOARD_THEMES: BoardThemeDefinition[] = [papanPuitis, papanTinta, papanNeon];

/* ─────────────────────────── Tema Keyboard ─────────────────────────── */

export interface KeyboardColors {
  panelBackground: string;
  panelBorder: string;
  keyBackground: string;
  keyBorder: string;
  keyText: string;
  /** Tombol khusus (backspace). */
  specialBackground: string;
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

export const KEYBOARD_THEMES: KeyboardThemeDefinition[] = [keyboardPuitis, keyboardPastel, keyboardKlasik];

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
