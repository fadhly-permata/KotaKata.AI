# Kelompokkan tombol papan clue per fungsi dengan separator

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 058`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Kelompokan tombol-tombol pada papan clue, tersebut berdasarkan fungsinya
> dengan menggunakan separator."

**Tujuan:** tombol-tombol di panel hint/papan clue dikelompokkan **berdasarkan
fungsinya** (mis. grup "Petunjuk": buka clue 2, buka clue 3, reveal letter/
word; grup "Alat": reset, keyboard, dst.) dan antar grup diberi
**separator/pembatas visual** agar jelas.

## Cakupan

- Komponen panel hint in-game (GameActionBar / panel bawah) — tata letak
  tombol berkelompok + separator (garis/spasi tegas antar grup fungsi).
- Koordinasi dengan PLAN-056 (non-ponsel semua tombol) & PLAN-057 (tombol
  clue 2/3 terpisah) — satu desain panel yang dipakai bersama.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 058 <no> "teks"`)_
