import { supabase } from "../sources/supabase";
import type { UserDoc } from "../models/schemas";

const USER_COLUMNS = "user_id, display_name, email, device_id, total_xp, current_tier, coins, updated_at";

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
        device_id: user.device_id ?? null,
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

  /**
   * Pulihkan identitas guest: semua data milik uid anonim SEBELUMNYA di device
   * yang sama (device_id sama) dipindahkan ke uid anonim yang baru. Aman dipanggil
   * setiap kali session anonim dimuat — jadi no-op kalau belum ada data untuk
   * device_id ini. RPC-nya security definer supaya bisa memindahkan data lintas
   * uid (RLS normal melarang membaca baris milik uid lain).
   */
  async restoreGuestIdentity(deviceId: string, newUid: string): Promise<void> {
    const { error } = await supabase.rpc("restore_guest_identity", {
      p_device_id: deviceId,
      p_new_uid: newUid,
    });
    if (error) {
      throw new Error(`Gagal memulihkan identitas tamu: ${error.message}`);
    }
  },

  /**
   * Hapus akun PERMANEN: semua data milik user yang sedang login
   * (word_discoveries, saved_boards, users, lalu auth.users) lewat RPC
   * delete_user_data() (security definer — klien anonim tidak boleh
   * menghapus auth.users). Setelah dipanggil, sesi tidak lagi valid.
   */
  async deleteAccount(): Promise<void> {
    const { error } = await supabase.rpc("delete_user_data");
    if (error) {
      throw new Error(`Gagal menghapus akun: ${error.message}`);
    }
  },

  async updateXp(userId: string, delta: number): Promise<void> {
    const user = await this.getById(userId);
    if (!user) return;
    const newXp = Math.max(0, user.total_xp + delta);
    const newTier = Math.min(10, Math.max(1, Math.floor(newXp / 100) + 1));
    await this.upsert({ ...user, total_xp: newXp, current_tier: newTier });
  },

  /**
   * Leaderboard semua pemain, urut total_xp DESC lalu updated_at ASC (pemain
   * yang MENCAPAI XP yang sama lebih dulu menang). RLS users hanya membolehkan
   * user melihat barisnya sendiri, jadi baca lintas-user lewat RPC
   * get_leaderboard (security definer) yang mengembalikan hanya kolom publik
   * (tanpa email/device_id).
   */
  async getLeaderboard(): Promise<UserDoc[]> {
    const { data, error } = await supabase.rpc("get_leaderboard");
    if (error) {
      throw new Error(`Gagal ambil leaderboard dari Supabase: ${error.message}`);
    }
    return (data ?? []) as UserDoc[];
  },
};
