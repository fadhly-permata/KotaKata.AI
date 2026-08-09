-- ============================================================
-- KotaKata AI — Sinkronisasi Config Provider AI lintas device
-- ============================================================
-- Config provider AI (provider + API key + model + base URL) sebelumnya hanya
-- disimpan di AsyncStorage perangkat (BYOK). User yang login dengan akun yang
-- sama di device lain kehilangan akses Main Mode AI karena config tidak ada di
-- perangkat itu.
--
-- Solusi: kolom ai_provider_config (jsonb) di tabel users. RLS existing
-- (users_select_own / users_update_own) sudah membatasi akses ke baris
-- pemiliknya — config hanya bisa dibaca/diubah oleh akun pemilik.
--
-- restore_guest_identity di-recreate supaya saat identitas guest dipulihkan
-- (session anonim berganti di device yang sama), config AI ikut pindah ke uid
-- yang baru.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/ai-provider-sync.sql
-- ============================================================

alter table public.users add column if not exists ai_provider_config jsonb;

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
    -- ai_provider_config ikut disalin supaya config AI guest tidak hilang.
    if not exists (select 1 from public.users where user_id = p_new_uid) then
      insert into public.users (user_id, display_name, email, total_xp, current_tier, coins, device_id, ai_provider_config, updated_at)
      select p_new_uid, display_name, email, total_xp, current_tier, coins, p_device_id, ai_provider_config, now()
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
