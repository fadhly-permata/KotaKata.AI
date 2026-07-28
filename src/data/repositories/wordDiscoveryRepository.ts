import { getDatabase } from "../sources/database";
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
