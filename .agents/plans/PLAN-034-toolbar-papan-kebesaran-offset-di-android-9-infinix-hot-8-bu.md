# Toolbar papan kebesaran & offset di Android 9 (Infinix Hot 8) — buat responsif

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 034`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Halaman In-Game: Desain papan toolbar selalu tampak kebesaran dan offset
> ketika menggunakan layar ponsel android 9 (ponsel tua berumur 10 tahun,
> merek infinix hot 8). perbaiki dong, kalo bisa dibuat responsif aja biar
> rapi di berbagai ukuran layar."

**Tujuan:** toolbar di halaman In-Game (papan permainan) tampak terlalu besar
dan bergeser/offset di layar Android 9 (Infinix Hot 8 — layar kecil/lama).
Buat responsif agar rapi di berbagai ukuran layar.

## Langkah

- [x] **1. Reproduksi & identifikasi layout** — periksa komponen toolbar
  halaman In-Game, ukuran (padding, margin, font, dimensi tetap) dan cara
  layout saat ini; catat dimensi Infinix Hot 8 (720x1560, ~6.5", Android 9).
- [x] **2. Buat responsif** — sesuaikan ukuran toolbar (skala/fluid sizing,
  hitung dari `useWindowDimensions`, hindari offset) agar proporsional di
  layar kecil/lama maupun layar besar.
- [x] **3. Verifikasi** — tsc + tes, cek tampilan di berbagai ukuran (mode
  responsive web preview) & pastikan tidak ada offset.

## Catatan Revisi

- **2.** 2026-08-16: Dikerjakan batch 2026-08-16: GameActionBar radius 999 (pill) diganti 22 — panel membungkus 2 baris di layar ponsel sempit, pill 999 membuat kapsul raksasa (tampak kebesaran/offset di Android 9); GameTopBar responsif: padding/gap mengecil saat compactBar, divider disembunyikan, ProgressRing 30px (dari 34), XP pill flexShrink + numberOfLines, maxFontSizeMultiplier 1.2 pada teks agar tidak meledak di font scale besar.
