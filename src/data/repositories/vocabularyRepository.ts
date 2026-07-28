import { getDatabase } from "../sources/database";
import type { VocabularyDoc } from "../models/schemas";

export const vocabularyRepository = {
  async getByTier(tierLevel: number): Promise<VocabularyDoc[]> {
    return getDatabase()
      .vocabulary.find({
        selector: { tier_level: { $eq: tierLevel } },
      })
      .exec();
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

  async bulkInsert(words: VocabularyDoc[]): Promise<void> {
    await getDatabase().vocabulary.bulkInsert(words);
  },

  async count(): Promise<number> {
    return getDatabase().vocabulary.count().exec();
  },
};
