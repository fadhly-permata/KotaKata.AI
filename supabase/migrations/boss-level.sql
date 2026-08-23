-- ============================================================
-- KotaKata AI — Level Boss (PLAN-099)
-- ============================================================
-- Jumlah kemenangan boss tersimpan di profil agar sinkron lintas perangkat.

ALTER TABLE users ADD COLUMN IF NOT EXISTS boss_wins integer NOT NULL DEFAULT 0;
