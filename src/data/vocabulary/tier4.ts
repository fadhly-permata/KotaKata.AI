// Tier 4 — 1000 kata asli KBBI (Kamus Besar Bahasa Indonesia), urut berdasarkan frekuensi.
// Isi terbagi ke 3 part file agar mudah dikelola dan diverifikasi per bagian.
// Format tuple: [kata, clue_1 (penjelasan utama), clue_2 (penjelasan lain), clue_3 (sinonim/antonim)].
import { TIER_4_WORDS_PART_1 } from "./tier4-part1";
import { TIER_4_WORDS_PART_2 } from "./tier4-part2";
import { TIER_4_WORDS_PART_3 } from "./tier4-part3";

export const TIER_4_WORDS: [string, string, string, string][] = [
  ...TIER_4_WORDS_PART_1,
  ...TIER_4_WORDS_PART_2,
  ...TIER_4_WORDS_PART_3,
];
