import type { WordCandidate, WordPoolFilterParams } from "../entities/board";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import type { VocabularyDoc } from "../../data/models/schemas";

/**
 * Selects a pool of eligible words for board generation:
 * 1. Filter by player's tier level — ATAU semua tier (1–10) bila `allTiers`
 *    aktif (XP ≥ 800.000).
 * 2. XP < 800.000: exclude ALL already-discovered words DI SISI SERVER
 *    (Supabase `not.in`) — kata yang pernah ditemukan user ini tidak muncul lagi.
 *    XP ≥ 800.000 (PLAN-095, arahan pemilik): TANPA eksklusi — boleh ketemu
 *    soal apa pun dari tier mana pun.
 * 3. TANPA fallback ke tier lain / tanpa kata demo: kalau pool habis atau query
 *    gagal, error dilempar — pemanggil menampilkan pesan error.
 */
export async function selectWordPool(
  params: WordPoolFilterParams,
): Promise<WordCandidate[]> {
  const { playerTier, excludedWordIds, allTiers } = params;

  // XP ≥ 800.000 → pool lintas tier (1–10) TANPA eksklusi; XP < 800.000 →
  // satu tier + exclude kata yang sudah ditemukan (`not.in` server-side).
  const candidates = allTiers
    ? await vocabularyRepository.getAllTiersFromCloud([])
    : await vocabularyRepository.getByTierFromCloud(playerTier, excludedWordIds);

  // Filter klien sebagai pengaman ganda — hanya untuk mode tier tunggal
  // (mode allTiers memang tanpa eksklusi).
  const filtered =
    !allTiers && excludedWordIds.length > 0
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
