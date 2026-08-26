-- ============================================================
-- KotaKata AI — Leaderboard Streak Mingguan
-- ============================================================
-- Hitung jumlah board selesai (is_finished=true) per user
-- dalam seminggu terakhir (sejak Senin 00:00 UTC).

CREATE OR REPLACE FUNCTION get_streak_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (rank bigint, user_id text, display_name text, current_tier integer, weekly_plays bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH week_boards AS (
    SELECT sb.user_id, COUNT(*)::bigint AS play_count
    FROM saved_boards sb
    WHERE sb.is_finished = true
      AND sb.updated_at >= (date_trunc('week', now()))::timestamptz
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
