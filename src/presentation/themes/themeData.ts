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
    radius: 14,
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
      // Token skin (PLAN-038) — senada latar (neumorphism: chip/input satu tone).
      overlay: "rgba(90,100,120,0.4)",
      chipBackground: "#d2d9e2",
      chipText: "#5b6779",
      inputBackground: "#e0e5ec",
      inputBorder: "#d2d9e2",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    // Dark neumorphism: abu gelap senada, surface = latar, bayangan terang
    // sangat halus di kiri-atas + gelap pekat di kanan-bawah.
    background: { gradient: ["#232930", "#1c2126"] },
    radius: 14,
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
      // Token skin (PLAN-038) — senada latar gelap.
      overlay: "rgba(8,10,14,0.6)",
      chipBackground: "#2a3037",
      chipText: "#d8dee9",
      inputBackground: "#1f2429",
      inputBorder: "#2a3037",
      textOnPrimary: "#101318",
    },
  },
};

/* ─────────────────────────── Tema: Glassmorphism (PLAN-040) ─────────────────────────── */

const glassmorphism: AppThemeDefinition = {
  id: "glassmorphism",
  name: "Glassmorphism",
  tagline: "Kaca buram — permukaan transparan & cahaya",
  description:
    "Gaya glassmorphism: latar gradien hidup yang menembus permukaan semi-transparan (frosted glass) dengan border tipis bercahaya dan bayangan lembut menyebar. Jernih, modern, penuh cahaya.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Jernih", rate: 1, volume: 0.85 },
  ambient: {
    label: "Angin sepoi",
    url: "https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    // Latar gradien CERAH + veil putih tipis (overlay) supaya teks gelap tetap
    // terbaca; permukaan kaca transparan menampilkan gradien di belakangnya.
    background: {
      gradient: ["#8a7df2", "#6fa8ff", "#e08af0"],
      overlay: "rgba(255,255,255,0.45)",
    },
    radius: 18,
    shadow: {
      light: "rgba(255,255,255,0.7)",
      dark: "rgba(80,70,180,0.28)",
      offset: 5,
      blur: 22,
      insetOffset: 2,
      insetBlur: 8,
    },
    colors: {
      background: "#7d6ff0",
      surface: "rgba(255,255,255,0.4)",
      text: "#1e2340",
      textSecondary: "#5a6285",
      border: "rgba(255,255,255,0.55)",
      primary: "#6d4aff",
      secondary: "#5b7cfa",
      secondaryContainer: "rgba(255,255,255,0.45)",
      tertiary: "#d76bd9",
      tertiaryContainer: "rgba(255,255,255,0.35)",
      accent: "#6d4aff",
      gold: "#ffc94d",
      success: "#2fd0a0",
      error: "#ff5d7a",
      cellActive: "rgba(255,255,255,0.55)",
      cellBorder: "rgba(255,255,255,0.6)",
      cellText: "#1e2340",
      cellBlocked: "rgba(30,35,64,0.85)",
      cellLocked: "rgba(255,255,255,0.35)",
      cellSolved: "rgba(109,74,255,0.35)",
      cellSolvedText: "#4a35d0",
      overlay: "rgba(20,15,60,0.45)",
      chipBackground: "rgba(255,255,255,0.4)",
      chipText: "#1e2340",
      inputBackground: "rgba(255,255,255,0.35)",
      inputBorder: "rgba(255,255,255,0.55)",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    // Glass gelap: gradien ungu-navy dalam, permukaan kaca gelap transparan.
    background: {
      gradient: ["#1c1e4d", "#2a1e5e", "#16284d"],
      overlay: "rgba(8,10,30,0.35)",
    },
    radius: 18,
    shadow: {
      light: "rgba(255,255,255,0.12)",
      dark: "rgba(5,6,25,0.5)",
      offset: 6,
      blur: 24,
      insetOffset: 2,
      insetBlur: 10,
    },
    colors: {
      background: "#1c1e4d",
      surface: "rgba(255,255,255,0.1)",
      text: "#f0f2ff",
      textSecondary: "#a9b0e0",
      border: "rgba(255,255,255,0.22)",
      primary: "#9b8cff",
      secondary: "#7aa4ff",
      secondaryContainer: "rgba(255,255,255,0.12)",
      tertiary: "#ff9ce0",
      tertiaryContainer: "rgba(255,255,255,0.08)",
      accent: "#9b8cff",
      gold: "#ffd166",
      success: "#4fe0b5",
      error: "#ff6b85",
      cellActive: "rgba(255,255,255,0.14)",
      cellBorder: "rgba(255,255,255,0.25)",
      cellText: "#f0f2ff",
      cellBlocked: "rgba(5,8,25,0.9)",
      cellLocked: "rgba(255,255,255,0.1)",
      cellSolved: "rgba(155,140,255,0.35)",
      cellSolvedText: "#c9c0ff",
      overlay: "rgba(4,5,18,0.55)",
      chipBackground: "rgba(255,255,255,0.12)",
      chipText: "#f0f2ff",
      inputBackground: "rgba(255,255,255,0.08)",
      inputBorder: "rgba(255,255,255,0.2)",
      textOnPrimary: "#141428",
    },
  },
};

