-- Migration: Create users table
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
