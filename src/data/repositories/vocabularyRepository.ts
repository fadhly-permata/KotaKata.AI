import { getDatabase } from "../sources/database";
import { supabase } from "../sources/supabase";
import type { VocabularyDoc } from "../models/schemas";

/**
 * Short-lived in-memory cache (per tier) for cloud fetches, so soal stays
 * fresh (max 5 minutes old) without hammering the REST API on every
 * board generation.
 */
const CLOUD_TTL_MS = 5 * 60 * 1000;
const cloudCache = new Map<number, { fetchedAt: number; words: VocabularyDoc[] }>();

export const vocabularyRepository = {
  async getByTier(tierLevel: number): Promise<VocabularyDoc[]> {
    return getDatabase()
      .vocabulary.find({
        selector: { tier_level: { $eq: tierLevel } },
      })
      .exec();
  },

  /**
   * Fetch vocabulary for a tier straight from Supabase (REST/PostgREST).
   * Cached in memory for up to 5 minutes per tier so board generation is
   * always backed by the freshest cloud data without spamming requests.
   */
  async getByTierFromCloud(tierLevel: number): Promise<VocabularyDoc[]> {
    const cached = cloudCache.get(tierLevel);
    if (cached && Date.now() - cached.fetchedAt < CLOUD_TTL_MS) {
      return cached.words;
    }

    const { data, error } = await supabase
      .from("vocabulary")
      .select("word_id, word, clue_1, clue_2, clue_3, tier_level, created_at")
      .eq("tier_level", tierLevel);

    if (error) {
      throw new Error(`Gagal ambil vocab tier ${tierLevel} dari Supabase: ${error.message}`);
    }

    const words = (data ?? []) as VocabularyDoc[];
    cloudCache.set(tierLevel, { fetchedAt: Date.now(), words });
    return words;
  },

  /**
   * Ambil banyak kata sekaligus langsung dari Supabase (dipakai riwayat
   * penemuan untuk join clue kata-kata dari cloud).
   */
  async getByIdsFromCloud(wordIds: string[]): Promise<VocabularyDoc[]> {
    if (wordIds.length === 0) return [];
    const { data, error } = await supabase
      .from("vocabulary")
      .select("word_id, word, clue_1, clue_2, clue_3, tier_level, created_at")
      .in("word_id", wordIds);
    if (error) {
      throw new Error(`Gagal ambil vocab dari Supabase: ${error.message}`);
    }
    return (data ?? []) as VocabularyDoc[];
  },

  /** Drop the cloud cache (e.g. after a data refresh). */
  clearCloudCache(): void {
    cloudCache.clear();
  },

  async getByTierRange(minTier: number, maxTier: number): Promise<VocabularyDoc[]> {
    return getDatabase()
      .vocabulary.find({
        selector: { tier_level: { $gte: minTier, $lte: maxTier } },
      })
      .exec();
  },

  async getById(wordId: string): Promise<VocabularyDoc | null> {
    return (await getDatabase().vocabulary.findOne(wordId).exec()) ?? null;
  },

  /** Ambil banyak kata sekaligus (dipakai riwayat penemuan untuk join clue). */
  async getByIds(wordIds: string[]): Promise<VocabularyDoc[]> {
    if (wordIds.length === 0) return [];
    return getDatabase()
      .vocabulary.find({
        selector: { word_id: { $in: wordIds } },
      })
      .exec();
  },

  async bulkInsert(words: VocabularyDoc[]): Promise<void> {
    await getDatabase().vocabulary.bulkInsert(words);
  },

  async count(): Promise<number> {
    return getDatabase().vocabulary.count().exec();
  },
};
