-- ============================================================
-- KotaKata AI — word_discoveries jadi FK-only ke vocabulary
-- 1) Remap baris lama yang word_id-nya masih teks kata (mis. 'tak')
--    ke word_id vocabulary asli ('t1-xxx')
-- 2) Hapus baris yang tetap tidak punya padanan di vocabulary
-- 3) Hapus kolom redundan (word, clue_1, clue_2, clue_3)
-- 4) Tambah FK word_discoveries.word_id → vocabulary.word_id
-- ============================================================

-- 1) Remap baris lama: word_id berisi teks kata → word_id vocabulary asli
update public.word_discoveries d
set word_id = v.word_id
from public.vocabulary v
where v.word = d.word_id
  and d.word_id not in (select word_id from public.vocabulary);

-- 2) Hapus baris yang masih orphan (tidak ada padanannya di vocabulary)
delete from public.word_discoveries d
where not exists (select 1 from public.vocabulary v where v.word_id = d.word_id);

-- 3) Hapus kolom redundan — kata & clue dibaca via join ke vocabulary
alter table public.word_discoveries drop column if exists word;
alter table public.word_discoveries drop column if exists clue_1;
alter table public.word_discoveries drop column if exists clue_2;
alter table public.word_discoveries drop column if exists clue_3;

-- 4) FK ke vocabulary (kaskade: vocabulary dihapus → discovery ikut terhapus)
alter table public.word_discoveries
  add constraint word_discoveries_word_id_fkey
  foreign key (word_id) references public.vocabulary(word_id) on delete cascade;
