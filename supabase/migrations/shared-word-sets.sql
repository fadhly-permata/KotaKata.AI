-- ============================================================
-- KotaKata.AI — Share Kode Kata (PLAN-103 bagian 2)
-- ============================================================
-- Tabel ini HANYA memetakan kode → array word_id dari vocabulary.
-- Papan TIDAK disimpan — tiap pemain menggenerate papan acak sendiri.
-- Tidak ada duplikasi kata/clue: saat dimainkan, kata & clue selalu dibaca
-- langsung dari vocabulary (versi teraudit pemilik). Kalau baris vocabulary
-- suatu id sudah dihapus, kata itu dilewati saat menyusun papan.

CREATE TABLE IF NOT EXISTS public.shared_word_sets (
  code text PRIMARY KEY,
  creator_id text NOT NULL,
  word_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Untuk instalasi lama yang tabelnya sudah ada tanpa kolom baru:
ALTER TABLE public.shared_word_sets ADD COLUMN IF NOT EXISTS word_ids text[];

-- ── Migrasi dari skema lama (kolom jsonb "words" berisi {word, clue_1..3}) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_word_sets' AND column_name = 'words'
  ) THEN
    -- Isi word_ids dari vocabulary berdasarkan teks kata lama.
    UPDATE shared_word_sets s SET word_ids = COALESCE(
      (
        SELECT array_agg(v.word_id ORDER BY t.ord)
        FROM jsonb_array_elements(s.words) WITH ORDINALITY AS t(w, ord)
        JOIN vocabulary v ON v.word = lower(t.w->>'word')
      ),
      '{}'
    );
    ALTER TABLE shared_word_sets DROP COLUMN words;
  END IF;
END $$;

ALTER TABLE shared_word_sets ALTER COLUMN word_ids DROP DEFAULT;
ALTER TABLE shared_word_sets ALTER COLUMN word_ids SET DEFAULT '{}';

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
