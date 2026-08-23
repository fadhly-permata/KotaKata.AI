import { supabase } from "../sources/supabase";

/**
 * Share Kode Kata (PLAN-103 bagian 2).
 * Tabel hanya memetakan kode → array word_id dari vocabulary. Tidak ada
 * duplikasi kata/clue — saat dimainkan, kata & clue selalu dibaca dari
 * vocabulary (versi teraudit pemilik). Papan digenerate acak oleh tiap pemain.
 */

export interface SharedWordSet {
  code: string;
  creator_id: string;
  word_ids: string[];
  created_at: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I/O/0/1 yang membingungkan

function generateCode(): string {
  const pick = () =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

/** Normalisasi input user: buang spasi/dash, uppercase. */
export function normalizeShareCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export const sharedWordSetRepository = {
  /**
   * Simpan set baru berisi word_id vocabulary dengan kode unik. Coba maksimal
   * 5x bila bentrok kode (sangat kecil kemungkinannya).
   */
  async create(wordIds: string[], creatorId: string): Promise<string> {
    if (wordIds.length < 6) {
      throw new Error("Minimal 6 word_id untuk membuat set bagikan.");
    }
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from("shared_word_sets").insert({
        code,
        creator_id: creatorId,
        word_ids: wordIds,
      });
      if (!error) return code;
      lastError = error;
      if (!`${error.message}`.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error(`Gagal membuat kode bagikan: ${(lastError as Error)?.message ?? "unknown"}`);
  },

  /**
   * Daftar set terbaru untuk halaman komunitas "Papan Bagikan" — semua pemain
   * bisa melihat & memainkan set siapa pun. Termasuk nama pembuat (embed users).
   */
  async list(
    limit = 25,
    offset = 0,
  ): Promise<{ items: Array<SharedWordSet & { creator_name: string | null }>; total: number }> {
    const { data, count, error } = await supabase
      .from("shared_word_sets")
      .select("code, creator_id, word_ids, created_at, users(display_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error(`Gagal memuat daftar papan bagikan: ${error.message}`);
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return {
      items: rows.map((row) => {
        const creator = row.users as { display_name?: string } | Array<{ display_name?: string }> | null;
        const creatorName = Array.isArray(creator) ? creator[0]?.display_name : creator?.display_name;
        return {
          code: String(row.code),
          creator_id: String(row.creator_id),
          word_ids: (row.word_ids as string[]) ?? [],
          created_at: String(row.created_at ?? ""),
          creator_name: creatorName ?? null,
        };
      }),
      total: count ?? 0,
    };
  },

  /**
   * Ambil set berdasarkan kode — null bila tidak ditemukan.
   * Kode tersimpan berformat XXXX-XXXX; input user dicocokkan ke KEDUA format
   * (dengan & tanpa dash) tanpa asumsi bentuk input.
   */
  async getByCode(codeInput: string): Promise<SharedWordSet | null> {
    const stripped = normalizeShareCode(codeInput);
    if (stripped.length < 6) return null;
    const candidates = new Set<string>([stripped]);
    if (stripped.length === 8) {
      candidates.add(`${stripped.slice(0, 4)}-${stripped.slice(4)}`);
    }
    const { data, error } = await supabase
      .from("shared_word_sets")
      .select("code, creator_id, word_ids, created_at")
      .in("code", [...candidates])
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal mengambil soal dari kode: ${error.message}`);
    }
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      code: String(row.code),
      creator_id: String(row.creator_id),
      word_ids: (row.word_ids as string[]) ?? [],
      created_at: String(row.created_at ?? ""),
    };
  },
};
