# Multi-Tema: Pasar (Store) dengan Katalog dari Database + Tema Papan & Keyboard

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 014`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Revisi dari pemilik repo:

1. **Beberapa tema aplikasi lain** supaya pemain bisa mencoba *switch* tema,
   langsung didaftarkan di halaman Pasar.
2. **Data tema disimpan di database** — buat tabel baru (`themes`).
3. **2 tema lain untuk desain halaman game saja** — papan, soal (clue pill),
   dan panel hint (action bar).
4. **2 tema untuk desain keyboard** (InGameKeyboard).

## Arsitektur

- **Registry lokal** (`src/presentation/themes/themeData.ts`): sumber palet
  runtime (offline-first, tanpa menunggu jaringan) — 4 tema aplikasi
  (Puitis default, Samudra, Senja, Hutan), 3 tema papan (Puitis default,
  Tinta, Neon), 3 tema keyboard (Puitis default, Pastel, Klasik). Semua
  punya varian light & dark.
- **Database `themes`**: katalog + palet tersimpan di Supabase (tabel baru +
  RLS read-only untuk semua pengguna). Seed di-*generate* dari registry
  (`scripts/db/gen-themes-sql.ts` → `supabase/data/themes.sql`) dan di-push
  (`scripts/db/push-themes.mjs`) — pola sama dengan vocabulary.
- **Pilihan pemain** (`src/presentation/stores/themeSelection.ts`, zustand +
  AsyncStorage persist): `appThemeId`, `boardThemeId`, `keyboardThemeId`.
- **ThemeProvider** me-resolve tema global (aplikasi) + menyediakan
  `boardTheme` & `keyboardTheme` (varian light/dark mengikuti mode global).
- **Komponen game** membaca tema spesifik: CrosswordGrid/CluePill/GameActionBar
  pakai tema papan; InGameKeyboard pakai tema keyboard.
- **Halaman Pasar** membaca dari database (fallback registry lokal), 3 seksi:
  Tema Aplikasi / Tema Papan / Tema Keyboard — kartu bisa di-tap untuk
  langsung memilih (badge "✓ Tema Aktif" pada yang terpilih).

## Langkah

- [x] **1. Registry tema** — `themeData.ts`: tipe + daftar tema aplikasi,
  papan, keyboard (light & dark) + resolver by id + fallback default.

- [x] **2. Store pilihan & ThemeProvider** — `themeSelection.ts` (zustand +
  AsyncStorage); ThemeProvider expose `boardTheme`/`keyboardTheme` dan
  me-resolve tema global dari pilihan (default "Puitis").

- [x] **3. Wire komponen game** — CrosswordGrid, CluePill, GameActionBar
  memakai tema papan; InGameKeyboard memakai tema keyboard.

- [x] **4. Database** — `supabase/migrations/themes.sql` (tabel + RLS),
  generator SQL dari registry + `supabase/data/themes.sql`, script push,
  `themeRepository` di app (fetch katalog dari Supabase).

- [x] **5. Halaman Pasar multi-tema** — 3 seksi, ambil dari DB (fallback
  lokal), kartu bisa dipilih (switch langsung), hapus `themeCatalog.ts` lama.

- [x] **6. Dokumen & verifikasi** — README + RELEASE_NOTES; tsc + test + lint.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 014 <no> "teks"`)_
