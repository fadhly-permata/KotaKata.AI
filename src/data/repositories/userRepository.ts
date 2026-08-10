import { supabase } from "../sources/supabase";
import type { UserDoc } from "../models/schemas";
import type { AiProviderConfig } from "../../utils/aiProvider";

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
   * Baca config provider AI yang tersimpan di cloud (kolom users.ai_provider_config).
   * Dipakai sinkronisasi lintas device: login akun sama di device lain tetap bisa
   * Main Mode AI. RLS users membatasi akses ke baris pemiliknya sendiri.
   */
  async getAiProviderConfig(userId: string): Promise<AiProviderConfig | null> {
    const { data, error } = await supabase
      .from("users")
      .select("ai_provider_config")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil config AI dari Supabase: ${error.message}`);
    }
    const raw = (data as any)?.ai_provider_config as AiProviderConfig | null;
    // Bentuk tidak valid (kolom kosong / korup) dianggap belum diatur.
    if (!raw?.apiKey || !raw?.model || !raw?.baseUrl) return null;
    return raw;
  },

  /** Simpan config provider AI ke cloud; kirim null untuk menghapusnya. */
  async saveAiProviderConfig(userId: string, cfg: AiProviderConfig | null): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ ai_provider_config: cfg })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan config AI ke Supabase: ${error.message}`);
    }
  },

  /**
   * Leaderboard satu halaman, urut total_xp DESC lalu updated_at ASC (pemain
   * yang MENCAPAI XP yang sama lebih dulu menang). RLS users hanya membolehkan
   * user melihat barisnya sendiri, jadi baca lintas-user lewat RPC
   * get_leaderboard_paged (security definer) yang mengembalikan hanya kolom
   * publik (tanpa email/device_id) + total_count utk tahu kapan harus berhenti
   * lazy-load.
   */
  async getLeaderboardPage(
    limit: number,
    offset: number,
  ): Promise<{ users: UserDoc[]; total: number }> {
    const { data, error } = await supabase.rpc("get_leaderboard_paged", {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      throw new Error(`Gagal ambil leaderboard dari Supabase: ${error.message}`);
    }
    const rows = (data ?? []) as Array<UserDoc & { total_count: number }>;
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    const users: UserDoc[] = rows.map(({ total_count: _tc, ...u }) => u);
    return { users, total };
  },

  /**
   * Posisi (rank) pemain di leaderboard + barisnya — ditampilkan di atas
   * tombol Tutup popup Leaderboard supaya user yang posisinya jauh (#100)
   * tetap langsung tahu di mana dia berada tanpa scroll.
   */
  async getLeaderboardRank(
    userId: string,
  ): Promise<(UserDoc & { rank: number }) | null> {
    const { data, error } = await supabase.rpc("get_leaderboard_rank", {
      p_user_id: userId,
    });
    if (error) {
      throw new Error(`Gagal ambil posisi leaderboard dari Supabase: ${error.message}`);
    }
    const rows = (data ?? []) as Array<UserDoc & { rank: number }>;
    if (rows.length === 0) return null;
    const { rank, ...u } = rows[0];
    return { ...u, rank: Number(rank) };
  },
};
