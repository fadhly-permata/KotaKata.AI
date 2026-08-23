-- ============================================================
-- KotaKata AI — Anti-Cheat XP (PLAN-096)
-- ============================================================
-- Sebelumnya: total_xp dihitung klien lalu ditulis absolut lewat upsert
-- users (RLS hanya menjaga kepemilikan baris, bukan nilai) → bisa dimanipulasi.
--
-- Sekarang: klien mengirim DELTA XP per papan + durasi main ke RPC
-- `apply_board_xp` (security definer). Server memvalidasi:
--   1. Delta dibatasi [-5000, +8000] (teoretis maks papan ±4500).
--   2. Delta positif wajib durasi ≥ 10 detik.
--   3. Rate limit: delta positif ditolak bila submit papan sebelumnya < 8 detik.
-- Tier dihitung ulang SERVER-SIDE dari ambang resmi.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_board_at timestamptz;

CREATE OR REPLACE FUNCTION apply_board_xp(
  p_delta integer,
  p_play_seconds integer DEFAULT 0
)
RETURNS TABLE (ok boolean, message text, new_total_xp integer, new_tier integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
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

  RETURN QUERY SELECT true, 'OK', v_new, v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION calc_tier_from_xp(p_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_xp >= 500000 THEN 10
    WHEN p_xp >= 329000 THEN 9
    WHEN p_xp >= 215000 THEN 8
    WHEN p_xp >= 139000 THEN 7
    WHEN p_xp >= 88000  THEN 6
    WHEN p_xp >= 54000  THEN 5
    WHEN p_xp >= 31500  THEN 4
    WHEN p_xp >= 16500  THEN 3
    WHEN p_xp >= 6500   THEN 2
    ELSE 1
  END;
$$;

GRANT EXECUTE ON FUNCTION apply_board_xp(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION calc_tier_from_xp(integer) TO authenticated;
