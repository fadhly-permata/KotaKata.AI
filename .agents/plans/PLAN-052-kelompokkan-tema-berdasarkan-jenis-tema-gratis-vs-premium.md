# Kelompokkan tema berdasarkan jenis: tema gratis vs premium

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 052`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Kelompokkan tema berdasarkan jenis temanya. Jadi ada tema gratis dan ada
> tema premium. Tema gratis adalah: Puitis, Senja, Hutan, dan Samudra.
> Tema yang lain adalah tema premium."

**Tujuan:** di halaman Pasar (Store), tema aplikasi dikelompokkan per jenis:
**Gratis** (Puitis, Senja, Hutan, Samudra) dan **Premium** (semua tema lain
di katalog — saat ini Neumorfik, Glassmorphism, Claymorphism, Neo-Brutalism,
Minimalist UI, Frost UI).

## Cakupan

- Halaman Pasar / Store (`src/features/store/StoreScreen.tsx`) — grup Gratis
  & Premium di dalam seksi Tema Aplikasi.
- Registry/katalog tema (`src/presentation/themes/themeData.ts`) — field
  `themeType` ("free" | "premium") + konstanta `FREE_APP_IDS`.
- Database `themes` (migrasi + seed) — kolom baru `theme_type` dibawa
  generator `gen-themes-sql.mjs` → `supabase/data/themes.sql`, dibaca
  `themeRepository`.

## Langkah

- [x] **1. Data model** — `AppThemeDefinition` + field `themeType: ThemeTier`
  ("free" | "premium"); 4 tema gratis (Puitis/Samudra/Senja/Hutan) dan 6
  premium (Neumorfik/Glassmorphism/Claymorphism/Neo-Brutalism/Minimalist
  UI/Frost UI); `priceLabel` premium → "Premium"; konstanta `FREE_APP_IDS`
  untuk fallback tema papan/keyboard.
- [x] **2. Katalog cloud** — kolom `theme_type` di tabel `themes` (migrasi
  idempotent `add column if not exists` + check constraint), generator
  `gen-themes-sql.mjs` menulis kolomnya (34 tema: 12 free / 22 premium),
  `themeRepository` ikut select & memetakan `theme_type`.
- [x] **3. UI Pasar** — seksi Tema Aplikasi dipecah jadi grup **🆓 Gratis**
  (dulu) dan **💎 Premium** (header + jumlah tema), chip "💎 Premium" di
  kartu premium, hero & catatan bawah diperbarui (mekanisme pembelian
  premium menyusul).
- [x] **4. Verifikasi** — tsc + 50 tes lolos.
- [x] **5. Push DB & rilis** — migrasi + seed di-push ke Supabase (HTTP 201),
  diverifikasi: app = 4 free + 6 premium, board/keyboard ikut terisi
  konsisten; commit + push + deploy web (aturan #6).

## Catatan Revisi

- **1–5.** 2026-08-18: Dikerjakan atas perintah "kerjain semua plan yang
  masih pending". Tema gratis = Puitis, Samudra, Senja, Hutan; sisanya
  premium. Tema premium belum punya mekanisme pembelian — masih bisa
  diaktifkan seperti biasa (hanya pengelompokan, belum gembok).
