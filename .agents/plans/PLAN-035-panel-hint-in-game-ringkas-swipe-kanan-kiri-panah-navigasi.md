# Panel hint in-game ringkas: swipe kanan-kiri + panah navigasi

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 035`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "bagus sih, tapi makan ruang terlalu banyak. Kita ubah aja desainnya biar bisa
> di swipe kanan kiri buat nampilin semua tombol pada panel hint. Tapi
> transisinya kasih efek fluid, dan kanan kirinya kasih icon panah kanan/kiri
> seperti pada papan panel soal"

**Tujuan:** panel hint (GameActionBar) di halaman In-Game dibuat ringkas — semua
tombol tidak lagi ditampilkan sekaligus (sekarang memakan ruang vertikal
banyak), tapi bisa **di-swipe kiri/kanan** untuk menampilkan tombol-tombol lain.
Transisi antar "halaman" tombol dibuat **fluid** (halus), dan di sisi kiri/kanan
panel ada **icon panah ◀ ▶** (seperti navigasi soal di CluePill).

## Langkah

- [ ] **1. Identifikasi GameActionBar saat ini** — pahami susunan tombol (zoom,
  reveal clue/huruf/kata, reset, keyboard), mode compact vs lebar, dan interaksi
  toggle tools; tentukan pembagian grup tombol jadi beberapa "halaman" yang
  bisa di-swipe.
- [ ] **2. Implementasi swipe + panah** — panel hint jadi carousel horizontal:
  swipe kiri/kanan (dan/atau panah ◀ ▶ di kanan-kiri) berpindah antar halaman
  tombol; transisi dengan animasi fluid (Animated/ScrollView paging halus,
  snap ke tiap halaman); pertahankan tooltip & state tombol yang sudah ada.
- [ ] **3. Verifikasi** — tsc + tes, cek tampilan di berbagai ukuran layar
  (compact ponsel & lebar), pastikan semua tombol tetap bisa diakses dan panel
  tidak lagi memakan ruang berlebih.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 035 <no> "teks"`)_
