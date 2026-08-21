-- ============================================================
-- KotaKata AI — app_theme_id + drop board/keyboard theme columns
-- ============================================================
-- 1) Tambah kolom app_theme_id (text) untuk menyimpan tema aktif user.
-- 2) Drop board_theme_id & keyboard_theme_id yang sudah tidak dipakai
--    sejak PLAN-033 (board/keyboard selalu mengikuti tema app).
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/app-theme-sync.sql
-- ============================================================

-- Tambah kolom app_theme_id (idempotent)
alter table public.users add column if not exists app_theme_id text;

-- Drop kolom lama yang sudah tidak dipakai (idempotent via DO block)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'board_theme_id') then
    alter table public.users drop column board_theme_id;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'keyboard_theme_id') then
    alter table public.users drop column keyboard_theme_id;
  end if;
end
$$;