/* ─────────────────────────── Tema: Claymorphism (PLAN-040) ─────────────────────────── */

const claymorphism: AppThemeDefinition = {
  id: "claymorphism",
  name: "Claymorphism",
  tagline: "Tanah liat lembut — pastel hangat & bentuk menggemaskan",
  description:
    "Gaya claymorphism: warna pastel hangat (krim, peach, mawar) dengan permukaan 'tanah liat' — sudut sangat membulat, highlight terang di atas dan bayangan lembut berwarna di bawah. Hangat dan playful.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Hangat", rate: 0.9, volume: 0.95 },
  ambient: {
    label: "Api unggun malam",
    url: "https://assets.mixkit.co/active_storage/sfx/1329/1329-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: { gradient: ["#fdeee2", "#f9e2e6", "#efe4f5"] },
    radius: 22,
    shadow: {
      light: "rgba(255,255,255,0.85)",
      dark: "rgba(190,140,110,0.45)",
      offset: 8,
      blur: 18,
      insetOffset: 3,
      insetBlur: 8,
    },
    colors: {
      background: "#f9e6da",
      surface: "#fff4ea",
      text: "#4a3b33",
      textSecondary: "#8a7468",
      border: "#ecd9cc",
      primary: "#ff8a5c",
      secondary: "#e07b8f",
      secondaryContainer: "#ffe4d6",
      tertiary: "#b07dd8",
      tertiaryContainer: "#f3e3fb",
      accent: "#ff8a5c",
      gold: "#f5b942",
      success: "#7fb069",
      error: "#e2574c",
      cellActive: "#fff7ef",
      cellBorder: "#ecd9cc",
      cellText: "#4a3b33",
      cellBlocked: "#5c4a40",
      cellLocked: "#ecd9cc",
      cellSolved: "#ffd9c4",
      cellSolvedText: "#c2542f",
      overlay: "rgba(60,30,20,0.4)",
      chipBackground: "#ffe4d6",
      chipText: "#8a4a30",
      inputBackground: "#fff4ea",
      inputBorder: "#ecd9cc",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    background: { gradient: ["#332522", "#2b1f26", "#241f30"] },
    radius: 22,
    shadow: {
      light: "rgba(255,255,255,0.07)",
      dark: "rgba(10,5,5,0.55)",
      offset: 8,
      blur: 18,
      insetOffset: 3,
      insetBlur: 8,
    },
    colors: {
      background: "#2b201f",
      surface: "#3b2d29",
      text: "#f7e9de",
      textSecondary: "#c0a79a",
      border: "#5a453e",
      primary: "#ff9e76",
      secondary: "#f090a4",
      secondaryContainer: "#55332f",
      tertiary: "#c99ae8",
      tertiaryContainer: "#462852",
      accent: "#ff9e76",
      gold: "#f5c25e",
      success: "#8fd07f",
      error: "#ff7a70",
      cellActive: "#3b2d29",
      cellBorder: "#5a453e",
      cellText: "#f7e9de",
      cellBlocked: "#1d1413",
      cellLocked: "#5a453e",
      cellSolved: "#6b3b2c",
      cellSolvedText: "#ffb393",
      overlay: "rgba(15,8,8,0.55)",
      chipBackground: "#55332f",
      chipText: "#f7e9de",
      inputBackground: "#3b2d29",
      inputBorder: "#5a453e",
      textOnPrimary: "#2a1b15",
    },
  },
};

/* ─────────────────────────── Tema: Neo-Brutalism (PLAN-040) ─────────────────────────── */

const neoBrutalism: AppThemeDefinition = {
  id: "neo-brutalism",
  name: "Neo-Brutalism",
  tagline: "Blok warna tegas — border hitam & bayangan keras",
  description:
    "Gaya neo-brutalism: warna solid berani, garis tepi hitam tebal, sudut nyaris kotak, dan bayangan keras offset tanpa blur. Energik, blak-blakan, penuh karakter.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Tegas", rate: 1.15, volume: 1 },
  ambient: {
    label: "Hiruk-pikuk kota",
    url: "https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: { gradient: ["#fbf7ec", "#f4efe0"] },
    // Bayangan keras khas brutalist: blur 0 + offset solid hitam. Bayangan
    // 'terang' dibuat transparent supaya hanya ada SATU bayangan keras.
    radius: 4,
    shadow: {
      light: "transparent",
      dark: "#111111",
      offset: 5,
      blur: 0,
      insetOffset: 0,
      insetBlur: 0,
    },
    colors: {
      background: "#f8f4e6",
      surface: "#ffffff",
      text: "#111111",
      textSecondary: "#555555",
      border: "#111111",
      primary: "#ff5d5d",
      secondary: "#ffd23f",
      secondaryContainer: "#ffe9a8",
      tertiary: "#3b8ef0",
      tertiaryContainer: "#d6e7ff",
      accent: "#ff5d5d",
      gold: "#f5a623",
      success: "#2fd07b",
      error: "#ff4d4d",
      cellActive: "#ffffff",
      cellBorder: "#111111",
      cellText: "#111111",
      cellBlocked: "#111111",
      cellLocked: "#e8e8e8",
      cellSolved: "#a8ff5c",
      cellSolvedText: "#162400",
      overlay: "rgba(0,0,0,0.55)",
      chipBackground: "#ffd23f",
      chipText: "#111111",
      inputBackground: "#ffffff",
      inputBorder: "#111111",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    background: { gradient: ["#1f1f1f", "#141414"] },
    radius: 4,
    // Invers brutalist gelap: border & bayangan keras PUTIH di atas gelap.
    shadow: {
      light: "transparent",
      dark: "#c9c9c9",
      offset: 5,
      blur: 0,
      insetOffset: 0,
      insetBlur: 0,
    },
    colors: {
      background: "#171717",
      surface: "#1f1f1f",
      text: "#f5f5f5",
      textSecondary: "#9a9a9a",
      border: "#ffffff",
      primary: "#ff6b6b",
      secondary: "#ffd93d",
      secondaryContainer: "#3d3d3d",
      tertiary: "#5aa7ff",
      tertiaryContainer: "#2a3a52",
      accent: "#ff6b6b",
      gold: "#f5c25e",
      success: "#58e08a",
      error: "#ff5c5c",
      cellActive: "#232323",
      cellBorder: "#ffffff",
      cellText: "#f5f5f5",
      cellBlocked: "#000000",
      cellLocked: "#333333",
      cellSolved: "#ffd93d",
      cellSolvedText: "#171717",
      overlay: "rgba(0,0,0,0.6)",
      chipBackground: "#333333",
      chipText: "#f5f5f5",
      inputBackground: "#232323",
      inputBorder: "#ffffff",
      textOnPrimary: "#ffffff",
    },
  },
};

