import { supabase } from "../sources/supabase";
import type { UserDoc } from "../models/schemas";
import type { AiProviderConfig } from "../../utils/aiProvider";

const USER_COLUMNS =
  "user_id, display_name, email, device_id, total_xp, current_tier, coins, updated_at, daily_streak, daily_last_done, boss_wins";

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

  /**
   * PLAN-097: catat penyelesaian Tantangan Harian — update streak di profil.
   * Streak +1 bila kemarin (tanggal lokal) juga selesai; kalau terlewat,
   * streak kembali ke 1.
   */
  async completeDailyChallenge(userId: string): Promise<{ streak: number }> {
    const user = await this.getById(userId);
    if (!user) return { streak: 0 };
    const today = new Date();
    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (user.daily_last_done === key(today)) {
      // Sudah tercatat hari ini (main ulang board harian yang sama) — tidak dobel.
      return { streak: user.daily_streak ?? 0 };
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak =
      user.daily_last_done === key(yesterday) ? (user.daily_streak ?? 0) + 1 : 1;
    await this.upsert({
      ...user,
      daily_streak: streak,
      daily_last_done: key(today),
    });
    return { streak };
  },

  async updateXp(userId: string, delta: number): Promise<void> {
    const user = await this.getById(userId);
    if (!user) return;
    const newXp = Math.max(0, user.total_xp + delta);
    const newTier = Math.min(10, Math.max(1, Math.floor(newXp / 100) + 1));
    await this.upsert({ ...user, total_xp: newXp, current_tier: newTier });
  },

  /**
   * PLAN-096 anti-cheat: kirim DELTA XP hasil papan ke RPC server-side yang
   * memvalidasi (clamp rentang, durasi minimum, rate limit) sebelum diterapkan.
   * Server mengembalikan total XP & tier RESMI (dihitung ulang di server).
   */
  async applyBoardXp(
    delta: number,
    playSeconds: number,
  ): Promise<{ ok: boolean; message?: string; newTotalXp?: number; newTier?: number }> {
    const { data, error } = await supabase.rpc("apply_board_xp", {
      p_delta: Math.round(delta),
      p_play_seconds: Math.round(playSeconds),
    });
    if (error) return { ok: false, message: error.message };
    const row = (Array.isArray(data) ? data[0] : data) as
      | { ok?: boolean; message?: string; new_total_xp?: number | null; new_tier?: number | null }
      | undefined;
    if (!row?.ok) return { ok: false, message: row?.message ?? "Ditolak server" };
    return {
      ok: true,
      newTotalXp: typeof row.new_total_xp === "number" ? row.new_total_xp : undefined,
      newTier: typeof row.new_tier === "number" ? row.new_tier : undefined,
    };
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

  /** Baca semua preferensi user (theme_mode, sound, ambient) dari cloud. */
  async getUserPreferences(userId: string): Promise<{
    theme_mode: string;
    sound_enabled: boolean;
    ambient_enabled: boolean;
    app_theme_id: string | null;
  }> {
    const { data, error } = await supabase
      .from("users")
      .select("theme_mode, sound_enabled, ambient_enabled, app_theme_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil preferensi dari Supabase: ${error.message}`);
    }
    if (!data) return { theme_mode: "system", sound_enabled: true, ambient_enabled: true, app_theme_id: null };
    return {
      theme_mode: (data as any).theme_mode ?? "system",
      sound_enabled: (data as any).sound_enabled ?? true,
      ambient_enabled: (data as any).ambient_enabled ?? true,
      app_theme_id: (data as any).app_theme_id ?? null,
    };
  },

  /** Simpan theme_mode ke cloud (fire-and-forget). */
  async saveThemeMode(userId: string, mode: string): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ theme_mode: mode })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan theme mode ke Supabase: ${error.message}`);
    }
  },

  /** Simpan sound_enabled ke cloud (fire-and-forget). */
  async saveSoundEnabled(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ sound_enabled: enabled })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan sound_enabled ke Supabase: ${error.message}`);
    }
  },

  /** Simpan ambient_enabled ke cloud (fire-and-forget). */
  async saveAmbientEnabled(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ ambient_enabled: enabled })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan ambient_enabled ke Supabase: ${error.message}`);
    }
  },

  /** Baca tema aktif (app_theme_id) dari cloud. */
  async getAppThemeId(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("users")
      .select("app_theme_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil tema dari Supabase: ${error.message}`);
    }
    return (data as any)?.app_theme_id as string | null;
  },

  /** Simpan tema aktif (app_theme_id) ke cloud. */
  async saveAppThemeId(userId: string, themeId: string): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ app_theme_id: themeId })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan tema ke Supabase: ${error.message}`);
    }
  },

  /** Baca SEMUA config provider AI yang tersimpan di cloud. */
  async getAllAiProviderConfigs(userId: string): Promise<{ providers: Record<string, AiProviderConfig>; activeProvider: string }> {
    const { data, error } = await supabase
      .from("users")
      .select("ai_provider_config")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil config AI dari Supabase: ${error.message}`);
    }
    const raw = (data as any)?.ai_provider_config;
    if (!raw) return { providers: {}, activeProvider: "openrouter" };

    // Format baru: { providers: {...}, activeProvider: "..." }
    if (raw.providers && typeof raw.providers === "object") {
      return {
        providers: raw.providers as Record<string, AiProviderConfig>,
        activeProvider: (raw.activeProvider as string) || "openrouter",
      };
    }

    // Migrasi dari format lama: single AiProviderConfig object
    if (raw.apiKey && raw.model && raw.baseUrl && raw.provider) {
      return {
        providers: { [raw.provider]: raw as AiProviderConfig },
        activeProvider: (raw.provider as string) || "openrouter",
      };
    }

    return { providers: {}, activeProvider: "openrouter" };
  },

  /** Simpan SEMUA provider AI ke cloud. */
  async saveAllAiProviderConfigs(
    userId: string,
    providers: Record<string, AiProviderConfig>,
    activeProvider: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ ai_provider_config: { providers, activeProvider } })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal simpan config AI ke Supabase: ${error.message}`);
    }
  },

  /** Hapus semua provider AI dari cloud. */
  async clearAllAiProviderConfigs(userId: string): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ ai_provider_config: null })
      .eq("user_id", userId);
    if (error) {
      throw new Error(`Gagal hapus config AI dari Supabase: ${error.message}`);
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
  /** PLAN-099: catat satu kemenangan Level Boss (kosmetik — badge & statistik). */
  async recordBossWin(userId: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) return;
    await this.upsert({ ...user, boss_wins: (user.boss_wins ?? 0) + 1 });
  },

  /**
   * PLAN-098: leaderboard XP MINGGU INI (Senin-sekarang). Data terkumpul
   * otomatis dari jalur anti-cheat apply_board_xp di server.
   */
  async getWeeklyLeaderboard(
    limit = 25,
  ): Promise<Array<{ rank: number; user_id: string; display_name: string; current_tier: number; week_xp: number }>> {
    const { data, error } = await supabase.rpc("get_weekly_leaderboard", { p_limit: limit });
    if (error) throw new Error(`Gagal memuat leaderboard mingguan: ${error.message}`);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      rank: Number(r.rank),
      user_id: String(r.user_id),
      display_name: String(r.display_name ?? "Pemain"),
      current_tier: Number(r.current_tier ?? 1),
      week_xp: Number(r.week_xp ?? 0),
    }));
  },

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
  async getDailyStreakLeaderboard(
    limit = 25,
  ): Promise<Array<{ rank: number; user_id: string; display_name: string; current_tier: number; daily_streak: number }>> {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, display_name, current_tier, daily_streak")
      .gt("daily_streak", 0)
      .order("daily_streak", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Gagal memuat leaderboard streak: ${error.message}`);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r, i) => ({
      rank: i + 1,
      user_id: String(r.user_id),
      display_name: String(r.display_name ?? "Pemain"),
      current_tier: Number(r.current_tier ?? 1),
      daily_streak: Number(r.daily_streak ?? 0),
    }));
  },

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
