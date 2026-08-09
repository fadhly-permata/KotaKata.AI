-- ============================================================
-- KotaKata AI — RLS policies
-- ============================================================
-- Jalankan di Supabase SQL Editor, URUTANNYA:
--   1) supabase/migrations/fix-user-tables.sql        (id string → text; tanpa ini semua
--      sync gagal karena kolom masih uuid)
--   2) supabase/migrations/fix-word-discoveries.sql   (word_discoveries jadi FK-only)
--   3) supabase/data/vocabulary.sql             (isi tabel vocabulary)
--   4) file ini (policy RLS)
--
-- Kalau policy INSERT/UPDATE pada word_discoveries tidak ada, sinkronisasi
-- discovery gagal diam-diam: XP & board tersimpan (tabel users/saved_boards
-- di-sync lebih dulu), tapi "Sejarah Saya" tidak pernah bertambah karena
-- baris word_discoveries tidak pernah berhasil masuk cloud.
-- ============================================================

alter table public.users enable row level security;
alter table public.saved_boards enable row level security;
alter table public.word_discoveries enable row level security;
alter table public.vocabulary enable row level security;

-- ---- users: tiap pemain hanya melihat / mengubah barisnya sendiri ----
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid()::text = user_id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ---- saved_boards: pemain hanya melihat / mengubah boardnya sendiri ----
drop policy if exists "saved_boards_select_own" on public.saved_boards;
create policy "saved_boards_select_own" on public.saved_boards
  for select using (auth.uid()::text = user_id);

drop policy if exists "saved_boards_insert_own" on public.saved_boards;
create policy "saved_boards_insert_own" on public.saved_boards
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "saved_boards_update_own" on public.saved_boards;
create policy "saved_boards_update_own" on public.saved_boards
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

drop policy if exists "saved_boards_delete_own" on public.saved_boards;
create policy "saved_boards_delete_own" on public.saved_boards
  for delete using (auth.uid()::text = user_id);

-- ---- word_discoveries: INILAH tabel riwayat "Sejarah Saya" ----
drop policy if exists "word_discoveries_select_own" on public.word_discoveries;
create policy "word_discoveries_select_own" on public.word_discoveries
  for select using (auth.uid()::text = user_id);

drop policy if exists "word_discoveries_insert_own" on public.word_discoveries;
create policy "word_discoveries_insert_own" on public.word_discoveries
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "word_discoveries_update_own" on public.word_discoveries;
create policy "word_discoveries_update_own" on public.word_discoveries
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- ---- vocabulary: soal boleh dibaca semua user (board di-generate dari sini) ----
drop policy if exists "vocabulary_select_auth" on public.vocabulary;
create policy "vocabulary_select_auth" on public.vocabulary
  for select using (auth.role() = 'authenticated');

drop policy if exists "vocabulary_select_anon" on public.vocabulary;
create policy "vocabulary_select_anon" on public.vocabulary
  for select using (auth.role() = 'anon');
