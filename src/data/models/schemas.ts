// ---- Domain Types ----
// Sumber kebenaran: Supabase. Tidak ada database lokal lagi — baris-baris di
// bawah ini adalah bentuk (shape) baris tabel cloud yang dipakai app.

export interface UserDoc {
  user_id: string;
  display_name: string;
  email?: string;
  /** Jangkar identitas guest (UUID device dari AsyncStorage). Hanya terisi untuk user anonim. */
  device_id?: string;
  total_xp: number;
  current_tier: number;
  coins: number;
  updated_at: string;
  /** PLAN-097: streak tantangan harian (berapa hari berturut-turut selesai). */
  daily_streak?: number;
  /** PLAN-097: tanggal (YYYY-MM-DD) terakhir kali daily challenge selesai. */
  daily_last_done?: string | null;
  /** PLAN-099: jumlah kemenangan Level Boss. */
  boss_wins?: number;
}

export interface VocabularyDoc {
  word_id: string;
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  tier_level: number;
  created_at: string;
}

export interface WordDiscoveryDoc {
  discovery_id: string;
  user_id: string;
  /** Referensi ke vocabulary.word_id — kata & clue dibaca lewat join, tidak diduplikasi. */
  word_id: string;
  discovered_at: string;
}

export interface SavedBoardDoc {
  board_id: string;
  user_id: string;
  tier_at_generation: number;
  grid_size: number;
  layout_data: string; // JSON stringified
  is_finished: boolean;
  updated_at: string;
  /** Waktu board pertama kali ditandai selesai (sekali set, tidak berubah). */
  finished_at?: string | null;
}
