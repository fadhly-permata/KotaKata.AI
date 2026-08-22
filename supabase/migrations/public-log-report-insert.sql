-- ============================================================
-- KotaKata AI — Log Error Publik Pre-Login (insert_public_log_report)
-- ============================================================
-- PLAN-080: error yang terjadi SEBELUM user login (mis. crash saat render
-- awal, gagal muat sesi) harus tetap tercatat di Supabase supaya bisa
-- diperbaiki. Tabel user_log_reports punya kolom user_id NOT NULL + policy
-- insert milik-user-sendiri, jadi klien anonim tidak bisa menulis langsung.
--
-- Solusi: RPC security definer yang:
--   - mengisi user_id dari sesi bila ada, kalau tidak ada pakai
--     "device:<device_id>" (identitas perangkat lokal), fallback "anonymous"
--   - memvalidasi level & ukuran payload (anti-spam ringan)
--   - TIDAK pernah melempar error ke pemanggil (return boolean) supaya
--     pelaporan error tidak pernah ikut crash
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/public-log-report-insert.sql
-- ============================================================

create or replace function public.insert_public_log_report(
  p_level text,
  p_payload jsonb,
  p_device_id text,
  p_platform text,
  p_app_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user text;
begin
  -- Hanya error/warn yang boleh masuk lewat pintu publik ini.
  if p_level not in ('error', 'warn') then
    return false;
  end if;

  -- Anti-spam ringan: payload maksimal ~64KB.
  if pg_column_size(p_payload) > 65536 then
    return false;
  end if;

  if v_uid is not null then
    v_user := v_uid::text;
  else
    -- Anonim: pakai identitas perangkat; tanpa itu pun tetap catat sebagai
    -- "anonymous" supaya error pre-login tidak pernah hilang.
    v_user := case
      when coalesce(trim(p_device_id), '') <> '' then 'device:' || left(trim(p_device_id), 64)
      else 'anonymous'
    end;
  end if;

  insert into public.user_log_reports (user_id, level, payload, device_id, platform, app_version)
  values (
    v_user,
    p_level,
    p_payload,
    nullif(coalesce(trim(p_device_id), ''), ''),
    nullif(coalesce(trim(p_platform), ''), ''),
    nullif(coalesce(trim(p_app_version), ''), '')
  );
  return true;
exception
  when others then
    -- Pelaporan error tidak boleh pernah gagal keras.
    return false;
end;
$$;

-- Bisa dipanggil siapa saja (anon termasuk) — fungsi sudah memvalidasi input.
revoke all on function public.insert_public_log_report(text, jsonb, text, text, text) from public;
grant execute on function public.insert_public_log_report(text, jsonb, text, text, text) to anon, authenticated;
