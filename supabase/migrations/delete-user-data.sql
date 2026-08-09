-- ============================================================
-- KotaKata AI — Hapus Akun Permanen (delete_user_data)
-- ============================================================
-- Menghapus SEMUA data milik user yang sedang login (auth.uid()):
--   word_discoveries → saved_boards → users → auth.users
-- Security definer: klien anonim TIDAK punya izin menghapus auth.users,
-- jadi eksekusi dijalankan sebagai pemilik fungsi (postgres) yang punya
-- akses penuh. Hanya user yang sudah login yang boleh memanggilnya.
--
-- Idempotent & aman: baris yang sudah tidak ada di-skip (delete tanpa match
-- tidak error), user lain tidak tersentuh (filter auth.uid()).
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/delete-user-data.sql
-- ============================================================

create or replace function public.delete_user_data()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Tidak ada sesi aktif';
  end if;

  -- Kolom user_id di tabel publik bertipe TEXT (lihat fix-user-tables.sql),
  -- sedangkan auth.users.id bertipe UUID.
  delete from public.word_discoveries where user_id = v_uid::text;
  delete from public.saved_boards where user_id = v_uid::text;
  delete from public.users where user_id = v_uid::text;
  delete from auth.users where id = v_uid;

  return true;
end;
$$;

-- Hanya role yang sudah login (termasuk guest anonim) yang boleh memanggil.
-- anon dicabut EKSPLISIT (default Supabase memberinya EXECUTE) — walau fungsi
-- sudah punya guard auth.uid() != null, lebih aman tidak memberi akses sama
-- sekali ke request tanpa sesi.
revoke all on function public.delete_user_data() from public;
revoke execute on function public.delete_user_data() from anon;
grant execute on function public.delete_user_data() to authenticated;