/* ─────────────────────────── Tema: Minimalist UI (PLAN-040) ─────────────────────────── */

const minimalist: AppThemeDefinition = {
  id: "minimalist",
  name: "Minimalist UI",
  tagline: "Bersih & tenang — flat, tanpa bayangan, satu aksen",
  description:
    "Gaya minimalist: latar polos dengan banyak ruang, permukaan datar (tanpa bayangan), border halus abu-abu, dan aksen hitam-putih tegas. Fokus pada isi — tidak ada yang berteriak.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Hening", rate: 0.9, volume: 0.7 },
  ambient: {
    label: "Angin hutan sejuk",
    url: "https://assets.mixkit.co/active_storage/sfx/1237/1237-preview.mp3",
    volume: 0.25,
  },
  light: {
    mode: "light",
    background: { gradient: ["#ffffff", "#f6f6f6"] },
    // Tanpa `shadow` → semua permukaan flat (helper skin mengembalikan {}).
    radius: 10,
    colors: {
      background: "#fafafa",
      surface: "#ffffff",
      text: "#18181b",
      textSecondary: "#71717a",
      border: "#e4e4e7",
      primary: "#18181b",
      secondary: "#71717a",
      secondaryContainer: "#f4f4f5",
      tertiary: "#a1a1aa",
      tertiaryContainer: "#f4f4f5",
      accent: "#18181b",
      gold: "#d4a54a",
      success: "#22c55e",
      error: "#ef4444",
      cellActive: "#ffffff",
      cellBorder: "#d4d4d8",
      cellText: "#18181b",
      cellBlocked: "#18181b",
      cellLocked: "#e4e4e7",
      cellSolved: "#eef0f4",
      cellSolvedText: "#18181b",
      overlay: "rgba(0,0,0,0.4)",
      chipBackground: "#f4f4f5",
      chipText: "#52525b",
      inputBackground: "#ffffff",
      inputBorder: "#e4e4e7",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    background: { gradient: ["#111111", "#0a0a0a"] },
    radius: 10,
    colors: {
      background: "#0a0a0a",
      surface: "#171717",
      text: "#fafafa",
      textSecondary: "#a1a1aa",
      border: "#27272a",
      primary: "#fafafa",
      secondary: "#a1a1aa",
      secondaryContainer: "#1f1f23",
      tertiary: "#71717a",
      tertiaryContainer: "#1f1f23",
      accent: "#fafafa",
      gold: "#e5b654",
      success: "#4ade80",
      error: "#f87171",
      cellActive: "#171717",
      cellBorder: "#2e2e32",
      cellText: "#fafafa",
      cellBlocked: "#050505",
      cellLocked: "#27272a",
      cellSolved: "#242428",
      cellSolvedText: "#fafafa",
      overlay: "rgba(0,0,0,0.6)",
      chipBackground: "#1f1f23",
      chipText: "#d4d4d8",
      inputBackground: "#171717",
      inputBorder: "#27272a",
      textOnPrimary: "#0a0a0a",
    },
  },
};

/* ─────────────────────────── Tema: Frost UI (soft glass, PLAN-040) ─────────────────────────── */

