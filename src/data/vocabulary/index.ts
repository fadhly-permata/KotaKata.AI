// Aggregator vocabulary — sumber kebenaran untuk app.
// Tier baru ditulis sebagai tuple kompak [kata, clue_1, clue_2]; clue_3
// (hint huruf pertama & panjang) digenerate di sini dengan format konsisten.
import { TIER_1_WORDS_A } from "./tier1a";
import { TIER_1_WORDS_B } from "./tier1b";
import { VOCABULARY_SEED as LEGACY_SEED } from "../sources/vocabularySeed";
import type { VocabularyDoc } from "../models/schemas";

const WORDS_PER_TIER = 1000;

/** Expand compact [word, clue_1, clue_2] tuples into full VocabularyDoc items. */
function expandTier(
  tier: number,
  tuples: [string, string, string][],
): VocabularyDoc[] {
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

// Tier 1 — 1000 kata baru (fase 1)
const TIER_1: VocabularyDoc[] = expandTier(1, [...TIER_1_WORDS_A, ...TIER_1_WORDS_B]);

// Tier 2–10 — data lama dari vocabularySeed.ts (akan diperluas ke 1000/tier di fase berikutnya)
const LEGACY_TIERS_2_10: VocabularyDoc[] = LEGACY_SEED.filter(
  (w) => !w.word_id.startsWith("t1-"),
);

/** Jamin tidak ada kata duplikat di seluruh seed (keep yang pertama). */
function dedupe(list: VocabularyDoc[]): VocabularyDoc[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });
}

export const VOCABULARY_SEED: VocabularyDoc[] = dedupe([
  ...TIER_1,
  ...LEGACY_TIERS_2_10,
]);
