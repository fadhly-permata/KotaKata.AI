import { supabase } from "../sources/supabase";
import { loggerWarn } from "../../utils/logger";
import type { WordDiscoveryDoc } from "../models/schemas";

const DISCOVERY_COLUMNS = "discovery_id, user_id, word_id, discovered_at";

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

  async getByUserFromCloud(userId: string): Promise<WordDiscoveryDoc[]> {
    const { data, error } = await supabase
      .from("word_discoveries")
      .select(DISCOVERY_COLUMNS)
      .eq("user_id", userId)
      .order("discovered_at", { ascending: false });
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
   * dedup langsung di cloud (sumber kebenaran), lalu insert. Push langsung ke
   * Supabase — tanpa database lokal, tidak ada antrean/sync terpisah.
   * Aman dipanggil berulang: write diantre serial biar tidak ada duplikat.
   */
  async recordDiscoveriesForWords(
    userId: string,
    words: { word_id?: string }[],
  ): Promise<void> {
    const task = (async () => {
      const now = new Date().toISOString();
      const seen = new Set<string>();
      for (const w of words) {
        if (!w.word_id || seen.has(w.word_id)) continue;
        seen.add(w.word_id);
        try {
          const existing =
            await wordDiscoveryRepository.getByUserAndWordFromCloud(userId, w.word_id);
          if (existing) continue;

          const discovery: WordDiscoveryDoc = {
            discovery_id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${w.word_id}`,
            user_id: userId,
            word_id: w.word_id,
            discovered_at: now,
          };
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
          if (error) throw error;
        } catch (err) {
          loggerWarn(`Gagal merekam discovery (${w.word_id})`, err);
        }
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
   */
  async getDiscoveredWordIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("word_discoveries")
      .select("word_id")
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal ambil kata yang sudah ditemukan dari Supabase: ${error.message}`);
    }
    return (data ?? []).map((d) => d.word_id as string);
  },

  async countByUser(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("word_discoveries")
      .select("discovery_id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal menghitung riwayat dari Supabase: ${error.message}`);
    }
    return count ?? 0;
  },
};
