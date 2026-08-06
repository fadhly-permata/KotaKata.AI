import { supabase } from "../sources/supabase";
import type { VocabularyDoc } from "../models/schemas";

/**
 * Short-lived in-memory cache (per tier) for cloud fetches, jadi soal tetap
 * fresh (maks 5 menit) tanpa membanjiri REST API tiap kali generate papan.
 * Cache hanya dipakai saat tidak ada eksklusi kata — kalau ada daftar kata
 * yang harus dikecualikan, selalu fetch fresh dari cloud.
 */
const CLOUD_TTL_MS = 5 * 60 * 1000;
const CHUNK_SIZE = 500;
const cloudCache = new Map<number, { fetchedAt: number; words: VocabularyDoc[] }>();

const VOCAB_COLUMNS = "word_id, word, clue_1, clue_2, clue_3, tier_level, created_at";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const vocabularyRepository = {
  async getByTier(tierLevel: number): Promise<VocabularyDoc[]> {
    return vocabularyRepository.getByTierFromCloud(tierLevel);
  },

  /**
   * Fetch vocabulary untuk satu tier langsung dari Supabase (REST/PostgREST).
   *
   * Kalau `excludedWordIds` diisi, kata-kata itu dikecualikan DI SISI SERVER
   * (PostgREST `not.in`, di-chunk biar aman dari batas panjang URL). Dengan
   * begitu soal yang di-fetch tidak akan mengulang kata yang sudah ada di
   * "Sejarah Saya", dan tier tetap dihormati.
   */
  async getByTierFromCloud(
    tierLevel: number,
    excludedWordIds: string[] = [],
  ): Promise<VocabularyDoc[]> {
    if (excludedWordIds.length > 0) {
      // Eksklusi server-side, tanpa cache — daftar eksklusi berubah seiring
      // pemain menyelesaikan kata, jadi cache per tier tidak valid di sini.
      let result: VocabularyDoc[] | null = null;
      for (const chunkIds of chunk(excludedWordIds, CHUNK_SIZE)) {
        const { data, error } = await supabase
          .from("vocabulary")
          .select(VOCAB_COLUMNS)
          .eq("tier_level", tierLevel)
          .not("word_id", "in", `(${chunkIds.join(",")})`);
        if (error) {
          throw new Error(`Gagal ambil vocab tier ${tierLevel} dari Supabase: ${error.message}`);
        }
        const words = (data ?? []) as VocabularyDoc[];
        if (result === null) {
          result = words;
        } else {
          // Iritan tiap chunk: kata tersisa harus lolos SEMUA chunk.
          const keep = new Set(words.map((w) => w.word_id));
          result = result.filter((w) => keep.has(w.word_id));
        }
      }
      return result ?? [];
    }

    const cached = cloudCache.get(tierLevel);
    if (cached && Date.now() - cached.fetchedAt < CLOUD_TTL_MS) {
      return cached.words;
    }

    const { data, error } = await supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS)
      .eq("tier_level", tierLevel);

    if (error) {
      throw new Error(`Gagal ambil vocab tier ${tierLevel} dari Supabase: ${error.message}`);
    }

    const words = (data ?? []) as VocabularyDoc[];
    cloudCache.set(tierLevel, { fetchedAt: Date.now(), words });
    return words;
  },

  /** Ambil banyak kata sekaligus langsung dari Supabase (dipakai riwayat penemuan). */
  async getByIdsFromCloud(wordIds: string[]): Promise<VocabularyDoc[]> {
    if (wordIds.length === 0) return [];
    const results: VocabularyDoc[] = [];
    for (const chunkIds of chunk(wordIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("vocabulary")
        .select(VOCAB_COLUMNS)
        .in("word_id", chunkIds);
      if (error) {
        throw new Error(`Gagal ambil vocab dari Supabase: ${error.message}`);
      }
      results.push(...((data ?? []) as VocabularyDoc[]));
    }
    return results;
  },

  /** Ambil banyak kata (alias cloud — tidak ada DB lokal lagi). */
  async getByIds(wordIds: string[]): Promise<VocabularyDoc[]> {
    return vocabularyRepository.getByIdsFromCloud(wordIds);
  },

  async getById(wordId: string): Promise<VocabularyDoc | null> {
    const { data, error } = await supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS)
      .eq("word_id", wordId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil vocab dari Supabase: ${error.message}`);
    }
    return (data ?? null) as VocabularyDoc | null;
  },

  async getByTierRange(minTier: number, maxTier: number): Promise<VocabularyDoc[]> {
    const { data, error } = await supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS)
      .gte("tier_level", minTier)
      .lte("tier_level", maxTier);
    if (error) {
      throw new Error(`Gagal ambil vocab dari Supabase: ${error.message}`);
    }
    return (data ?? []) as VocabularyDoc[];
  },

  /** Drop the cloud cache (e.g. after a data refresh). */
  clearCloudCache(): void {
    cloudCache.clear();
  },
};
