-- ============================================================
-- KotaKata AI — Leaderboard Mingguan (PLAN-098)
-- ============================================================
-- XP mingguan terkumpul OTOMATIS dari jalur anti-cheat apply_board_xp
-- (PLAN-096) — hanya delta yang lolos validasi server yang dihitung.

CREATE TABLE IF NOT EXISTS public.weekly_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- users.user_id bertipe TEXT — samakan agar join tidak error.
  user_id text NOT NULL,
  week_start date NOT NULL,
  xp_gained integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_scores_select_auth ON public.weekly_scores;
CREATE POLICY weekly_scores_select_auth ON public.weekly_scores
  FOR SELECT TO authenticated USING (true);

-- ── apply_board_xp: versi baru + pencatatan skor mingguan ──
CREATE OR REPLACE FUNCTION apply_board_xp(
  p_delta integer,
  p_play_seconds integer DEFAULT 0
)
RETURNS TABLE (ok boolean, message text, new_total_xp integer, new_tier integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- users.user_id bertipe TEXT — auth.uid() di-cast eksplisit.
  v_uid text := auth.uid()::text;
  v_prev integer;
  v_new integer;
  v_tier integer;
  v_delta integer;
  v_last_board timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Tidak ada sesi login.', NULL::integer, NULL::integer;
    RETURN;
  END IF;

  -- 1) Clamp delta ke rentang mustahil-dilanggar.
  v_delta := GREATEST(-5000, LEAST(8000, COALESCE(p_delta, 0)));

  -- 2) XP positif butuh durasi minimum — submit instan = curang.
  IF v_delta > 0 AND COALESCE(p_play_seconds, 0) < 10 THEN
    RETURN QUERY SELECT false, 'Durasi bermain terlalu singkat.', NULL::integer, NULL::integer;
    RETURN;
  END IF;

  SELECT total_xp, last_board_at INTO v_prev, v_last_board FROM users WHERE user_id = v_uid;
  IF v_prev IS NULL THEN
    RETURN QUERY SELECT false, 'Profil tidak ditemukan.', NULL::integer, NULL::integer;
    RETURN;
  END IF;

  -- 3) Rate limit submit positif beruntun.
  IF v_delta > 0 AND v_last_board IS NOT NULL AND v_last_board >= now() - interval '8 seconds' THEN
    RETURN QUERY SELECT false, 'Terlalu cepat dari submit sebelumnya.', NULL::integer, NULL::integer;
    RETURN;
  END IF;

  v_new := GREATEST(0, v_prev + v_delta);
  v_tier := calc_tier_from_xp(v_new);

  UPDATE users
     SET total_xp = v_new,
         current_tier = v_tier,
         last_board_at = now(),
         updated_at = now()
   WHERE user_id = v_uid;

  -- 4) PLAN-098: akumulasi XP mingguan (week_start = Senin ISO).
  INSERT INTO weekly_scores (user_id, week_start, xp_gained)
  VALUES (v_uid, (date_trunc('week', now()))::date, v_delta)
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET xp_gained = weekly_scores.xp_gained + excluded.xp_gained,
                updated_at = now();

  RETURN QUERY SELECT true, 'OK', v_new, v_tier;
END;
$$;

-- ── RPC baca leaderboard minggu berjalan ──
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(p_limit integer DEFAULT 25)
RETURNS TABLE (rank bigint, user_id text, display_name text, current_tier integer, week_xp integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT row_number() OVER (ORDER BY ws.xp_gained DESC)::bigint AS rank,
         u.user_id,
         u.display_name,
         u.current_tier,
         ws.xp_gained
  FROM weekly_scores ws
  JOIN users u ON u.user_id = ws.user_id
  WHERE ws.week_start = (date_trunc('week', now()))::date
  ORDER BY ws.xp_gained DESC
  LIMIT GREATEST(1, LEAST(100, COALESCE(p_limit, 25)));
$$;

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard(integer) TO authenticated;
