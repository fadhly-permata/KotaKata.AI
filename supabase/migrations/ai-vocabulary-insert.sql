-- ============================================================
-- KotaKata AI — Simpan Soal AI ke Vocabulary (insert_ai_vocabulary)
-- ============================================================
-- Main Mode AI: setiap kali user main mode AI, soal-soal (kata + clue) yang
-- di-generate provider dan BELUM terdaftar di tabel vocabulary disimpan ke
-- database supaya kosakata game makin bertambah.
--
-- Kenapa RPC (security definer) dan bukan policy INSERT biasa?
--   - Policy INSERT terbuka di tabel vocabulary akan membiarkan user menulis
--     baris apa pun (bisa meracuni pool soal). RPC ini memvalidasi bentuk
--     kata (hanya a-z 3-10 huruf) & clue, memberi word_id berprefix "ai-",
--     dan melewati RLS karena security definer.
--   - Dedup: kata yang sudah ada (word sama persis) tidak ditulis ulang.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/ai-vocabulary-insert.sql
-- ============================================================

create or replace function public.insert_ai_vocabulary(
  p_words jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_word text;
  v_clue_1 text;
  v_clue_2 text;
  v_tier int;
  v_id text;
  v_seq int := 0;
  rec record;
begin
  if auth.uid() is null then
    raise exception 'Tidak ada sesi aktif';
  end if;

  if jsonb_typeof(p_words) <> 'array' then
    raise exception 'p_words harus berupa array JSON';
  end if;

  for rec in
    select (item ->> 'word') as word,
           (item ->> 'clue_1') as clue_1,
           (item ->> 'clue_2') as clue_2,
           (item ->> 'tier_level')::int as tier_level
    from jsonb_array_elements(p_words) as item
  loop
    v_word := lower(trim(coalesce(rec.word, '')));
    v_clue_1 := trim(coalesce(rec.clue_1, ''));
    v_clue_2 := trim(coalesce(rec.clue_2, ''));
    v_tier := least(10, greatest(1, coalesce(rec.tier_level, 1)));

    -- Validasi bentuk: hanya huruf a-z, 3-10 huruf, clue_1 minimal 4 karakter.
    if v_word !~ '^[a-z]{3,10}$' then
      continue;
    end if;
    if char_length(v_clue_1) < 4 then
      continue;
    end if;

    -- Dedup: lewati kata yang sudah terdaftar (word unik di vocabulary).
    if exists (select 1 from public.vocabulary where word = v_word) then
      continue;
    end if;

    v_seq := v_seq + 1;
    v_id := 'ai-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || lpad(v_seq::text, 4, '0');

    insert into public.vocabulary (word_id, word, clue_1, clue_2, clue_3, tier_level)
    values (v_id, v_word, v_clue_1, nullif(v_clue_2, ''), null, v_tier);

    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

-- Hanya user yang sudah login yang boleh memanggil (anon dicabut eksplisit).
revoke all on function public.insert_ai_vocabulary(jsonb) from public;
revoke execute on function public.insert_ai_vocabulary(jsonb) from anon;
grant execute on function public.insert_ai_vocabulary(jsonb) to authenticated;
