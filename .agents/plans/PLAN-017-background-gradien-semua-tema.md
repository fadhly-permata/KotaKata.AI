# Background Image & Gradien untuk Semua Tema

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 017`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Pemilik repo minta tema bisa memakai **background** — sebelumnya latar hanya
warna solid (`colors.background`). Revisi ini menambahkan **BackgroundSpec**:
gradien warna (dirender via `react-native-svg` yang sudah terpasang, tanpa
modul native baru) + dukungan **URL gambar latar** (`imageUrl`, opsional,
dengan fallback gradien/warna solid saat offline) + overlay kontras teks.

## Solusi

1. **Registry `themeData.ts`** — tipe `BackgroundSpec` (`color`, `gradient`,
   `direction`, `imageUrl`, `overlay`) dipasang di palet app, papan, keyboard.
   Semua 4 tema aplikasi + 3 tema papan + 2 tema keyboard diberi gradien.
2. **Komponen `ThemedBackground`** — lapisan latar reusable: warna solid →
   gradien SVG → gambar (ImageBackground) → overlay.
3. **`ThemeProvider`** — expose `background` (app), `boardBackground` (papan),
   `keyboardBackground` (keyboard) yang sudah di-resolve per mode terang/gelap.
4. **`ScreenFade`** — otomatis merender latar tema aplikasi di belakang konten
   semua halaman (hampir semua layar memakai ScreenFade → berlaku serentak).
5. **GameScreen** pakai latar **tema papan**; **InGameKeyboard** pakai latar
   tema keyboard; MarkdownScreen dibuat transparan supaya gradien terlihat.
6. **Pasar/Store** — mockup preview ikut merender gradien/gambar
   (ThemePreviewModal), objek `background` diloloskan dari DB/registry.
7. **DB** — tidak perlu ubah schema (palet jsonb); regenerasi seed + push.

## Langkah

- [x] **1. Registry & tipe** — BackgroundSpec + gradien semua tema (app/papan/keyboard).
- [x] **2. Komponen ThemedBackground** — solid → gradien SVG → gambar → overlay.
- [x] **3. ThemeProvider & ScreenFade** — expose 3 spec latar; ScreenFade render otomatis.
- [x] **4. Wiring layar** — GameScreen (latar papan), InGameKeyboard (latar keyboard),
  MarkdownScreen (transparan).
- [x] **5. Pasar** — colorMapOf loloskan `background`; ThemePreviewModal render gradien.
- [x] **6. DB & dokumen** — regenerasi `supabase/data/themes.sql` + push; README,
  RELEASE_NOTES; verifikasi tsc + test + lint.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 017 <no> "teks"`)_