const frost: AppThemeDefinition = {
  id: "frost",
  name: "Frost UI",
  tagline: "Kaca lembut bersalju — es biru & keheningan dingin",
  description:
    "Frost UI (soft glass): variasi glassmorphism yang lebih lembut — permukaan kaca buram rendah saturasi, bayangan sangat halus, border tipis seperti embun beku, dengan nuansa es biru yang tenang.",
  isDefault: false,
  priceLabel: "Gratis",
  sound: { label: "Dingin", rate: 0.82, volume: 0.7 },
  ambient: {
    label: "Angin dingin",
    url: "https://assets.mixkit.co/active_storage/sfx/1172/1172-preview.mp3",
    volume: 0.3,
  },
  light: {
    mode: "light",
    background: {
      gradient: ["#e6eefb", "#dce9f8", "#e8f2f7"],
      overlay: "rgba(255,255,255,0.4)",
    },
    radius: 16,
    shadow: {
      light: "rgba(255,255,255,0.9)",
      dark: "rgba(120,150,190,0.3)",
      offset: 4,
      blur: 20,
      insetOffset: 2,
      insetBlur: 8,
    },
    colors: {
      background: "#dde8f5",
      surface: "rgba(255,255,255,0.55)",
      text: "#2b3a4d",
      textSecondary: "#6b7f96",
      border: "rgba(255,255,255,0.7)",
      primary: "#4f86d6",
      secondary: "#7aa2d0",
      secondaryContainer: "rgba(255,255,255,0.5)",
      tertiary: "#5fb4c9",
      tertiaryContainer: "rgba(255,255,255,0.4)",
      accent: "#4f86d6",
      gold: "#e3b23c",
      success: "#5cb9a0",
      error: "#e0646e",
      cellActive: "rgba(255,255,255,0.6)",
      cellBorder: "rgba(255,255,255,0.75)",
      cellText: "#2b3a4d",
      cellBlocked: "rgba(60,78,100,0.9)",
      cellLocked: "rgba(255,255,255,0.45)",
      cellSolved: "rgba(79,134,214,0.3)",
      cellSolvedText: "#315f9e",
      overlay: "rgba(30,45,70,0.35)",
      chipBackground: "rgba(255,255,255,0.55)",
      chipText: "#3a4c63",
      inputBackground: "rgba(255,255,255,0.45)",
      inputBorder: "rgba(255,255,255,0.7)",
      textOnPrimary: "#ffffff",
    },
  },
  dark: {
    mode: "dark",
    background: {
      gradient: ["#14233a", "#101c2e", "#0f2130"],
      overlay: "rgba(10,18,32,0.3)",
    },
    radius: 16,
    shadow: {
      light: "rgba(255,255,255,0.1)",
      dark: "rgba(5,12,25,0.5)",
      offset: 5,
      blur: 22,
      insetOffset: 2,
      insetBlur: 10,
    },
    colors: {
      background: "#101c2e",
      surface: "rgba(255,255,255,0.08)",
      text: "#eaf2fb",
      textSecondary: "#93a7c0",
      border: "rgba(255,255,255,0.18)",
      primary: "#7fb1e8",
      secondary: "#8fb6dc",
      secondaryContainer: "rgba(255,255,255,0.1)",
      tertiary: "#79c4d8",
      tertiaryContainer: "rgba(255,255,255,0.06)",
      accent: "#7fb1e8",
      gold: "#e6c066",
      success: "#6fc7b0",
      error: "#f07d88",
      cellActive: "rgba(255,255,255,0.1)",
      cellBorder: "rgba(255,255,255,0.2)",
      cellText: "#eaf2fb",
      cellBlocked: "rgba(5,12,24,0.9)",
      cellLocked: "rgba(255,255,255,0.07)",
      cellSolved: "rgba(127,177,232,0.28)",
      cellSolvedText: "#aecdf5",
      overlay: "rgba(4,8,18,0.55)",
      chipBackground: "rgba(255,255,255,0.1)",
      chipText: "#c3d2e4",
      inputBackground: "rgba(255,255,255,0.06)",
      inputBorder: "rgba(255,255,255,0.16)",
      textOnPrimary: "#0d1a2b",
    },
  },
};

export const APP_THEMES: AppThemeDefinition[] = [
  puitis,
  samudra,
  senja,
  hutan,
  neumorfik,
  glassmorphism,
  claymorphism,
  neoBrutalism,
  minimalist,
  frost,
];

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

