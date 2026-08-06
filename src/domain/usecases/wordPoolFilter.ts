import type { WordCandidate, WordPoolFilterParams } from "../entities/board";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import type { VocabularyDoc } from "../../data/models/schemas";

/**
 * Selects a pool of eligible words for board generation:
 * 1. Filter by player's tier level
 * 2. Exclude already-discovered words — DI SISI SERVER (Supabase `not.in`),
 *    jadi soal tidak pernah mengulang kata yang sudah ada di "Sejarah Saya"
 * 3. Fallback to one tier below if pool is too small
 */
export async function selectWordPool(
  params: WordPoolFilterParams,
): Promise<WordCandidate[]> {
  const { playerTier, excludedWordIds } = params;

  let candidates = await loadWordsByTier(playerTier, excludedWordIds);

  // Filter klien tetap dipertahankan sebagai pengaman ganda (mis. fallback
  // tanpa eksklusi server saat cloud bermasalah).
  if (excludedWordIds.length > 0) {
    candidates = candidates.filter((w) => !excludedWordIds.includes(w.word_id));
  }

  // If pool too small, fallback to one tier below
  if (candidates.length < 10 && playerTier > 1) {
    const fallback = await loadWordsByTier(playerTier - 1, excludedWordIds);
    const fallbackFiltered = fallback.filter(
      (w) => !excludedWordIds.includes(w.word_id) && !candidates.find((c) => c.word_id === w.word_id),
    );
    candidates = [...candidates, ...fallbackFiltered];
  }

  if (candidates.length === 0) {
    throw new Error("Tidak ada kosakata yang tersedia — coba lagi nanti.");
  }

  return candidates.map(toCandidate);
}

/**
 * Load words straight from Supabase dengan eksklusi kata yang sudah ditemukan.
 * Kalau eksklusi server gagal (offline / error), fallback: fetch tanpa
 * eksklusi lalu saring di klien. Kalau cloud total gagal, kembalikan daftar
 * kosong — pemanggil (GameScreen) akan memakai kata demo.
 */
async function loadWordsByTier(
  tier: number,
  excludedWordIds: string[],
): Promise<VocabularyDoc[]> {
  try {
    return await vocabularyRepository.getByTierFromCloud(tier, excludedWordIds);
  } catch (err) {
    console.warn("Supabase vocab fetch (dengan eksklusi) gagal — coba tanpa eksklusi:", err);
  }
  try {
    const all = await vocabularyRepository.getByTierFromCloud(tier);
    if (excludedWordIds.length === 0) return all;
    const excluded = new Set(excludedWordIds);
    return all.filter((w) => !excluded.has(w.word_id));
  } catch (err) {
    console.warn("Supabase vocab fetch gagal total:", err);
    return [];
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
 * Get discovered word IDs for a user (for exclusion filter) — dibaca dari
 * cloud (Supabase), sumber kebenaran lintas sesi.
 */
export async function getDiscoveredWordIds(userId: string): Promise<string[]> {
  return wordDiscoveryRepository.getDiscoveredWordIds(userId);
}
