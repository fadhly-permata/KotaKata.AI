-- ============================================================
-- KotaKata AI — Perbaikan skema tabel user
-- Aplikasi membuat ID string (board-xxx / disc-xxx / t1-001),
-- sedangkan kolom di DB masih uuid → semua sync bakal gagal.
-- 1) saved_boards.board_id:        uuid → text
-- 2) word_discoveries.discovery_id: uuid → text
-- 3) word_discoveries.word_id:      uuid → text (referensi vocabulary.word_id yg text)
-- 4) Hapus vocabulary_collection — tabel sisa yang tidak dipakai kode mana pun.
--    (word_discoveries.word_id punya FK ke tabel ini, drop FK-nya dulu)
-- ============================================================

alter table public.saved_boards alter column board_id type text;

alter table public.word_discoveries drop constraint if exists word_discoveries_word_id_fkey;
alter table public.word_discoveries alter column discovery_id type text;
alter table public.word_discoveries alter column word_id type text;

drop table if exists public.vocabulary_collection;
