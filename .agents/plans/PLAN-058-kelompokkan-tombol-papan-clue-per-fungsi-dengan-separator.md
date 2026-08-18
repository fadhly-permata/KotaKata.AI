# Kelompokkan tombol papan clue per fungsi dengan separator

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 058`

## Revisi (dari pemilik)

> "Kelompokan tombol-tombol pada papan clue, tersebut berdasarkan fungsinya
> dengan menggunakan separator."

## Langkah

- [x] **1. Tiga grup fungsi** — **Zoom** (−/100%/+), **Petunjuk** (Clue 2, Clue 3, Huruf, Kata), **Alat** (Reset, Keyboard) — masing-masing punya label atas (GroupLabel) + separator garis vertikal antar grup.
- [x] **2. Mode desktop** — ketiga grup tampil berdampingan dengan `ActionSeparator` antar grup + label fungsi di atas tombol.
- [x] **3. Mode mobile** — masih memakai pager, namun isi halaman sudah mengikuti pembagian grup yang sama (halaman 1 = Zoom, halaman 2 = Petunjuk, halaman 3 = Alat).
- [x] **4. Verifikasi** — tsc + 50 tes lolos.

## Catatan Revisi

- **1–4.** 2026-08-18: Komponen `ActionSeparator` dan `GroupLabel` baru ditambahkan; dipakai di mode desktop, mode mobile tetap pakai pager tanpa label (hemat ruang).
