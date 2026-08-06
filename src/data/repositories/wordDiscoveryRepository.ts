import { getDatabase } from "../sources/database";
import { supabase } from "../sources/supabase";
import { loggerWarn } from "../../utils/logger";
import type { WordDiscoveryDoc } from "../models/schemas";

/**
 * Antrean write discovery (serial). Semua pemanggilan recordDiscoveriesForWords
 * dijalankan berurutan — dedup lokal tidak pernah race dengan write lain
 * (mis. tracker kata baru vs backfill saat board selesai), jadi tidak ada
 * duplikat discovery_id di cloud.
 */
let pendingDiscoveryWrites: Promise<void> = Promise.resolve();

export const wordDiscoveryRepository = {
  async getByUser(userId: string): Promise<WordDiscoveryDoc[]> {
    return getDatabase()
      .word_discoveries.find({
        selector: { user_id: { $eq: userId } },
        sort: [{ discovered_at: "desc" }],
      })
      .exec();
  },

  /**
   * Baca riwayat langsung dari Supabase — sumber kebenaran lintas sesi.
   * RxDB lokal itu in-memory (hilang tiap reload), jadi Sejarah tidak boleh
   * cuma bergantung padanya.
   */
  async getByUserFromCloud(userId: string): Promise<WordDiscoveryDoc[]> {
    const { data, error } = await supabase
      .from("word_discoveries")
      .select("discovery_id, user_id, word_id, discovered_at")
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
      .select("discovery_id, user_id, word_id, discovered_at")
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
    const results = await getDatabase()
      .word_discoveries.find({
        selector: { user_id: { $eq: userId }, word_id: { $eq: wordId } },
      })
      .exec();
    return results[0] ?? null;
  },

  async add(discovery: WordDiscoveryDoc): Promise<void> {
    await getDatabase().word_discoveries.upsert(discovery);
  },

  /**
   * Sinkronkan riwayat cloud → DB lokal (upsert saja, tidak menghapus baris
   * lokal yang belum tersinkron). Dipanggil saat session login dan saat halaman
   * Sejarah dibuka: RxDB lokal hanya in-memory, jadi tanpa ini daftar "kata
   * yang sudah ditemukan" (dipakai untuk eksklusi soal & dedup) hilang setiap
   * reload.
   */
  async pullFromCloud(userId: string): Promise<void> {
    let discoveries: WordDiscoveryDoc[];
    try {
      discoveries = await wordDiscoveryRepository.getByUserFromCloud(userId);
    } catch (err) {
      loggerWarn("Pull riwayat dari cloud gagal", err);
      return;
    }
    if (discoveries.length === 0) return;
    const db = getDatabase();
    for (const d of discoveries) {
      await db.word_discoveries.upsert(d);
    }
  },

  /**
   * Catat kata-kata yang baru terjawab ke riwayat penemuan:
   *   1. dedup di DB lokal (RxDB in-memory),
   *   2. dedup di cloud (lintas sesi — RxDB lokal hilang tiap reload),
   *   3. insert lokal + push LANGSUNG ke Supabase (best-effort).
   * Dengan begitu "Sejarah Saya" bertambah meski board tidak sampai selesai,
   * tab ditutup mendadak, atau sync periodik 5 menit belum sempat jalan.
   * Aman dipanggil berulang: write diantre serial biar tidak ada duplikat.
   */
  async recordDiscoveriesForWords(
    userId: string,
    words: { word_id?: string }[],
  ): Promise<void> {
    const task = (async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const seen = new Set<string>();
      for (const w of words) {
        if (!w.word_id || seen.has(w.word_id)) continue;
        seen.add(w.word_id);
        try {
          const existingLocal = await db.word_discoveries
            .findOne({
              selector: { user_id: { $eq: userId }, word_id: { $eq: w.word_id } },
            })
            .exec();
          if (existingLocal) continue;

          // Cek cloud — kalau sudah tercatat di sesi sebelumnya, jangan bikin
          // duplikat dengan discovery_id baru.
          try {
            const existingCloud =
              await wordDiscoveryRepository.getByUserAndWordFromCloud(userId, w.word_id);
            if (existingCloud) continue;
          } catch {
            // offline — tetap simpan lokal, sync periodik akan menyusul.
          }

          const discovery: WordDiscoveryDoc = {
            discovery_id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${w.word_id}`,
            user_id: userId,
            word_id: w.word_id,
            discovered_at: now,
          };
          await db.word_discoveries.upsert(discovery);

          // Push langsung ke Supabase biar Sejarah bertambah tanpa menunggu
          // scheduler. Gagal tidak fatal — nanti di-push lagi oleh syncToCloud.
          try {
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
            loggerWarn(`Gagal push discovery ke cloud (${w.word_id})`, err);
          }
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

  /** Get discovered word IDs for a user (for board exclusion) */
  async getDiscoveredWordIds(userId: string): Promise<string[]> {
    const docs = await getDatabase()
      .word_discoveries.find({
        selector: { user_id: { $eq: userId } },
      })
      .exec();
    return docs.map((d) => d.word_id);
  },

  async countByUser(userId: string): Promise<number> {
    return getDatabase()
      .word_discoveries.count({
        selector: { user_id: { $eq: userId } },
      })
      .exec();
  },
};
