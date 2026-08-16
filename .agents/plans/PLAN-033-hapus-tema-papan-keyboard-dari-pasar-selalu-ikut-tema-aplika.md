# Hapus tema papan & keyboard dari pasar, selalu ikut tema aplikasi

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 033`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Untuk tema papan permainan dan keyboard untuk saat ini di hapus aja dulu
> dari pasar. Nanti gua punya plan lain untuk desain kedua objek tersebut.
> Karna keduanya dihapus, maka papan dan keyboard akan selalu mengikuti tema
> aplikasi."

**Tujuan:** menghapus tema papan permainan & tema keyboard dari pasar (toko
tema) untuk sementara. Akibatnya papan dan keyboard selalu memakai tema
aplikasi (ikut tema yang sedang aktif).

## Langkah

- [x] **1. Identifikasi pasar & data tema** — cari bagaimana pasar/toko tema
  menyimpan & menampilkan tema papan & keyboard (tipe tema, filter, produk
  yang dijual/dipunya user).
- [x] **2. Sembunyikan kategori papan & keyboard** — hapus/nonaktifkan tema
  papan & keyboard dari pasar; pastikan papan & keyboard memakai tema aplikasi
  secara default. Putuskan apakah data lama diabaikan saja (soft-hide) atau
  dibersihkan.
- [x] **3. Verifikasi** — tsc + tes, cek pasar tidak menampilkan kategori
  tersebut dan tampilan papan/keyboard mengikuti tema aplikasi.

## Catatan Revisi

- **2.** 2026-08-16: Dikerjakan batch 2026-08-16: StoreScreen hanya menampilkan seksi Tema Aplikasi (SECTIONS board/keyboard dihapus, teks hero diperbarui); ThemeProvider me-resolve tema papan & keyboard dari appThemeId (getBoardThemeById(appThemeId) / getKeyboardThemeById(appThemeId)) sehingga papan & keyboard selalu mengikuti tema aplikasi aktif — data registry board/keyboard tetap ada untuk kebutuhan masa depan.
