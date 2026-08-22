# PLAN-078: Editor Soal — Fitur "Tambah Soal" dengan Icon Plus (+)

## Status: DONE

## Deskripsi (dari pemilik)
Editor soal: buatkan fitur **"Tambah Soal"** dengan icon tanda Plus (+) untuk
menambahkan soal baru.

## Langkah
- [x] Tambah tombol "+" icon di halaman (atas/kanan — di header, kanan judul)
- [x] Buka form/modal untuk input: word, clue_1, clue_2, clue_3, tier
      (modal AppModal "➕ Tambah Soal")
- [x] Simpan ke tabel vocabulary di Supabase — via RPC baru
      `insert_vocabulary_admin` (security definer + cek email admin, dedup
      kata, word_id prefix `admin-`), migration:
      `supabase/migrations/admin-vocabulary-insert.sql` (sudah di-push ke
      Supabase via scripts/db/supabase-run.mjs)
- [x] Verifikasi: tsc --noEmit ✅ · bun test 69 pass ✅
