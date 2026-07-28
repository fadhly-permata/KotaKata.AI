-- Migration: Create word_discoveries table
CREATE TABLE public.word_discoveries (
  discovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.vocabulary_collection(word_id),
  word VARCHAR(100) NOT NULL,
  clue_1 TEXT NOT NULL,
  clue_2 TEXT,
  clue_3 TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
);

ALTER TABLE public.word_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own discoveries" ON public.word_discoveries
  FOR ALL USING (auth.uid() = user_id);
