-- KotaKata AI — Admin Update Vocabulary (update_vocabulary_admin)
--
-- RPC function yang hanya bisa dipanggil oleh admin tertentu
-- untuk mengedit soal di tabel vocabulary.
-- Admin diidentifikasi via email di auth.users.

CREATE OR REPLACE FUNCTION public.update_vocabulary_admin(
  p_word_id text,
  p_word text,
  p_clue_1 text,
  p_clue_2 text,
  p_clue_3 text,
  p_tier_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_admin_email text := 'fadhly.permata@gmail.com';
BEGIN
  -- Dapatkan uid user yang memanggil
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tidak terautentikasi');
  END IF;

  -- Dapatkan email dari auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User tidak ditemukan');
  END IF;

  -- Cek apakah admin
  IF v_email != v_admin_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya admin yang bisa mengedit soal');
  END IF;

  -- Validasi input
  IF p_word IS NULL OR length(trim(p_word)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kata tidak boleh kosong');
  END IF;
  IF p_clue_1 IS NULL OR length(trim(p_clue_1)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Clue 1 tidak boleh kosong');
  END IF;
  IF p_tier_level < 1 OR p_tier_level > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tier harus 1-10');
  END IF;

  -- Update vocabulary
  UPDATE public.vocabulary
  SET
    word = trim(p_word),
    clue_1 = trim(p_clue_1),
    clue_2 = CASE WHEN trim(p_clue_2) = '' THEN NULL ELSE trim(p_clue_2) END,
    clue_3 = CASE WHEN trim(p_clue_3) = '' THEN NULL ELSE trim(p_clue_3) END,
    tier_level = p_tier_level
  WHERE word_id = p_word_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kata tidak ditemukan');
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'Berhasil disimpan');
END;
$$;

-- Izinkan authenticated user (admin) execute
REVOKE ALL ON FUNCTION public.update_vocabulary_admin(text, text, text, text, text, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_vocabulary_admin(text, text, text, text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_vocabulary_admin(text, text, text, text, text, integer) TO authenticated;
