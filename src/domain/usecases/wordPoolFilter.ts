import type { WordCandidate, WordPoolFilterParams } from "../entities/board";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import type { VocabularyDoc } from "../../data/models/schemas";

/**
 * Selects a pool of eligible words for board generation:
 * 1. Filter by player's tier level
 * 2. Exclude ALL already-discovered words — DI SISI SERVER (Supabase `not.in`),
 *    lintas tier: kata apa pun yang pernah ditemukan user ini (word_discoveries)
 *    tidak akan pernah muncul lagi di papan mana pun, dari tier mana pun.
 * 3. TANPA fallback ke tier lain / tanpa kata demo: kalau pool tier ini habis
 *    atau query gagal, error dilempar — pemanggil menampilkan pesan error.
 *    Tidak ada jalur yang bisa memunculkan ulang kata yang sudah ditemukan.
 */
export async function selectWordPool(
  params: WordPoolFilterParams,
): Promise<WordCandidate[]> {
  const { playerTier, excludedWordIds } = params;

  const candidates = await vocabularyRepository.getByTierFromCloud(
    playerTier,
    excludedWordIds,
  );

  // Filter klien sebagai pengaman ganda (jaga-jaga data dari server tidak
  // konsisten) — bukan fallback, hanya verifikasi tambahan.
  const filtered =
    excludedWordIds.length > 0
      ? candidates.filter((w) => !excludedWordIds.includes(w.word_id))
      : candidates;

  if (filtered.length === 0) {
    throw new Error("Tidak ada kosakata yang tersedia — coba lagi nanti.");
  }

  return filtered.map(toCandidate);
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
