# Halaman Pasar (Store), Perbaikan Fullscreen, & Refactor Kode

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 013`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Revisi dari pemilik repo:

1. **Masih banyak halaman yang tampak seperti full-screen** — setelah Game
   diperbaiki (PLAN-012 sebelumnya), halaman lain masih menggambar konten
   sampai ke balik status bar / gesture bar Android (edge-to-edge Android 15+).
   Semua halaman harus memakai safe-area inset seperti aplikasi umum.
2. **File kode terlalu besar & sulit dirawat** — pecah jadi beberapa method /
   beberapa file. File terbesar: `GameScreen.tsx` (±1.570 baris),
   `MainMenuScreen.tsx` (±1.312), `gameStore.ts` (±834).
3. **Halaman Main** — tambah tombol memanjang di posisi paling bawah, label
   **"Pasar"**, navigasi ke halaman Store.
4. **Halaman Store** — untuk saat ini 1 tema (mendukung gelap/terang) dipilih
   sebagai default. Ke depan tema akan dijual (mata pencaharian sampingan),
   jadi katalog tema dibuat mudah dikembangkan.

## Langkah

- [x] **1. Perbaiki safe-area semua halaman (tidak tampak fullscreen)** —
  `TopBar` memakai `useSafeAreaInsets` untuk padding atas (dipakai History,
  GameHistory, BoardViewer, Profile, Settings, LogViewer, AiProvider);
  `MainMenuScreen` & `AuthScreen` ikut inset; Store baru ikut pola yang sama.

- [x] **2. Refactor `gameStore.ts`** — pisahkan helper murni (board word
  navigation/focus) ke file terpisah `gameBoardHelpers.ts`; store tetap
  berperilaku identik.

- [x] **3. Refactor `GameScreen.tsx`** — ekstrak komponen `GameTopBar`,
  `CluePill`, `GameActionBar` (plus konstanta zoom) ke
  `src/presentation/components/game/`; layar menjadi lebih ramping.

- [x] **4. Komponen bersama `FloatingOrbs`** — dedup kode orb parallax/bounce
  yang duplikat di `MainMenuScreen` & `AuthScreen`.

- [x] **5. Tombol "Pasar" di Halaman Main** — tombol memanjang di posisi
  paling bawah (di bawah Koleksi Terbaru) → navigasi ke `Store`.

- [x] **6. Halaman Store** — `src/features/store/StoreScreen.tsx` + katalog
  tema `src/presentation/themes/themeCatalog.ts` (1 tema default "Puitis",
  preview terang/gelap, badge "Tema Aktif · Default"); navigasi
  `Store` di RootNavigator; struktur siap ditambah tema baru.

- [x] **7. Dokumen & verifikasi** — perbarui `README.md` & `RELEASE_NOTES.md`;
  verifikasi `bun tsc -b --noEmit`, `bun test`, `bun lint`.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 013 <no> "teks"`)_
