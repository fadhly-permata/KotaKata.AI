-- ============================================================
-- KotaKata.AI — Share Kode Kata (PLAN-103 bagian 2)
-- ============================================================
-- Tabel ini HANYA memetakan kode → daftar kata (jsonb array berisi
-- { word, clue_1?, clue_2?, clue_3? } sebagai fallback clue untuk kata yang
-- belum ada di vocabulary). Papan TIDAK disimpan — tiap pemain menggenerate
-- papan secara acak sendiri dari daftar kata tersebut.
-- Saat dimainkan, kata yang sudah ada di vocabulary dipakai versi DB-nya
-- (word_id + clue hasil audit pemilik).

CREATE TABLE IF NOT EXISTS public.shared_word_sets (
  code text PRIMARY KEY,
  creator_id text NOT NULL,
  words jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_word_sets ENABLE ROW LEVEL SECURITY;

-- FK ke users supaya PostgREST bisa embed nama pembuat (users(display_name))
-- untuk halaman komunitas "Papan Bagikan".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shared_word_sets_creator_fkey'
  ) THEN
    ALTER TABLE public.shared_word_sets
      ADD CONSTRAINT shared_word_sets_creator_fkey
      FOREIGN KEY (creator_id) REFERENCES public.users(user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS shared_word_sets_select_auth ON public.shared_word_sets;
CREATE POLICY shared_word_sets_select_auth ON public.shared_word_sets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS shared_word_sets_insert_own ON public.shared_word_sets;
CREATE POLICY shared_word_sets_insert_own ON public.shared_word_sets
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid()::text);

