-- ============================================================
-- KotaKata AI — Laporan Log dari User (user_log_reports)
-- ============================================================
-- Halaman Log punya tombol "Kirim Log": entri level error/warning dikirim ke
-- tabel ini untuk debugging dari sisi developer. Payload menyimpan salinan
-- lengkap entri (message, source, details, stacktrace, inner exception),
-- sedangkan UI aplikasi tetap menampilkan format ringkas.
--
-- RLS: pemain hanya bisa insert/melihat/menghapus barisnya sendiri
-- (auth.uid()::text = user_id — konsisten dengan tabel users/boards).
--
-- delete_user_data di-recreate supaya hapus akun permanen juga membersihkan
-- log report (privasi: data debugging tidak boleh tersisa setelah akun dihapus).
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/user-log-reports.sql
-- ============================================================

create table if not exists public.user_log_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  level text not null check (level in ('error', 'warn')),
  payload jsonb not null,
  device_id text,
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);

alter table public.user_log_reports enable row level security;

-- ---- user_log_reports: pemain hanya mengelola barisnya sendiri ----
drop policy if exists "user_log_reports_insert_own" on public.user_log_reports;
create policy "user_log_reports_insert_own" on public.user_log_reports
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "user_log_reports_select_own" on public.user_log_reports;
create policy "user_log_reports_select_own" on public.user_log_reports
  for select using (auth.uid()::text = user_id);

drop policy if exists "user_log_reports_delete_own" on public.user_log_reports;
create policy "user_log_reports_delete_own" on public.user_log_reports
  for delete using (auth.uid()::text = user_id);

create index if not exists user_log_reports_user_created_idx
  on public.user_log_reports (user_id, created_at desc);

-- Hapus akun permanen juga membersihkan log report user.
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
  delete from public.user_log_reports where user_id = v_uid::text;
  delete from public.word_discoveries where user_id = v_uid::text;
  delete from public.saved_boards where user_id = v_uid::text;
  delete from public.users where user_id = v_uid::text;
  delete from auth.users where id = v_uid;

  return true;
end;
$$;

-- Hanya role yang sudah login (termasuk guest anonim) yang boleh memanggil.
revoke all on function public.delete_user_data() from public;
revoke execute on function public.delete_user_data() from anon;
grant execute on function public.delete_user_data() to authenticated;
