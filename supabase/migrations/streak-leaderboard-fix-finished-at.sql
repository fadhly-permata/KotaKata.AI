-- ============================================================
-- KotaKata AI — Fix Streak Leaderboard: pakai finished_at
-- ============================================================
-- `updated_at` di-update setiap auto-save, jadi board lama yang
-- sudah selesai tapi di-review minggu ini terhitung lagi.
-- Solusi: tambah kolom `finished_at` (sekali set, tak berubah)
-- dan pakai itu di RPC.

-- 1. Tambah kolom finished_at (nullable, default null)
ALTER TABLE saved_boards
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 2. Backfill: board yang sudah selesai tapi finished_at masih null
--    → set finished_at = updated_at (estimasi terbaik)
UPDATE saved_boards
  SET finished_at = updated_at
  WHERE is_finished = true AND finished_at IS NULL;

-- 3. Update RPC: pakai finished_at bukan updated_at
CREATE OR REPLACE FUNCTION get_streak_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (rank bigint, user_id text, display_name text, current_tier integer, weekly_plays bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH week_boards AS (
    SELECT sb.user_id, COUNT(*)::bigint AS play_count
    FROM saved_boards sb
    WHERE sb.is_finished = true
      AND sb.finished_at IS NOT NULL
      AND sb.finished_at >= (date_trunc('week', now()))::timestamptz
    GROUP BY sb.user_id
  )
  SELECT row_number() OVER (ORDER BY wb.play_count DESC)::bigint AS rank,
         u.user_id,
         u.display_name,
         u.current_tier,
         wb.play_count
  FROM week_boards wb
  JOIN users u ON u.user_id = wb.user_id
  ORDER BY wb.play_count DESC
  LIMIT GREATEST(1, LEAST(100, COALESCE(p_limit, 50)));
$$;

GRANT EXECUTE ON FUNCTION get_streak_leaderboard(integer) TO authenticated;
