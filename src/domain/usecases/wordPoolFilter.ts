import type { WordCandidate, WordPoolFilterParams } from "../entities/board";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import type { VocabularyDoc } from "../../data/models/schemas";

/**
 * Selects a pool of eligible words for board generation:
 * 1. Filter by player's tier level
 * 2. Exclude already-discovered words
 * 3. Fallback to tier-1 if pool is too small
 */
export async function selectWordPool(
  params: WordPoolFilterParams,
): Promise<WordCandidate[]> {
  const { playerTier, excludedWordIds } = params;

  let candidates = await loadWordsByTier(playerTier);

  // Exclude discovered words
  if (excludedWordIds.length > 0) {
    candidates = candidates.filter((w) => !excludedWordIds.includes(w.word_id));
  }

  // If pool too small, fallback to one tier below
  if (candidates.length < 10 && playerTier > 1) {
    const fallback = await loadWordsByTier(playerTier - 1);
    const fallbackFiltered = fallback.filter(
      (w) => !excludedWordIds.includes(w.word_id) && !candidates.find((c) => c.word_id === w.word_id),
    );
    candidates = [...candidates, ...fallbackFiltered];
  }

  return candidates.map(toCandidate);
}

/**
 * Load words straight from Supabase (bukan seed RxDB) biar soal selalu fresh.
 * Kalau cloud gagal (offline / error), fallback ke database lokal supaya
 * permainan tetap bisa jalan.
 */
async function loadWordsByTier(tier: number): Promise<VocabularyDoc[]> {
  try {
    return await vocabularyRepository.getByTierFromCloud(tier);
  } catch (err) {
    console.warn("Supabase vocab fetch gagal, pakai seed lokal:", err);
    return vocabularyRepository.getByTier(tier);
  }
}

function toCandidate(doc: VocabularyDoc): WordCandidate {
  return {
    word: doc.word,
    word_id: doc.word_id,
    clue_1: doc.clue_1,
    clue_2: doc.clue_2,
    clue_3: doc.clue_3,
    tier_level: doc.tier_level,
  };
}

/**
 * Get discovered word IDs for a user (for exclusion filter).
 */
export async function getDiscoveredWordIds(userId: string): Promise<string[]> {
  return wordDiscoveryRepository.getDiscoveredWordIds(userId);
}