const papanGlassmorphism: BoardThemeDefinition = {
  id: "glassmorphism",
  name: "Glassmorphism",
  tagline: "Papan kaca senada tema aplikasi",
  description:
    "Papan senada tema aplikasi Glassmorphism: sel kaca transparan bercahaya, kata terjawab ungu lembut, soal indigo pekat.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "rgba(255,255,255,0.28)",
    background: { gradient: ["#8a7df2", "#6fa8ff", "#e08af0"] },
    boardBorder: "rgba(255,255,255,0.5)",
    cellActive: "rgba(255,255,255,0.55)",
    cellActiveText: "#1e2340",
    cellBorder: "rgba(255,255,255,0.6)",
    cellSelected: "#6d4aff",
    cellSelectedText: "#ffffff",
    cellHighlight: "rgba(255,255,255,0.4)",
    cellHighlightBorder: "#6d4aff",
    cellSolved: "rgba(109,74,255,0.35)",
    cellSolvedText: "#4a35d0",
    cellBlocked: "rgba(30,35,64,0.85)",
    cellNumber: "#4a5480",
    clueBackground: "#4a45c8",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#4a45c8",
    clueArrowBackground: "rgba(255,255,255,0.2)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "rgba(255,255,255,0.4)",
    hintBorder: "rgba(255,255,255,0.55)",
    hintPrimary: "#6d4aff",
    hintPrimaryText: "#ffffff",
    hintSecondary: "rgba(255,255,255,0.5)",
    hintIcon: "#4a35d0",
    hintText: "#1e2340",
    hintTextSecondary: "#5a6285",
    hintBadgeBackground: "rgba(255,255,255,0.6)",
    hintBadgeText: "#4a35d0",
  },
  dark: {
    boardBackground: "rgba(255,255,255,0.08)",
    background: { gradient: ["#1c1e4d", "#2a1e5e", "#16284d"] },
    boardBorder: "rgba(255,255,255,0.22)",
    cellActive: "rgba(255,255,255,0.14)",
    cellActiveText: "#f0f2ff",
    cellBorder: "rgba(255,255,255,0.25)",
    cellSelected: "#9b8cff",
    cellSelectedText: "#141428",
    cellHighlight: "rgba(255,255,255,0.1)",
    cellHighlightBorder: "#9b8cff",
    cellSolved: "rgba(155,140,255,0.35)",
    cellSolvedText: "#c9c0ff",
    cellBlocked: "rgba(5,8,25,0.9)",
    cellNumber: "#a9b0e0",
    clueBackground: "#4a45c8",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#4a45c8",
    clueArrowBackground: "rgba(255,255,255,0.2)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "rgba(255,255,255,0.1)",
    hintBorder: "rgba(255,255,255,0.22)",
    hintPrimary: "#9b8cff",
    hintPrimaryText: "#141428",
    hintSecondary: "rgba(255,255,255,0.14)",
    hintIcon: "#c9c0ff",
    hintText: "#f0f2ff",
    hintTextSecondary: "#a9b0e0",
    hintBadgeBackground: "rgba(255,255,255,0.2)",
    hintBadgeText: "#c9c0ff",
  },
};

const papanClaymorphism: BoardThemeDefinition = {
  id: "claymorphism",
  name: "Claymorphism",
  tagline: "Papan tanah liat hangat senada tema aplikasi",
  description:
    "Papan senada tema aplikasi Claymorphism: sel krem lembut, kata terjawab peach, soal oranye clay.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#fff7ef",
    background: { gradient: ["#fdeee2", "#f9e2e6", "#efe4f5"] },
    boardBorder: "#ecd9cc",
    cellActive: "#fff7ef",
    cellActiveText: "#4a3b33",
    cellBorder: "#ecd9cc",
    cellSelected: "#ff8a5c",
    cellSelectedText: "#ffffff",
    cellHighlight: "#ffe4d6",
    cellHighlightBorder: "#ff8a5c",
    cellSolved: "#ffd9c4",
    cellSolvedText: "#c2542f",
    cellBlocked: "#5c4a40",
    cellNumber: "#8a7468",
    clueBackground: "#ff8a5c",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.85)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#ff8a5c",
    clueArrowBackground: "rgba(255,255,255,0.22)",
    clueDivider: "rgba(255,255,255,0.38)",
    hintBackground: "#fff4ea",
    hintBorder: "#ecd9cc",
    hintPrimary: "#ff8a5c",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#ffe4d6",
    hintIcon: "#e07b8f",
    hintText: "#4a3b33",
    hintTextSecondary: "#8a7468",
    hintBadgeBackground: "#ecd9cc",
    hintBadgeText: "#c2542f",
  },
  dark: {
    boardBackground: "#3b2d29",
    background: { gradient: ["#332522", "#2b1f26", "#241f30"] },
    boardBorder: "#5a453e",
    cellActive: "#3b2d29",
    cellActiveText: "#f7e9de",
    cellBorder: "#5a453e",
    cellSelected: "#ff9e76",
    cellSelectedText: "#2a1b15",
    cellHighlight: "#55332f",
    cellHighlightBorder: "#ff9e76",
    cellSolved: "#6b3b2c",
    cellSolvedText: "#ffb393",
    cellBlocked: "#1d1413",
    cellNumber: "#c0a79a",
    clueBackground: "#ff9e76",
    clueText: "#2a1b15",
    clueTextMuted: "rgba(42,27,21,0.8)",
    clueBadgeBackground: "#2a1b15",
    clueBadgeText: "#ff9e76",
    clueArrowBackground: "rgba(42,27,21,0.16)",
    clueDivider: "rgba(42,27,21,0.3)",
    hintBackground: "#3b2d29",
    hintBorder: "#5a453e",
    hintPrimary: "#ff9e76",
    hintPrimaryText: "#2a1b15",
    hintSecondary: "#55332f",
    hintIcon: "#f090a4",
    hintText: "#f7e9de",
    hintTextSecondary: "#c0a79a",
    hintBadgeBackground: "#5a453e",
    hintBadgeText: "#ffb393",
  },
};

