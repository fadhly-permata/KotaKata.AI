import { getDatabase } from "../sources/database";
import type { UserDoc } from "../models/schemas";

export const userRepository = {
  async getById(userId: string): Promise<UserDoc | null> {
    return (await getDatabase().users.findOne(userId).exec()) ?? null;
  },

  async upsert(user: UserDoc): Promise<void> {
    await getDatabase().users.upsert(user);
  },

  async updateXp(userId: string, delta: number): Promise<void> {
    const user = await this.getById(userId);
    if (!user) return;
    const newXp = Math.max(0, user.total_xp + delta);
    const newTier = Math.min(10, Math.max(1, Math.floor(newXp / 100) + 1));
    await this.upsert({ ...user, total_xp: newXp, current_tier: newTier });
  },

  async getAll(): Promise<UserDoc[]> {
    return getDatabase().users.find().exec();
  },
};
