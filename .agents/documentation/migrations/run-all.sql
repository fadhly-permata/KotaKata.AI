-- =============================================
-- KotaKata.AI — Full Database Schema Migration
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. Users
CREATE TABLE public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  total_xp INTEGER DEFAULT 0,
  current_tier SMALLINT DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 10),
  coins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update own profile" ON public.users
  FOR ALL USING (auth.uid() = user_id);

-- 2. Vocabulary Collection
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

-- 3. Word Discoveries
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

-- 4. Saved Boards
CREATE TABLE public.saved_boards (
  board_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  tier_at_generation SMALLINT NOT NULL,
  grid_size SMALLINT NOT NULL,
  layout_data JSONB NOT NULL,
  is_finished BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.saved_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved boards" ON public.saved_boards
  FOR ALL USING (auth.uid() = user_id);