const papanNeoBrutalism: BoardThemeDefinition = {
  id: "neo-brutalism",
  name: "Neo-Brutalism",
  tagline: "Papan blok warna tegas — garis hitam tebal",
  description:
    "Papan senada tema aplikasi Neo-Brutalism: sel putih berbingkai hitam, kata terjawab lime cerah, soal hitam pekat.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#faf6ea",
    background: { gradient: ["#fbf7ec", "#f4efe0"] },
    boardBorder: "#111111",
    cellActive: "#ffffff",
    cellActiveText: "#111111",
    cellBorder: "#111111",
    cellSelected: "#111111",
    cellSelectedText: "#ffffff",
    cellHighlight: "#ffd23f",
    cellHighlightBorder: "#111111",
    cellSolved: "#a8ff5c",
    cellSolvedText: "#162400",
    cellBlocked: "#111111",
    cellNumber: "#777777",
    clueBackground: "#111111",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#ff5d5d",
    clueBadgeText: "#ffffff",
    clueArrowBackground: "rgba(255,255,255,0.16)",
    clueDivider: "rgba(255,255,255,0.3)",
    hintBackground: "#ffffff",
    hintBorder: "#111111",
    hintPrimary: "#ff5d5d",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#ffd23f",
    hintIcon: "#111111",
    hintText: "#111111",
    hintTextSecondary: "#555555",
    hintBadgeBackground: "#111111",
    hintBadgeText: "#ffffff",
  },
  dark: {
    boardBackground: "#1f1f1f",
    background: { gradient: ["#1f1f1f", "#141414"] },
    boardBorder: "#ffffff",
    cellActive: "#232323",
    cellActiveText: "#f5f5f5",
    cellBorder: "#ffffff",
    cellSelected: "#f5f5f5",
    cellSelectedText: "#171717",
    cellHighlight: "#3d3d3d",
    cellHighlightBorder: "#f5f5f5",
    cellSolved: "#ffd93d",
    cellSolvedText: "#171717",
    cellBlocked: "#000000",
    cellNumber: "#9a9a9a",
    clueBackground: "#f5f5f5",
    clueText: "#111111",
    clueTextMuted: "rgba(17,17,17,0.75)",
    clueBadgeBackground: "#ff5d5d",
    clueBadgeText: "#ffffff",
    clueArrowBackground: "rgba(17,17,17,0.14)",
    clueDivider: "rgba(17,17,17,0.28)",
    hintBackground: "#1f1f1f",
    hintBorder: "#ffffff",
    hintPrimary: "#ff6b6b",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#ffd93d",
    hintIcon: "#f5f5f5",
    hintText: "#f5f5f5",
    hintTextSecondary: "#9a9a9a",
    hintBadgeBackground: "#ffffff",
    hintBadgeText: "#111111",
  },
};

const papanMinimalist: BoardThemeDefinition = {
  id: "minimalist",
  name: "Minimalist UI",
  tagline: "Papan bersih & datar senada tema aplikasi",
  description:
    "Papan senada tema aplikasi Minimalist UI: grid hitam-putih bersih tanpa hiasan, kata terjawab abu tipis, soal hitam elegan.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "#ffffff",
    background: { gradient: ["#ffffff", "#f6f6f6"] },
    boardBorder: "#e4e4e7",
    cellActive: "#ffffff",
    cellActiveText: "#18181b",
    cellBorder: "#d4d4d8",
    cellSelected: "#18181b",
    cellSelectedText: "#ffffff",
    cellHighlight: "#f4f4f5",
    cellHighlightBorder: "#18181b",
    cellSolved: "#eef0f4",
    cellSolvedText: "#18181b",
    cellBlocked: "#18181b",
    cellNumber: "#a1a1aa",
    clueBackground: "#18181b",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.8)",
    clueBadgeBackground: "#fafafa",
    clueBadgeText: "#18181b",
    clueArrowBackground: "rgba(255,255,255,0.15)",
    clueDivider: "rgba(255,255,255,0.3)",
    hintBackground: "#ffffff",
    hintBorder: "#e4e4e7",
    hintPrimary: "#18181b",
    hintPrimaryText: "#ffffff",
    hintSecondary: "#f4f4f5",
    hintIcon: "#52525b",
    hintText: "#18181b",
    hintTextSecondary: "#71717a",
    hintBadgeBackground: "#e4e4e7",
    hintBadgeText: "#52525b",
  },
  dark: {
    boardBackground: "#171717",
    background: { gradient: ["#171717", "#101010"] },
    boardBorder: "#27272a",
    cellActive: "#171717",
    cellActiveText: "#fafafa",
    cellBorder: "#2e2e32",
    cellSelected: "#fafafa",
    cellSelectedText: "#0a0a0a",
    cellHighlight: "#1f1f23",
    cellHighlightBorder: "#fafafa",
    cellSolved: "#242428",
    cellSolvedText: "#fafafa",
    cellBlocked: "#050505",
    cellNumber: "#71717a",
    clueBackground: "#fafafa",
    clueText: "#0a0a0a",
    clueTextMuted: "rgba(10,10,10,0.75)",
    clueBadgeBackground: "#0a0a0a",
    clueBadgeText: "#fafafa",
    clueArrowBackground: "rgba(10,10,10,0.12)",
    clueDivider: "rgba(10,10,10,0.25)",
    hintBackground: "#171717",
    hintBorder: "#27272a",
    hintPrimary: "#fafafa",
    hintPrimaryText: "#0a0a0a",
    hintSecondary: "#1f1f23",
    hintIcon: "#d4d4d8",
    hintText: "#fafafa",
    hintTextSecondary: "#a1a1aa",
    hintBadgeBackground: "#27272a",
    hintBadgeText: "#d4d4d8",
  },
};

