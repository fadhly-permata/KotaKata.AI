# Tombol Preview Tema di Halaman Pasar

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 015`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Revisi dari pemilik repo: tiap tema di halaman Pasar (Store) perlu tombol
**Preview** supaya user bisa melihat efek tema (aplikasi / papan / keyboard)
SEBELUM menekan "Aktifkan".

## Solusi

- Komponen baru `src/features/store/ThemePreviewModal.tsx` — modal (AppModal)
  yang menampilkan **mockup sesuai jenis tema** yang diwarnai dengan palet tema
  yang sedang di-preview:
  - **app** → mockup halaman utama (header + XP pill, hero, kartu menu, tombol
    primary/soft/outlined, strip swatch).
  - **board** → mockup grid mini (sel aktif/terpilih/highlight/solved/blocked),
    clue pill (soal), dan panel hint (action bar).
  - **keyboard** → mockup keyboard (panel, baris huruf, backspace, tombol nav).
  - Ada toggle **☀️ Terang / 🌙 Gelap** di dalam modal untuk melihat kedua mode.
- `StoreScreen`: model kartu diperluas dengan `kind` + `palettes` lengkap
  (light/dark) dari DB atau registry lokal; tiap kartu mendapat tombol
  **"👁 Preview"** di samping tombol Aktifkan. Preview murni state UI — tidak
  mengubah pilihan tema sampai user mengaktifkannya.

## Langkah

- [x] **1. Modal preview** — `ThemePreviewModal.tsx` dengan mockup 3 jenis tema
  + toggle terang/gelap.
- [x] **2. Wire di Pasar** — `ThemeCardModel` + palet lengkap, tombol Preview per
  kartu, render modal dari `StoreScreen`.
- [x] **3. Dokumen & verifikasi** — RELEASE_NOTES + README; tsc + test + lint.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 015 <no> "teks"`)_
