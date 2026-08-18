# Tambah aturan DRY & normalisasi data ke AGENTS.md

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 062`

## Revisi (dari pemilik)

> "Buat commands/skill/rules agar tidak menabrak konsep DRY dan selalu
> melakukan normalisasi data, jangan sampai ada struktur database yang
> redundan."

**Tujuan:** menambah aturan permanen di `AGENTS.md` agar semua pekerjaan
mengikuti prinsip **DRY** (Don't Repeat Yourself) dan **normalisasi data** —
terutama untuk struktur database. Mencegah tabel baru yang redundan seperti
`vocabulary_translations` dan `app_strings`.

## Cakupan

- Tambah aturan baru di `AGENTS.md` (di dalam blok `ATURAN_PROYEK`).
- Isi:
  1. **Normalisasi database wajib** — sebelum membuat tabel baru, pastikan
     data tidak bisa diakomodasi oleh tabel yang sudah ada (kolom tambah,
     foreign key, jsonb, enum, dll.). Jangan membuat tabel paralel untuk
     data yang seharusnya di tabel induk.
  2. **DRY untuk data terjemahan/konten** — string UI → file-based i18n
     (`src/i18n/*.ts`), bukan database. Data translatable di tabel induk
     pakai kolom `locale`, bukan tabel terpisah.
  3. **Schema konsisten** — semua tabel project di schema `kotakata_ai`,
     bukan `public`.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan)_
