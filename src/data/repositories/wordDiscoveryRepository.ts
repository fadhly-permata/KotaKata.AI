import { getDatabase } from "../sources/database";
import { supabase } from "../sources/supabase";
import type { WordDiscoveryDoc } from "../models/schemas";

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
