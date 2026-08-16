// Aggregator vocabulary — sumber kebenaran untuk app.
// Semua kata berasal dari KBBI asli (Kamus Besar Bahasa Indonesia), dibuat oleh
// scripts/vocab/build-kbbi-seed.mjs. Format tuple: [kata, clue_1 (definisi KBBI),
// clue_2 (petunjuk improvisasi), clue_3 (pola huruf)] — semua clue digenerate
// oleh builder sehingga app & cloud selalu konsisten.
import { TIER_1_WORDS } from "./tier1";
import { TIER_1_WORDS_PART_1 } from "./tier1-part1";
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

type WordTuple = [string, string, string, string];

/** Expand compact [word, clue_1, clue_2, clue_3] tuples into full VocabularyDoc items. */
function expandTier(tier: number, tuples: WordTuple[]): VocabularyDoc[] {
  return tuples.slice(0, WORDS_PER_TIER).map(([word, clue_1, clue_2, clue_3], i) => ({
    word_id: `t${tier}-${String(i + 1).padStart(3, "0")}`,
    word,
    clue_1,
    clue_2,
    clue_3,
    tier_level: tier,
    created_at: new Date().toISOString(),
  }));
}

const TIERS: VocabularyDoc[] = [
  ...expandTier(1, [...TIER_1_WORDS, ...TIER_1_WORDS_PART_1]),
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
