-- ============================================================
-- KotaKata AI — Leaderboard paging + posisi user (get_leaderboard_paged,
-- get_leaderboard_rank)
-- ============================================================
-- Leaderboard lama (get_leaderboard) memuat SEMUA pemain sekaligus — tidak
-- scalable dan user di posisi jauh (mis. #100) tidak mungkin terlihat tanpa
-- scroll ribuan baris. Di-replace dengan:
--   1) get_leaderboard_paged(p_limit, p_offset) — halaman 25 baris + total
--      pemain (count(*) over()). UI melakukan lazy-load saat scroll ke bawah.
--   2) get_leaderboard_rank(p_user_id) — posisi (rank) & baris pemain yang
--      login, ditampilkan di atas tombol Tutup tanpa perlu scroll.
--
-- Urutan tetap sama: total_xp DESC, lalu updated_at ASC (pemain yang MENCAPAI
-- XP yang sama lebih dulu menang — "level & waktu kenaikan"). Keduanya
-- security definer karena RLS users hanya membolehkan user melihat barisnya
-- sendiri.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/leaderboard-paging.sql
-- ============================================================

drop function if exists public.get_leaderboard();

create or replace function public.get_leaderboard_paged(p_limit integer default 25, p_offset integer default 0)
returns table (
  user_id text,
  display_name text,
  total_xp integer,
  current_tier integer,
  updated_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  select u.user_id::text,
         u.display_name::text,
         u.total_xp::integer,
         u.current_tier::integer,
         u.updated_at::timestamptz,
         count(*) over()::bigint as total_count
  from public.users u
  order by u.total_xp desc, u.updated_at asc
  limit p_limit offset p_offset
$$;

create or replace function public.get_leaderboard_rank(p_user_id text)
returns table (
  rank bigint,
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
  select r.rank::bigint,
         u.user_id::text,
         u.display_name::text,
         u.total_xp::integer,
         u.current_tier::integer,
         u.updated_at::timestamptz
  from (
    select user_id,
           row_number() over (order by total_xp desc, updated_at asc)::bigint as rank
    from public.users
  ) r
  join public.users u on u.user_id = r.user_id
  where r.user_id = p_user_id
$$;

-- Hanya user yang sudah login yang boleh memanggil (anon dicabut eksplisit).
revoke all on function public.get_leaderboard_paged(integer, integer) from public;
revoke execute on function public.get_leaderboard_paged(integer, integer) from anon;
grant execute on function public.get_leaderboard_paged(integer, integer) to authenticated;

revoke all on function public.get_leaderboard_rank(text) from public;
revoke execute on function public.get_leaderboard_rank(text) from anon;
grant execute on function public.get_leaderboard_rank(text) to authenticated;
