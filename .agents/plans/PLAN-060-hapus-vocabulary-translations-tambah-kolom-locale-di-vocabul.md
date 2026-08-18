# Hapus vocabulary_translations, tambah kolom locale di vocabulary

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 060`

## Revisi (dari pemilik)

> "Kenapa sekarang ada table baru 'vocabulary_translation', kenapa gak modif
> aja table yang udah ada sekarang dengan menambahkan kolom 'locale' jangan
> redundan lah."

**Tujuan:** hapus tabel `vocabulary_translations` (redundan) dan
**menormalisasi** data multi-language dengan menambahkan kolom `locale` langsung
ke tabel `vocabulary` yang sudah ada.

## Cakupan

- **DB:** drop tabel `vocabulary_translations`; tambah kolom `locale text not
  null default 'id'` ke `vocabulary` + update unique constraint (word_id harus
  unik per locale: `UNIQUE(word_id, locale)` atau index komposit).
- **Migrasi data:** data kosakata existing semua berbahasa Indonesia — set
  `locale = 'id'` secara implisit via default.
- **Generator SQL** (`gen-vocab-sql.mjs` / `vocabulary.sql`): tambah kolom
  `locale` di INSERT.
- **Frontend:** filter query vocabulary berdasarkan locale aktif (default 'id')
  — yang sudah ada tetap jalan tanpa perubahan karena default-nya 'id'.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan)_
