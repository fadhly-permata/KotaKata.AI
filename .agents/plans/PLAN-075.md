# PLAN-075: Revisi Halaman Editor Soal — Tampilkan Semua Tier

## Status: PENDING

> Catatan: plan ini dipecah (permintaan pemilik). Bagian "Tambah Soal (+)"
> kini jadi **PLAN-078** dan bagian "Collapsible Filter" jadi **PLAN-079**.

## Deskripsi
Halaman QuestionEditorScreen hanya menampilkan Tier 1.
Revisi: pastikan semua tier (1–10) tampil di daftar soal.

## Langkah
- [ ] Cek query Supabase di QuestionEditorScreen — pastikan tidak filter tier
- [ ] Jika ada filter tier, hapus supaya semua tier (1-10) tampil
