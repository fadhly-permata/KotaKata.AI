# Hapus penggunaan react-native-svg dari ThemedBackground

<!-- status: done -->
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

## Langkah

- [x] **1. Putuskan pengganti** — dipilih **lapisan `View` berwarna bertumpuk** (tanpa modul native baru): 10 band warna hasil interpolasi antar stop; arah vertical/horizontal/diagonal didukung (diagonal via rotate+scale dalam wadah overflow hidden).
- [x] **2. Implementasi** — `ThemedBackground.tsx` ditulis ulang tanpa react-native-svg (`GradientLayer` + `interpolateHex` + `buildBands`); warna solid dasar, `ImageBackground` (gambar URL), dan overlay kontras tetap. Komentar `themeData.ts` yang menyebut react-native-svg disesuaikan. `react-native-svg` TIDAK dihapus dari package.json karena masih dipakai `ProgressRing` & ikon (keputusan terpisah).
- [x] **3. Verifikasi** — tsc + 43 tes + lint lolos.

## Catatan Revisi

- Selesai dikerjakan bersama PLAN-021 & PLAN-022 (batch 2026-08-14). Diharapkan membantu kondisi force close (PLAN-023/024 — keduanya di-flag bug & ditangguhkan).
