-- Migration: Create vocabulary_collection table
CREATE TABLE public.vocabulary_collection (
  word_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  clue_1 TEXT NOT NULL,
  clue_2 TEXT,
  clue_3 TEXT,
  tier_level SMALLINT NOT NULL CHECK (tier_level BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vocabulary_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read vocabulary" ON public.vocabulary_collection
  FOR SELECT TO authenticated USING (true);
