# Papan hint di tablet/laptop kosong — non-ponsel tampilkan semua tombol

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 056`

## Revisi (dari pemilik)

> "Pada tampilan ponsel, desain papan hint udah oke. Tapi pada tampilan
> tablet, laptop, jadi kosong banget papannya. Untuk tampilan non ponsel,
> buat agar panel menampilkan semua tombol aja."

## Langkah

- [x] **1. Deteksi layar lebar** — konstanta `DESKTOP_MIN_WIDTH = 700`; komponen `GameActionBar` memakai `useWindowDimensions()` → ≥700px = mode desktop.
- [x] **2. Mode desktop** — semua tombol (Zoom + Petunjuk + Alat) tampil sekaligus dalam satu baris horizontal, tanpa pager/panah navigasi. Tombol dikelompokkan dengan label + separator (gabungan dengan PLAN-058).
- [x] **3. Mode mobile tetap pager** — ponsel (<700px) tetap pakai pager 3 halaman seperti semula, kompatibel dengan semua tema.

## Catatan Revisi

- **1–3.** 2026-08-18: Gabungan implementasi dengan PLAN-057 & 058 dalam satu rewrite GameActionBar — mode desktop langsung menampilkan semua tombol berkelompok, mode mobile tetap pakai pager.
