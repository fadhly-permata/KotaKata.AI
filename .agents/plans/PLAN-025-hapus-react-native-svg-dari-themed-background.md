# Hapus penggunaan react-native-svg dari ThemedBackground

<!-- status: pending -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 025`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Tambahkan revisi juga untuk ThemedBackground itu hapus aja penggunaan
> react-native-svg deh. Biar gak force close lagi."

**Tujuan:** hilangkan `react-native-svg` dari render latar tema
(`ThemedBackground`) sebagai langkah mitigasi force close (terkait dugaan
PLAN-023/024 — react-native-svg gradien di Android lama/modern).

**Cakupan yang diminta:** hanya `ThemedBackground.tsx` (gradien latar via
`Svg`/`Defs`/`LinearGradient`/`Rect`).

**Catatan penting untuk pemilik (belum diputuskan):**
- `react-native-svg` masih dipakai DI LUAR ThemedBackground: `ProgressRing.tsx`
  (progress ring in-game) dan 5 ikon (`KeyboardIcon`, `ListNumbersIcon`,
  `NextIcon`, `NumberSquareIcon`, `ZoomIcon`) + kemungkinan type import di
  `themeData.ts`. Kalau mau **menghapus dependency `react-native-svg`
  sepenuhnya** dari package.json, itu scope lebih besar (ganti ring + semua
  ikon) — perlu keputusan terpisah.

**Opsi pengganti gradien (untuk dipilih saat dikerjakan):**
1. Lapisan warna bertumpuk (beberapa `View` semi-transparan) — tanpa modul native baru.
2. `ImageBackground` dengan gambar gradien statis (di-hosting / aset lokal) — mendukung tema Samudra/Senja.
3. `expo-linear-gradient` (modul native baru — perlu instalasi; kehati-hatian karena tujuannya mengurangi crash native).

## Langkah (rencana, belum dikerjakan)

- [ ] **1. Putuskan pengganti** — pilih pendekatan gradien non-SVG (opsi di atas).
- [ ] **2. Implementasi** — tulis ulang `ThemedBackground` tanpa react-native-svg; pastikan fallback warna solid & overlay tetap.
- [ ] **3. Verifikasi** — tsc + test + lint; preview web & (kalau bisa) device; pastikan tidak ada perubahan visual berarti.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 025 <no> "teks"`)_
