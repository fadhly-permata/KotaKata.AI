import { supabase } from "../sources/supabase";
import type { SavedBoardDoc } from "../models/schemas";

const BOARD_COLUMNS =
  "board_id, user_id, tier_at_generation, grid_size, layout_data, is_finished, updated_at";

/** Kolom layout_data di cloud bertipe jsonb — konversi balik ke string. */
function normalizeLayout(layoutData: unknown): string {
  if (typeof layoutData === "string") return layoutData;
  return JSON.stringify(layoutData ?? {});
}

function toDoc(row: Record<string, unknown>): SavedBoardDoc {
  return {
    board_id: row.board_id as string,
    user_id: row.user_id as string,
    tier_at_generation: row.tier_at_generation as number,
    grid_size: row.grid_size as number,
    layout_data: normalizeLayout(row.layout_data),
    is_finished: row.is_finished as boolean,
    updated_at: row.updated_at as string,
  };
}

export const boardRepository = {
  async getById(boardId: string): Promise<SavedBoardDoc | null> {
    const { data, error } = await supabase
      .from("saved_boards")
      .select(BOARD_COLUMNS)
      .eq("board_id", boardId)
      .maybeSingle();
    if (error) {
      throw new Error(`Gagal ambil board dari Supabase: ${error.message}`);
    }
    return data ? toDoc(data) : null;
  },

  async getByUser(userId: string): Promise<SavedBoardDoc[]> {
    const { data, error } = await supabase
      .from("saved_boards")
      .select(BOARD_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      throw new Error(`Gagal ambil board dari Supabase: ${error.message}`);
    }
    return (data ?? []).map(toDoc);
  },

  /** Ambil daftar board yang sudah selesai (is_finished = true) milik user,
   *  dengan paging (limit/offset). Default 25 per halaman. */
  async getFinished(
    userId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<SavedBoardDoc[]> {
    const limit = opts.limit ?? 25;
    const offset = opts.offset ?? 0;
    const { data, error } = await supabase
      .from("saved_boards")
      .select(BOARD_COLUMNS)
      .eq("user_id", userId)
      .eq("is_finished", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error(`Gagal ambil board selesai dari Supabase: ${error.message}`);
    }
    return (data ?? []).map(toDoc);
  },

  /** Hitung total board yang sudah selesai milik user (label paging). */
  async countFinished(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("saved_boards")
      .select("board_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_finished", true);
    if (error) {
      throw new Error(`Gagal menghitung board selesai dari Supabase: ${error.message}`);
    }
    return count ?? 0;
  },

  async getInProgress(userId: string): Promise<SavedBoardDoc[]> {
    const { data, error } = await supabase
      .from("saved_boards")
      .select(BOARD_COLUMNS)
      .eq("user_id", userId)
      .eq("is_finished", false)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) {
      throw new Error(`Gagal ambil board berjalan dari Supabase: ${error.message}`);
    }
    return (data ?? []).map(toDoc);
  },

  async save(board: SavedBoardDoc): Promise<void> {
    const { error } = await supabase.from("saved_boards").upsert(
      {
        board_id: board.board_id,
        user_id: board.user_id,
        tier_at_generation: board.tier_at_generation,
        grid_size: board.grid_size,
        layout_data: JSON.parse(board.layout_data),
        is_finished: board.is_finished,
        updated_at: board.updated_at,
      },
      { onConflict: "board_id" },
    );
    if (error) {
      throw new Error(`Gagal simpan board ke Supabase: ${error.message}`);
    }
  },

  async markFinished(boardId: string): Promise<void> {
    const { error } = await supabase
      .from("saved_boards")
      .update({ is_finished: true, updated_at: new Date().toISOString() })
      .eq("board_id", boardId);
    if (error) {
      throw new Error(`Gagal menandai board selesai di Supabase: ${error.message}`);
    }
  },

  async delete(boardId: string): Promise<void> {
    const { error } = await supabase.from("saved_boards").delete().eq("board_id", boardId);
    if (error) {
      throw new Error(`Gagal hapus board di Supabase: ${error.message}`);
    }
  },
};
