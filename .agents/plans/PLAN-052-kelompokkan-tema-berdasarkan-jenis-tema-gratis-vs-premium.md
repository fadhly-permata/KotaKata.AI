# Kelompokkan tema berdasarkan jenis: tema gratis vs premium

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 052`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Kelompokkan tema berdasarkan jenis temanya. Jadi ada tema gratis dan ada
> tema premium. Tema gratis adalah: Puitis, Senja, Hutan, dan Samudra.
> Tema yang lain adalah tema premium."

**Tujuan:** di halaman Pasar (Store), tema aplikasi dikelompokkan per jenis:
**Gratis** (Puitis, Senja, Hutan, Samudra) dan **Premium** (semua tema lain
yang ada di katalog — saat ini Neumorfik, Glassmorphism, Claymorphism,
Neo-Brutalism, Minimalist UI, Frost UI, dan tema premium lain yang muncul
di katalog DB).

## Cakupan

- Halaman Pasar / Store (`StoreScreen` atau file terkait di
  `src/features/store/` / komponen tema).
- Registry/katalog tema (`themeData.ts` / data tema dari DB Supabase
  `themes` + seed `themes.sql` / generator `gen-themes-sql.mjs`) — perlu
  penanda jenis tema (gratis vs premium).
- Kemungkinan: penanda `isPremium`/jenis di data tema (registry lokal +
  seed DB), seksi/grup terpisah di Pasar dengan label "Gratis" & "Premium".

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 052 <no> "teks"`)_
