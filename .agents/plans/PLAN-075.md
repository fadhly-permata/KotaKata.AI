# PLAN-075: Revisi Halaman Editor Soal — Tampilkan Semua Tier

## Status: DONE

> Catatan: plan ini dipecah (permintaan pemilik). Bagian "Tambah Soal (+)"
> kini jadi **PLAN-078** dan bagian "Collapsible Filter" jadi **PLAN-079**.
>
> Verifikasi 22 Agustus 2026: query `fetchWords` di QuestionEditorScreen
> mengambil SEMUA baris tabel `vocabulary` tanpa filter tier
> (`select(VOCAB_COLUMNS).order("tier_level").order("word")`) — semua tier
> 1–10 sudah tampil di daftar soal.

## Deskripsi
Halaman QuestionEditorScreen hanya menampilkan Tier 1.
Revisi: pastikan semua tier (1–10) tampil di daftar soal.

## Langkah
- [x] Cek query Supabase di QuestionEditorScreen — pastikan tidak filter tier
- [x] Jika ada filter tier, hapus supaya semua tier (1-10) tampil
      (hasil cek: tidak ada filter tier — query sudah benar)
