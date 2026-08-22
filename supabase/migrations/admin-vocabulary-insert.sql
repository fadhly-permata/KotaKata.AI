-- KotaKata AI — Admin Insert Vocabulary (insert_vocabulary_admin)
--
-- RPC function khusus admin untuk MENAMBAH soal baru di tabel vocabulary
-- dari halaman Editor Soal (tombol "+"). Pola sama dengan
-- update_vocabulary_admin: security definer + cek email admin, karena policy
-- INSERT terbuka di tabel vocabulary berbahaya (bisa meracuni pool soal).
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/admin-vocabulary-insert.sql

CREATE OR REPLACE FUNCTION public.insert_vocabulary_admin(
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
  v_word text;
  v_id text;
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
    RETURN jsonb_build_object('ok', false, 'error', 'Hanya admin yang bisa menambah soal');
  END IF;

  -- Validasi input
  v_word := lower(trim(coalesce(p_word, '')));
  IF length(v_word) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kata tidak boleh kosong');
  END IF;
  IF p_clue_1 IS NULL OR length(trim(p_clue_1)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Clue 1 tidak boleh kosong');
  END IF;
  IF p_tier_level IS NULL OR p_tier_level < 1 OR p_tier_level > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tier harus 1-10');
  END IF;

  -- Dedup: kata yang sama persis sudah terdaftar → tolak
  IF EXISTS (SELECT 1 FROM public.vocabulary WHERE word = v_word) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kata "' || v_word || '" sudah ada di database');
  END IF;

  -- word_id baru dengan prefix "admin-" supaya mudah dilacak asal-usulnya
  v_id := 'admin-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' ||
          lpad((floor(random() * 9000 + 1000))::text, 4, '0');

  INSERT INTO public.vocabulary (word_id, word, clue_1, clue_2, clue_3, tier_level)
  VALUES (
    v_id,
    v_word,
    trim(p_clue_1),
    CASE WHEN coalesce(trim(p_clue_2), '') = '' THEN NULL ELSE trim(p_clue_2) END,
    CASE WHEN coalesce(trim(p_clue_3), '') = '' THEN NULL ELSE trim(p_clue_3) END,
    p_tier_level
  );

  RETURN jsonb_build_object('ok', true, 'message', 'Soal "' || v_word || '" berhasil ditambahkan', 'word_id', v_id);
END;
$$;

-- Izinkan authenticated user (admin) execute
REVOKE ALL ON FUNCTION public.insert_vocabulary_admin(text, text, text, text, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.insert_vocabulary_admin(text, text, text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.insert_vocabulary_admin(text, text, text, text, integer) TO authenticated;
