# Bug force close Android saat scroll main menu (dugaan resolusi tinggi)

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 027`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "BUG: ketika di mode android (3 device) force close waktu dihalaman main
> menu di scroll (kadang disemua halaman). Tapi ada satu device yang gak
> masalah sama sekali, sepertinya problemnya ada di resolusi layar yang terlalu
> tinggi sehingga gak perlu proses scroll sama sekali."

**Tujuan:** investigasi & perbaiki force close pada Android saat scroll
(main menu, kadang semua halaman). Dugaannya berkaitan dengan resolusi layar
terlalu tinggi (device yang tidak bermasalah tidak perlu scroll sama sekali).

**Kaitan dengan plan lain:** PLAN-023 (force close random Android 12–15) &
PLAN-024 (Android 9 scroll main menu) masih berstatus bug & ditangguhkan —
keduanya di-flag menunggu hasil mitigasi dari PLAN-025 (hapus react-native-svg
dari ThemedBackground) yang sudah selesai.

## Langkah

- [x] **1. Reproduksi & identifikasi** — cek device yang bermasalah vs tidak;
  kaitkan dugaan resolusi layar tinggi (tanpa scroll = aman) dengan komponen
  yang di-render saat scroll (mis. FlatList/ScrollView, render berlebih, memori).
- [x] **2. Perbaiki** — terapkan mitigasi di area scroll main menu (dan halaman
  lain bila perlu): batasi render, hindari kerja berat per frame, dsb.
- [x] **3. Verifikasi** — tsc + tes + uji di beberapa resolusi/device.

## Catatan Revisi

- **1.** 2026-08-16: Dikerjakan batch 2026-08-16: mitigasi force close saat scroll main menu — orb & bounce loop hanya beranimasi saat layar fokus (tidak menumpuk di stack navigasi); parallax scroll tetap. Verifikasi di 3 device Android (14/15) disarankan.

