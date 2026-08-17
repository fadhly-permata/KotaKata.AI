import { supabase } from "../sources/supabase";
import { loggerWarn } from "../../utils/logger";
import { vocabularyRepository } from "./vocabularyRepository";
import type { WordDiscoveryDoc } from "../models/schemas";

const DISCOVERY_COLUMNS = "discovery_id, user_id, word_id, discovered_at";

/** Kapasitas maksimal word_id hasil pencarian yang dipakai memfilter discovery. */
const SEARCH_CAP = 500;

export interface DiscoveryQuery {
  /** Filter teks: discovery difilter ke kata/petunjuk di vocabulary yang mengandung teks ini (server-side ilike). */
  search?: string;
  /** Batas baris per halaman (PostgREST range). */
  limit?: number;
  /** Offset baris untuk pagination. */
  offset?: number;
}

/**
 * Cari word_id di vocabulary yang cocok dengan teks pencarian (word + clue_1 + clue_2
 * + clue_3, case-insensitive). Mengembalikan null kalau tanpa filter, [] kalau tidak
 * ada yang cocok. Karakter yang bisa merusak sintaks PostgREST or() (koma, wildcard,
 * kutip) dibersihkan supaya pencarian tetap literal.
 */
async function resolveSearchWordIds(search?: string): Promise<string[] | null> {
  const q = (search ?? "").replace(/[,*'"]/g, " ").trim();
  if (!q) return null;
  const { data, error } = await supabase
    .from("vocabulary")
    .select("word_id")
    .or(`word.ilike.*${q}*,clue_1.ilike.*${q}*,clue_2.ilike.*${q}*,clue_3.ilike.*${q}*`)
    .limit(SEARCH_CAP);
  if (error) {
    throw new Error(`Gagal mencari kata dari Supabase: ${error.message}`);
  }
  return (data ?? []).map((d) => d.word_id as string);
}

/**
 * Antrean write discovery (serial). Semua pemanggilan recordDiscoveriesForWords
 * dijalankan berurutan — dedup cloud tidak pernah race dengan write lain
 * (mis. tracker kata baru vs backfill saat board selesai), jadi tidak ada
 * duplikat discovery_id di cloud.
 */
let pendingDiscoveryWrites: Promise<void> = Promise.resolve();

export const wordDiscoveryRepository = {
  /** Baca riwayat langsung dari Supabase — sumber kebenaran lintas sesi. */
  async getByUser(userId: string): Promise<WordDiscoveryDoc[]> {
    return wordDiscoveryRepository.getByUserFromCloud(userId);
  },

  /**
   * Baca riwayat langsung dari Supabase — sumber kebenaran lintas sesi.
   * Mendukung pagination server-side (limit/offset) dan filter pencarian
   * (search dicocokkan ke word/clue di vocabulary, lalu discovery difilter
   * lewat word_id).
   */
  async getByUserFromCloud(
    userId: string,
    query: DiscoveryQuery = {},
  ): Promise<WordDiscoveryDoc[]> {
    const searchIds = await resolveSearchWordIds(query.search);
    if (searchIds !== null && searchIds.length === 0) return [];

    let builder = supabase
      .from("word_discoveries")
      .select(DISCOVERY_COLUMNS)
      .eq("user_id", userId);
    if (searchIds !== null) {
      builder = builder.in("word_id", searchIds);
    }
    if (typeof query.limit === "number") {
      const start = query.offset ?? 0;
      builder = builder.range(start, start + query.limit - 1);
    }
    builder = builder.order("discovered_at", { ascending: false });

    const { data, error } = await builder;
    if (error) {
      throw new Error(`Gagal ambil riwayat dari Supabase: ${error.message}`);
    }
    return (data ?? []) as WordDiscoveryDoc[];
  },

  /** Cek duplikat di cloud: apakah (user, word) sudah tercatat lintas sesi. */
  async getByUserAndWordFromCloud(
    userId: string,
    wordId: string,
  ): Promise<WordDiscoveryDoc | null> {
    const { data, error } = await supabase
      .from("word_discoveries")
      .select(DISCOVERY_COLUMNS)
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal cek riwayat di Supabase: ${error.message}`);
    }
    return (data ?? null) as WordDiscoveryDoc | null;
  },

  async getByUserAndWord(
    userId: string,
    wordId: string,
  ): Promise<WordDiscoveryDoc | null> {
    return wordDiscoveryRepository.getByUserAndWordFromCloud(userId, wordId);
  },

  async add(discovery: WordDiscoveryDoc): Promise<void> {
    const { error } = await supabase
      .from("word_discoveries")
      .upsert(
        {
          discovery_id: discovery.discovery_id,
          user_id: discovery.user_id,
          word_id: discovery.word_id,
          discovered_at: discovery.discovered_at,
        },
        { onConflict: "discovery_id" },
      );
    if (error) {
      throw new Error(`Gagal simpan riwayat ke Supabase: ${error.message}`);
    }
  },

  /**
   * Catat kata-kata yang baru terjawab ke riwayat penemuan:
   * dedup batch (baca daftar word_id yang sudah ada SEKALI, lalu upsert
   * sekaligus) — jauh lebih andal daripada cek per kata dengan maybeSingle
   * yang diam-diam error kalau ada duplikat baris lama di cloud.
   * Push langsung ke Supabase; write diantre serial biar tidak ada duplikat.
   * Aman dipanggil berulang / untuk kata yang sudah tercatat (di-skip).
   *
   * Kata tanpa word_id (mis. board lama / snapshot yang di-generate sebelum
   * generator membawa word_id) tetap direkam: word_id di-resolve dari teks
   * kata lewat tabel vocabulary. Jadi SEMUA kata yang dijawab di papan pasti
   * masuk riwayat — 10 soal = 10 baris, 5 soal = 5 baris.
   */
  async recordDiscoveriesForWords(
    userId: string,
    words: { word_id?: string; word?: string }[],
  ): Promise<void> {
    const task = (async () => {
      try {
        // Resolve word_id yang hilang dari teks kata (word unik di vocabulary).
        let candidates: string[] = words
          .map((w) => w.word_id)
          .filter((id): id is string => !!id);
        const textOnly = words.filter((w) => !w.word_id && !!w.word);
        if (textOnly.length > 0) {
          try {
            const docs = await vocabularyRepository.getByWords(
              textOnly.map((w) => w.word as string),
            );
            const byWord = new Map(docs.map((d) => [d.word, d.word_id]));
            const resolved = textOnly
              .map((w) => byWord.get(w.word as string))
              .filter((id): id is string => !!id);
            candidates = [...candidates, ...resolved];
          } catch (err) {
            // Gagal resolve — kata tanpa word_id terpaksa dilewati, tapi
            // jangan sampai menggagalkan kata-kata yang punya word_id.
            loggerWarn("Gagal resolve word_id dari teks kata", err);
          }
        }
        if (candidates.length === 0) return;

        // Dedup batch: ambil semua word_id yang sudah tercatat user ini sekali,
        // filter di klien — bukan N+1 query maybeSingle.
        let existingIds: Set<string>;
        try {
          existingIds = new Set(await wordDiscoveryRepository.getDiscoveredWordIds(userId));
        } catch (err) {
          loggerWarn("Gagal membaca daftar discovery yang sudah ada — batal rekam", err);
          return;
        }

        const now = new Date().toISOString();
        const seen = new Set<string>();
        const fresh: { discovery_id: string; user_id: string; word_id: string; discovered_at: string }[] = [];
        for (const wordId of candidates) {
          if (seen.has(wordId) || existingIds.has(wordId)) continue;
          seen.add(wordId);
          fresh.push({
            discovery_id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${wordId}`,
            user_id: userId,
            word_id: wordId,
            discovered_at: now,
          });
        }
        if (fresh.length === 0) return;

        const { error } = await supabase.from("word_discoveries").upsert(fresh, {
          onConflict: "discovery_id",
        });
        if (error) {
          loggerWarn(`Gagal merekam discovery (${fresh.length} kata)`, error);
        }
      } catch (err) {
        // Exception tak terduga (bukan error object Supabase) — tetap dicatat,
        // jangan sampai gagal diam-diam di antrean serial.
        loggerWarn("Exception saat merekam discovery", err);
      }
    })();
    pendingDiscoveryWrites = pendingDiscoveryWrites.then(() => task, () => task);
    return pendingDiscoveryWrites;
  },

  /** Tunggu semua pencatatan discovery yang sedang berjalan selesai. */
  async flushDiscoveries(): Promise<void> {
    await pendingDiscoveryWrites;
  },

  /**
   * Ambil daftar word_id yang sudah ditemukan user langsung dari cloud —
   * dipakai untuk eksklusi soal saat generate papan (tetap memperhatikan tier).
   * `limit` opsional (PLAN-050): ambil N kata PALING BARU (urutan discovered_at
   * desc) — dipakai Mode AI supaya tidak menarik ribuan baris hanya untuk
   * meng-exclude beberapa ratus kata terbaru.
   */
  async getDiscoveredWordIds(userId: string, limit?: number): Promise<string[]> {
    let builder = supabase
      .from("word_discoveries")
      .select("word_id")
      .eq("user_id", userId);
    if (typeof limit === "number" && limit > 0) {
      builder = builder.order("discovered_at", { ascending: false }).limit(limit);
    }
    const { data, error } = await builder;
    if (error) {
      throw new Error(`Gagal ambil kata yang sudah ditemukan dari Supabase: ${error.message}`);
    }
    return (data ?? []).map((d) => d.word_id as string);
  },

  async countByUser(userId: string, search?: string): Promise<number> {
    const searchIds = await resolveSearchWordIds(search);
    if (searchIds !== null && searchIds.length === 0) return 0;

    let builder = supabase
      .from("word_discoveries")
      .select("discovery_id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (searchIds !== null) {
      builder = builder.in("word_id", searchIds);
    }

    const { count, error } = await builder;
    if (error) {
      throw new Error(`Gagal menghitung riwayat dari Supabase: ${error.message}`);
    }
    return count ?? 0;
  },
};
