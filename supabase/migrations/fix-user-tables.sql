-- ============================================================
-- KotaKata AI — Perbaikan skema tabel user
-- Aplikasi membuat ID string (board-xxx / disc-xxx / t1-001),
-- sedangkan kolom di DB masih uuid → semua sync bakal gagal.
-- 1) users.user_id:                 uuid → text
-- 2) saved_boards.board_id:         uuid → text
-- 3) saved_boards.user_id:          uuid → text
-- 4) word_discoveries.user_id:      uuid → text
-- 5) word_discoveries.discovery_id: uuid → text
-- 6) word_discoveries.word_id:      uuid → text (referensi vocabulary.word_id yg text)
-- 7) Hapus vocabulary_collection — tabel sisa yang tidak dipakai kode mana pun.
-- ============================================================

-- RLS policy yang lama ikut menghalangi ALTER TYPE ("column used in a policy
-- definition"), jadi semua policy di 3 tabel dilepas dulu. rls-policies.sql
-- akan membuatnya ulang dengan ekspresi yang cocok untuk kolom text.
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users', 'saved_boards', 'word_discoveries')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- FK yang menempel di kolom user_id harus dilepas dulu: PostgreSQL tidak bisa
-- mengubah tipe kolom yang dipakai constraint. FK lama ke auth.users(id) yang
-- bertipe uuid tidak bisa dipertahankan setelah user_id jadi text — akses
-- tetap aman karena RLS membatasi tiap user ke barisnya sendiri.
alter table public.saved_boards drop constraint if exists saved_boards_user_id_fkey;
alter table public.word_discoveries drop constraint if exists word_discoveries_user_id_fkey;
alter table public.users drop constraint if exists users_user_id_fkey;

alter table public.users alter column user_id type text;
alter table public.saved_boards alter column board_id type text;
alter table public.saved_boards alter column user_id type text;
alter table public.word_discoveries alter column user_id type text;
alter table public.word_discoveries alter column discovery_id type text;
alter table public.word_discoveries alter column word_id type text;

-- Pasang ulang FK user_id → users.user_id (kini sama-sama text).
alter table public.saved_boards
  add constraint saved_boards_user_id_fkey
  foreign key (user_id) references public.users(user_id) on delete cascade;
alter table public.word_discoveries
  add constraint word_discoveries_user_id_fkey
  foreign key (user_id) references public.users(user_id) on delete cascade;

drop table if exists public.vocabulary_collection;
