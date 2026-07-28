/** XP thresholds for each tier (cumulative) */
export const TIER_THRESHOLDS = [
  0,        // Tier 1 — Eja Awal
  200,      // Tier 2 — Desau Saujana
  500,      // Tier 3 — Rima Gerimis
  1000,     // Tier 4 — Untai Aksara
  1800,     // Tier 5 — Gema Diksi
  3000,     // Tier 6 — Raut Metafora
  5000,     // Tier 7 — Bait Hening
  8000,     // Tier 8 — Madah Sanubari
  12000,    // Tier 9 — Risalah Langit
  20000,    // Tier 10 — Keabadian Seloka
];

export const TIER_NAMES = [
  "Eja Awal",
  "Desau Saujana",
  "Rima Gerimis",
  "Untai Aksara",
  "Gema Diksi",
  "Raut Metafora",
  "Bait Hening",
  "Madah Sanubari",
  "Risalah Langit",
  "Keabadian Seloka",
];

export const TIER_PHILOSOPHIES = [
  "Langkah paling mula; saat jemari baru belajar meraba bentuk huruf dan mengeja bunyi yang sederhana.",
  "Kata-kata mulai terdengar seperti angin sepoi-sepoi di kejauhan, membawa makna yang mulai samar-samar dikenali.",
  "Ketukan huruf yang mulai beraturan, berjatuhan menciptakan irama indah layaknya rintik hujan di atas atap pikiran.",
  "Kemampuan merangkai huruf demi huruf yang tadinya terberai menjadi jalinan kata yang memiliki nyawa.",
  "Pilihan kata yang tidak lagi biasa; mulai memahami resonansi dari kata-kata indah yang jarang terucap.",
  "Bahasa dipahami melampaui bentuk fisiknya; mampu melihat bayangan kiasan dan analogi yang tersembunyi di balik teks.",
  "Masuk ke ruang kontemplasi mendalam, di mana kesunyian pun mampu melahirkan kalimat-kalimat yang sarat akan makna.",
  "Pujian dan ungkapan bahasa yang mengalir langsung dari kedalaman rasa, menyentuh inti dari setiap teka-teki kehidupan.",
  "Lembaran-lembaran pemikiran tingkat tinggi; mencerminkan kecerdasan luar biasa dalam merumuskan dan membaca sandi bahasa.",
  "Puncak tertinggi kebahasaan; ia tidak lagi sekadar membaca kata, melainkan telah menjadi bagian dari keabadian karya sastra yang luhur.",
];

export const TIER_COLORS = [
  "#8B9DC3", // Eja Awal — soft steel blue
  "#7EB89D", // Desau Saujana — sage green
  "#6BA3D6", // Rima Gerimis — rain blue
  "#D4A56A", // Untai Aksara — warm gold
  "#C77DBA", // Gema Diksi — muted magenta
  "#E8926B", // Raut Metafora — terracotta
  "#6B8FBF", // Bait Hening — deep sky
  "#C0395A", // Madah Sanubari — heartfelt crimson
  "#5B4FB4", // Risalah Langit — celestial purple
  "#D4AF37", // Keabadian Seloka — eternal gold
];

/** XP multipliers per tier for correct words */
const TIER_XP_MULTIPLIER = [1, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0];
const BASE_XP_PER_WORD = 25;

/** Calculate XP gained for solving a word at the current tier */
export function calcXpGain(wordLength: number, currentTier: number): number {
  const tierIndex = Math.max(0, Math.min(currentTier - 1, 9));
  const multiplier = TIER_XP_MULTIPLIER[tierIndex];
  const lengthBonus = Math.max(0, wordLength - 3) * 5;
  return Math.round((BASE_XP_PER_WORD + lengthBonus) * multiplier);
}

/** Determine tier from cumulative XP */
export function calcTier(totalXp: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= TIER_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** Get XP progress within current tier (0–1) */
export function calcTierProgress(totalXp: number): number {
  const tier = calcTier(totalXp);
  const currentThreshold = TIER_THRESHOLDS[Math.max(0, tier - 1)];
  const nextThreshold = TIER_THRESHOLDS[Math.min(tier, TIER_THRESHOLDS.length - 1)];
  if (nextThreshold === currentThreshold) return 1;
  return (totalXp - currentThreshold) / (nextThreshold - currentThreshold);
}

/** XP penalty constants */
export const XP_PENALTY_CLUE_2 = 50;
export const XP_PENALTY_CLUE_3 = 100;
export const XP_PENALTY_REVEAL = 75;