const papanFrost: BoardThemeDefinition = {
  id: "frost",
  name: "Frost UI",
  tagline: "Papan es lembut senada tema aplikasi",
  description:
    "Papan senada tema aplikasi Frost UI: sel kaca es biru pucat, kata terjawab biru lembut, soal biru es pekat.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    boardBackground: "rgba(255,255,255,0.35)",
    background: { gradient: ["#e6eefb", "#dce9f8", "#e8f2f7"] },
    boardBorder: "rgba(255,255,255,0.6)",
    cellActive: "rgba(255,255,255,0.6)",
    cellActiveText: "#2b3a4d",
    cellBorder: "rgba(255,255,255,0.75)",
    cellSelected: "#4f86d6",
    cellSelectedText: "#ffffff",
    cellHighlight: "rgba(255,255,255,0.45)",
    cellHighlightBorder: "#4f86d6",
    cellSolved: "rgba(79,134,214,0.3)",
    cellSolvedText: "#315f9e",
    cellBlocked: "rgba(60,78,100,0.9)",
    cellNumber: "#6b7f96",
    clueBackground: "#4f86d6",
    clueText: "#ffffff",
    clueTextMuted: "rgba(255,255,255,0.85)",
    clueBadgeBackground: "#ffffff",
    clueBadgeText: "#4f86d6",
    clueArrowBackground: "rgba(255,255,255,0.2)",
    clueDivider: "rgba(255,255,255,0.35)",
    hintBackground: "rgba(255,255,255,0.5)",
    hintBorder: "rgba(255,255,255,0.65)",
    hintPrimary: "#4f86d6",
    hintPrimaryText: "#ffffff",
    hintSecondary: "rgba(255,255,255,0.6)",
    hintIcon: "#3a5d8f",
    hintText: "#2b3a4d",
    hintTextSecondary: "#6b7f96",
    hintBadgeBackground: "rgba(255,255,255,0.7)",
    hintBadgeText: "#315f9e",
  },
  dark: {
    boardBackground: "rgba(255,255,255,0.06)",
    background: { gradient: ["#14233a", "#101c2e", "#0f2130"] },
    boardBorder: "rgba(255,255,255,0.18)",
    cellActive: "rgba(255,255,255,0.1)",
    cellActiveText: "#eaf2fb",
    cellBorder: "rgba(255,255,255,0.22)",
    cellSelected: "#7fb1e8",
    cellSelectedText: "#0d1a2b",
    cellHighlight: "rgba(255,255,255,0.07)",
    cellHighlightBorder: "#7fb1e8",
    cellSolved: "rgba(127,177,232,0.28)",
    cellSolvedText: "#aecdf5",
    cellBlocked: "rgba(5,12,24,0.9)",
    cellNumber: "#93a7c0",
    clueBackground: "#7fb1e8",
    clueText: "#0d1a2b",
    clueTextMuted: "rgba(13,26,43,0.75)",
    clueBadgeBackground: "#0d1a2b",
    clueBadgeText: "#7fb1e8",
    clueArrowBackground: "rgba(13,26,43,0.14)",
    clueDivider: "rgba(13,26,43,0.28)",
    hintBackground: "rgba(255,255,255,0.08)",
    hintBorder: "rgba(255,255,255,0.2)",
    hintPrimary: "#7fb1e8",
    hintPrimaryText: "#0d1a2b",
    hintSecondary: "rgba(255,255,255,0.12)",
    hintIcon: "#aecdf5",
    hintText: "#eaf2fb",
    hintTextSecondary: "#93a7c0",
    hintBadgeBackground: "rgba(255,255,255,0.18)",
    hintBadgeText: "#aecdf5",
  },
};

export const BOARD_THEMES: BoardThemeDefinition[] = [
  papanPuitis,
  papanSamudra,
  papanSenja,
  papanHutan,
  papanTinta,
  papanNeon,
  papanNeumorfik,
  papanGlassmorphism,
  papanClaymorphism,
  papanNeoBrutalism,
  papanMinimalist,
  papanFrost,
];

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

const keyboardGlassmorphism: KeyboardThemeDefinition = {
  id: "glassmorphism",
  name: "Glassmorphism",
  tagline: "Keyboard kaca senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Glassmorphism: tombol kaca transparan bercahaya, navigasi ungu.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "rgba(255,255,255,0.3)",
    panelBorder: "rgba(255,255,255,0.4)",
    keyBackground: "rgba(255,255,255,0.55)",
    keyBorder: "rgba(255,255,255,0.6)",
    keyText: "#1e2340",
    specialBackground: "rgba(255,255,255,0.4)",
    background: { gradient: ["#8a7df2", "#6fa8ff", "#e08af0"] },
    navBackground: "rgba(255,255,255,0.55)",
    navBorder: "#6d4aff",
    navText: "#6d4aff",
  },
  dark: {
    panelBackground: "rgba(20,22,55,0.6)",
    panelBorder: "rgba(255,255,255,0.15)",
    keyBackground: "rgba(255,255,255,0.12)",
    keyBorder: "rgba(255,255,255,0.2)",
    keyText: "#f0f2ff",
    specialBackground: "rgba(255,255,255,0.18)",
    background: { gradient: ["#1c1e4d", "#2a1e5e", "#16284d"] },
    navBackground: "rgba(255,255,255,0.12)",
    navBorder: "#9b8cff",
    navText: "#9b8cff",
  },
};

