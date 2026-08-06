import { supabase } from "../sources/supabase";
import type { UserDoc } from "../models/schemas";

const USER_COLUMNS = "user_id, display_name, email, total_xp, current_tier, coins, updated_at";

export const userRepository = {
  async getById(userId: string): Promise<UserDoc | null> {
    const { data, error } = await supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil profil dari Supabase: ${error.message}`);
    }
    return (data ?? null) as UserDoc | null;
  },

  async upsert(user: UserDoc): Promise<void> {
    const { error } = await supabase.from("users").upsert(
      {
        user_id: user.user_id,
        display_name: user.display_name,
        email: user.email ?? null,
        total_xp: user.total_xp,
        current_tier: user.current_tier,
        coins: user.coins,
        updated_at: user.updated_at,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      throw new Error(`Gagal simpan profil ke Supabase: ${error.message}`);
    }
  },

  async updateXp(userId: string, delta: number): Promise<void> {
    const user = await this.getById(userId);
    if (!user) return;
    const newXp = Math.max(0, user.total_xp + delta);
    const newTier = Math.min(10, Math.max(1, Math.floor(newXp / 100) + 1));
    await this.upsert({ ...user, total_xp: newXp, current_tier: newTier });
  },

  async getAll(): Promise<UserDoc[]> {
    const { data, error } = await supabase.from("users").select(USER_COLUMNS);
    if (error) {
      throw new Error(`Gagal ambil profil dari Supabase: ${error.message}`);
    }
    return (data ?? []) as UserDoc[];
  },
};
