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

  /** Ambil kata berdasarkan teks kata — dipakai untuk resolve word_id dari
   *  board lama / snapshot yang dibuat tanpa word_id (word unik di vocabulary). */
  async getByWords(words: string[]): Promise<VocabularyDoc[]> {
    if (words.length === 0) return [];
    const results: VocabularyDoc[] = [];
    for (const chunkIds of chunk(words, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("vocabulary")
        .select(VOCAB_COLUMNS)
        .in("word", chunkIds);
      if (error) {
        throw new Error(`Gagal ambil vocab dari Supabase: ${error.message}`);
      }
      results.push(...((data ?? []) as VocabularyDoc[]));
    }
    return results;
  },

  /**
   * Ambil beberapa kata acak dari seluruh tabel vocabulary (lintas tier).
   * Dipakai tombol "Kata Ajaib": ambil 10 kata dari offset acak, lalu UI
   * memilih satu kata + clue (yang bukan antonim/sinonim) secara acak.
   */
  async getRandomWords(limit = 10): Promise<VocabularyDoc[]> {
    const { count, error: countErr } = await supabase
      .from("vocabulary")
      .select("word_id", { count: "exact", head: true });
    if (countErr) {
      throw new Error(`Gagal menghitung vocab: ${countErr.message}`);
    }
    const total = count ?? 0;
    if (total === 0) return [];
    const maxStart = Math.max(0, total - limit);
    const start = Math.floor(Math.random() * (maxStart + 1));
    const { data, error } = await supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS)
      .order("word_id", { ascending: true })
      .range(start, start + limit - 1);
    if (error) {
      throw new Error(`Gagal ambil vocab acak dari Supabase: ${error.message}`);
    }
    return (data ?? []) as VocabularyDoc[];
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

  /**
   * Fetch vocabulary dari SEMUA tier (1–10) langsung dari Supabase — dipakai
   * pemain dengan XP ≥ 800.000 (PLAN-046): pool kata tidak lagi dibatasi tier.
   *
   * `excludedWordIds` (kata yang sudah pernah ditemukan) tetap dikecualikan DI
   * SISI SERVER (PostgREST `not.in`, di-chunk) — aturan word_discoveries tidak
   * berubah: kata yang sudah ditemukan tidak muncul lagi dari tier mana pun.
   * Tanpa cache (daftar eksklusi berubah seiring pemain menyelesaikan kata).
   */
  async getAllTiersFromCloud(excludedWordIds: string[] = []): Promise<VocabularyDoc[]> {
    if (excludedWordIds.length > 0) {
      let result: VocabularyDoc[] | null = null;
      for (const chunkIds of chunk(excludedWordIds, CHUNK_SIZE)) {
        const { data, error } = await supabase
          .from("vocabulary")
          .select(VOCAB_COLUMNS)
          .not("word_id", "in", `(${chunkIds.join(",")})`);
        if (error) {
          throw new Error(`Gagal ambil vocab semua tier dari Supabase: ${error.message}`);
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

    const { data, error } = await supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS);
    if (error) {
      throw new Error(`Gagal ambil vocab semua tier dari Supabase: ${error.message}`);
    }
    return (data ?? []) as VocabularyDoc[];
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

  /**
   * Simpan soal-soal hasil generate Main Mode AI ke tabel vocabulary
   * (RPC insert_ai_vocabulary — security definer). Kata yang sudah terdaftar
   * (word sama) dilewati; hanya kata baru yang masuk. Tidak memblokir jalannya
   * game — panggil fire-and-forget setelah kata AI diterima.
   * @returns jumlah kata BARU yang berhasil disimpan.
   */
  async saveAiWords(
    words: Array<{
      word: string;
      clue_1: string;
      clue_2?: string;
      tier_level: number;
    }>,
  ): Promise<number> {
    if (words.length === 0) return 0;
    const { data, error } = await supabase.rpc("insert_ai_vocabulary", {
      p_words: words,
    });
    if (error) {
      throw new Error(`Gagal simpan soal AI ke database: ${error.message}`);
    }
    return (data ?? 0) as number;
  },
};
