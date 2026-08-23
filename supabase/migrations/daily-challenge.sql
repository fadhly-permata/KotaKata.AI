-- ============================================================
-- KotaKata AI — Tantangan Harian / Daily Challenge (PLAN-097)
-- ============================================================
-- Streak & tanggal terakhir selesai disimpan di profil user agar
-- sinkron lintas perangkat.

ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_last_done date;
