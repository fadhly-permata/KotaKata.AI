-- ============================================================
-- KotaKata AI — Leaderboard (get_leaderboard)
-- ============================================================
-- Leaderboard butuh melihat SEMUA pemain, sedangkan RLS tabel users hanya
-- mengizinkan user melihat barisnya sendiri (users_select_own). Karena itu
-- dibuat RPC security definer yang mengembalikan HANYA kolom publik
-- (user_id, display_name, total_xp, current_tier, updated_at — tanpa
-- email/device_id) dengan urutan: total_xp DESC, lalu updated_at ASC
-- (pemain yang MENCAPAI XP yang sama lebih dulu menang — "level & waktu
-- kenaikan").
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/leaderboard-rpc.sql
-- ============================================================

create or replace function public.get_leaderboard()
returns table (
  user_id text,
  display_name text,
  total_xp integer,
  current_tier integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.user_id::text,
         u.display_name::text,
         u.total_xp::integer,
         u.current_tier::integer,
         u.updated_at::timestamptz
  from public.users u
  order by u.total_xp desc, u.updated_at asc
$$;

-- Hanya user yang sudah login yang boleh memanggil (anon dicabut eksplisit).
revoke all on function public.get_leaderboard() from public;
revoke execute on function public.get_leaderboard() from anon;
grant execute on function public.get_leaderboard() to authenticated;