const keyboardClaymorphism: KeyboardThemeDefinition = {
  id: "claymorphism",
  name: "Claymorphism",
  tagline: "Keyboard tanah liat hangat senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Claymorphism: tombol krem clay, navigasi oranye hangat.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#fff4ea",
    panelBorder: "#ecd9cc",
    keyBackground: "#fff7ef",
    keyBorder: "#ecd9cc",
    keyText: "#4a3b33",
    specialBackground: "#ffe4d6",
    background: { gradient: ["#fdeee2", "#f9e2e6", "#efe4f5"] },
    navBackground: "#fff7ef",
    navBorder: "#ff8a5c",
    navText: "#ff8a5c",
  },
  dark: {
    panelBackground: "#3b2d29",
    panelBorder: "#5a453e",
    keyBackground: "#3b2d29",
    keyBorder: "#5a453e",
    keyText: "#f7e9de",
    specialBackground: "#55332f",
    background: { gradient: ["#332522", "#2b1f26", "#241f30"] },
    navBackground: "#3b2d29",
    navBorder: "#ff9e76",
    navText: "#ff9e76",
  },
};

const keyboardNeoBrutalism: KeyboardThemeDefinition = {
  id: "neo-brutalism",
  name: "Neo-Brutalism",
  tagline: "Keyboard blok warna tegas senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Neo-Brutalism: tombol putih berbingkai hitam tebal, hapus merah.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#ffffff",
    panelBorder: "#111111",
    keyBackground: "#ffffff",
    keyBorder: "#111111",
    keyText: "#111111",
    specialBackground: "#ff5d5d",
    navBackground: "#ffffff",
    navBorder: "#111111",
    navText: "#111111",
  },
  dark: {
    panelBackground: "#1f1f1f",
    panelBorder: "#ffffff",
    keyBackground: "#1f1f1f",
    keyBorder: "#ffffff",
    keyText: "#f5f5f5",
    specialBackground: "#ff6b6b",
    navBackground: "#1f1f1f",
    navBorder: "#ffffff",
    navText: "#f5f5f5",
  },
};

const keyboardMinimalist: KeyboardThemeDefinition = {
  id: "minimalist",
  name: "Minimalist UI",
  tagline: "Keyboard bersih & datar senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Minimalist UI: tombol putih polos tanpa hiasan, navigasi hitam.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "#ffffff",
    panelBorder: "#e4e4e7",
    keyBackground: "#ffffff",
    keyBorder: "#e4e4e7",
    keyText: "#18181b",
    specialBackground: "#e4e4e7",
    navBackground: "#ffffff",
    navBorder: "#18181b",
    navText: "#18181b",
  },
  dark: {
    panelBackground: "#171717",
    panelBorder: "#27272a",
    keyBackground: "#171717",
    keyBorder: "#27272a",
    keyText: "#fafafa",
    specialBackground: "#27272a",
    navBackground: "#171717",
    navBorder: "#fafafa",
    navText: "#fafafa",
  },
};

const keyboardFrost: KeyboardThemeDefinition = {
  id: "frost",
  name: "Frost UI",
  tagline: "Keyboard es lembut senada tema aplikasi",
  description:
    "Keyboard senada tema aplikasi Frost UI: tombol kaca es pucat, navigasi biru es.",
  isDefault: false,
  priceLabel: "Gratis",
  light: {
    panelBackground: "rgba(255,255,255,0.4)",
    panelBorder: "rgba(255,255,255,0.55)",
    keyBackground: "rgba(255,255,255,0.6)",
    keyBorder: "rgba(255,255,255,0.75)",
    keyText: "#2b3a4d",
    specialBackground: "rgba(255,255,255,0.45)",
    background: { gradient: ["#e6eefb", "#dce9f8", "#e8f2f7"] },
    navBackground: "rgba(255,255,255,0.6)",
    navBorder: "#4f86d6",
    navText: "#4f86d6",
  },
  dark: {
    panelBackground: "rgba(16,28,46,0.75)",
    panelBorder: "rgba(255,255,255,0.15)",
    keyBackground: "rgba(255,255,255,0.1)",
    keyBorder: "rgba(255,255,255,0.2)",
    keyText: "#eaf2fb",
    specialBackground: "rgba(255,255,255,0.16)",
    background: { gradient: ["#14233a", "#101c2e", "#0f2130"] },
    navBackground: "rgba(255,255,255,0.1)",
    navBorder: "#7fb1e8",
    navText: "#7fb1e8",
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
  keyboardGlassmorphism,
  keyboardClaymorphism,
  keyboardNeoBrutalism,
  keyboardMinimalist,
  keyboardFrost,
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
