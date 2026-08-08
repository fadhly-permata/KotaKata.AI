-- ============================================================
-- KotaKata AI — Identitas guest berbasis device (UUID di AsyncStorage)
-- ============================================================
-- 1) users.device_id: jangkar device untuk user tamu (anon). Diisi hanya oleh
--    session anonim; user email/Google tidak pernah menuliskannya supaya data
--    akun asli tidak ikut "diklaim" guest di device yang sama.
-- 2) RPC restore_guest_identity: ketika session anonim BARU dibuat di device
--    yang sama (session hilang / data auth terhapus / reinstall), pindahkan
--    word_discoveries + saved_boards + profil dari uid anonim lama ke uid baru.
--    Idempotent & aman dijalankan ulang (no-op kalau tidak ada data lama).
-- Jalankan: node scripts/supabase-run.mjs supabase/guest-device-identity.sql
-- ============================================================

alter table public.users add column if not exists device_id text;

create or replace function public.restore_guest_identity(p_device_id text, p_new_uid text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  -- Semua profil yang tertaut ke device ini selain uid yang sedang aktif.
  for rec in
    select user_id
    from public.users
    where device_id = p_device_id
      and user_id <> p_new_uid
  loop
    -- Pastikan uid baru punya baris profil (salin dari profil lama kalau belum ada),
    -- karena FK word_discoveries/saved_boards → users(user_id) mensyaratkannya.
    if not exists (select 1 from public.users where user_id = p_new_uid) then
      insert into public.users (user_id, display_name, email, total_xp, current_tier, coins, device_id, updated_at)
      select p_new_uid, display_name, email, total_xp, current_tier, coins, p_device_id, now()
      from public.users
      where user_id = rec.user_id;
    end if;

    -- Pindahkan riwayat & board ke uid baru.
    update public.word_discoveries set user_id = p_new_uid where user_id = rec.user_id;
    update public.saved_boards set user_id = p_new_uid where user_id = rec.user_id;

    -- Profil lama tidak diperlukan lagi.
    delete from public.users where user_id = rec.user_id;
  end loop;

  return true;
end;
$$;

grant execute on function public.restore_guest_identity(text, text) to anon, authenticated;
