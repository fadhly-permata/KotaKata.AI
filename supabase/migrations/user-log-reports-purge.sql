-- ============================================================
-- KotaKata AI — Auto-purge user_log_reports (retensi log)
-- ============================================================
-- Row laporan log yang dikirim user hanya disimpan SEMENTARA untuk
-- debugging (tabel user_log_reports dibuat di user-log-reports.sql).
-- Job pg_cron di bawah ini menghapus row yang berumur > 30 hari secara
-- otomatis, sekali sehari pukul 03.00 UTC (jam pemakaian rendah), agar
-- tabel tidak membengkak tanpa henti.
--
-- Mengubah retensi: ganti interval '30 days' di bawah (mis. '14 days',
-- '60 days') lalu jalankan ulang file ini — job lama di-unschedule dulu,
-- jadi idempotent.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/user-log-reports-purge.sql
-- ============================================================

-- 1) Pastikan pg_cron aktif (idempotent; sudah aktif bila extension ada).
create extension if not exists pg_cron with schema extensions;

-- 2) (Re)buat job harian: hapus laporan log berumur > 30 hari.
--    Idempotent: unschedule dulu bila job dengan nama sama sudah ada.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-user-log-reports') then
    perform cron.unschedule('purge-user-log-reports');
  end if;

  perform cron.schedule(
    'purge-user-log-reports',
    '0 3 * * *',
    $cron$ delete from public.user_log_reports where created_at < now() - interval '30 days' $cron$
  );
end
$$;
