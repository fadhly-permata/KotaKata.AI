// Aggregator vocabulary — sumber kebenaran untuk app.
// Semua kata berasal dari KBBI asli (Kamus Besar Bahasa Indonesia), dibuat oleh
// scripts/build-kbbi-seed.mjs. Format tuple: [kata, clue_1 (definisi KBBI),
// clue_2 (kelas + huruf akhir)] — clue_3 (hint huruf pertama & panjang) digenerate
// di sini dengan format konsisten.
import { TIER_1_WORDS } from "./tier1";
import { TIER_2_WORDS } from "./tier2";
import { TIER_3_WORDS } from "./tier3";
import { TIER_4_WORDS } from "./tier4";
import { TIER_5_WORDS } from "./tier5";
import { TIER_6_WORDS } from "./tier6";
import { TIER_7_WORDS } from "./tier7";
import { TIER_8_WORDS } from "./tier8";
import { TIER_9_WORDS } from "./tier9";
import { TIER_10_WORDS } from "./tier10";
import type { VocabularyDoc } from "../models/schemas";

const WORDS_PER_TIER = 1000;

/** Expand compact [word, clue_1, clue_2] tuples into full VocabularyDoc items. */
function expandTier(tier: number, tuples: [string, string, string][]): VocabularyDoc[] {
  return tuples.slice(0, WORDS_PER_TIER).map(([word, clue_1, clue_2], i) => ({
    word_id: `t${tier}-${String(i + 1).padStart(3, "0")}`,
    word,
    clue_1,
    clue_2,
    clue_3: `Diawali huruf ${word[0]}, terdiri dari ${word.length} huruf`,
    tier_level: tier,
    created_at: new Date().toISOString(),
  }));
}

const TIERS: VocabularyDoc[] = [
  ...expandTier(1, TIER_1_WORDS),
  ...expandTier(2, TIER_2_WORDS),
  ...expandTier(3, TIER_3_WORDS),
  ...expandTier(4, TIER_4_WORDS),
  ...expandTier(5, TIER_5_WORDS),
  ...expandTier(6, TIER_6_WORDS),
  ...expandTier(7, TIER_7_WORDS),
  ...expandTier(8, TIER_8_WORDS),
  ...expandTier(9, TIER_9_WORDS),
  ...expandTier(10, TIER_10_WORDS),
];

/** Jamin tidak ada kata duplikat di seluruh seed (keep yang pertama). */
function dedupe(list: VocabularyDoc[]): VocabularyDoc[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });
}

export const VOCABULARY_SEED: VocabularyDoc[] = dedupe(TIERS);
