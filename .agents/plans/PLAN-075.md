# PLAN-075: Revisi Halaman Editor Soal

## Status: PENDING

### 1. Tampilkan Semua Tier (bukan cuma Tier 1)
- [ ] Cek query Supabase di QuestionEditorScreen — pastikan tidak filter tier
- [ ] Jika ada filter tier, hapus supaya semua tier (1-10) tampil

### 2. Tombol Tambah Soal (+)
- [ ] Tambah tombol "+" icon di halaman (atas/kanan)
- [ ] Buka form/modal untuk input: word, clue_1, clue_2, clue_3, tier
- [ ] Simpan ke tabel vocabulary di Supabase

### 3. Collapsible Filter (Word + Tier)
- [ ] Buat section collapsible/expandable untuk filter
- [ ] Field: search by word (text input)
- [ ] Field: filter by tier (dropdown/selector)
- [ ] Filter diterapkan ke daftar soal
