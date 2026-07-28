-- Migration: Create saved_boards table
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
