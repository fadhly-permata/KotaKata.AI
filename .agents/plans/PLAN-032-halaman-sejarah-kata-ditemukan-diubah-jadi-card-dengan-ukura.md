# Halaman sejarah & kata ditemukan diubah jadi card dengan ukuran acak

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 032`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "halaman sejarah permainan & kata ditemukan: desainnya ganti dong, jangan
> berbentuk list gitu, dibuat seperti card aja dong tapi size-nya (baik height
> maupun width) dibuat random, tapi pastikan tetap tampak rapi dan enak di
> lihat. Pastikan juga agar tetap mendukung lazy load ya."

**Tujuan:** mengganti tampilan daftar (list) pada halaman sejarah permainan dan
halaman kata ditemukan menjadi grid/brick card dengan ukuran height & width
acak (masonry), tetap rapi, dan lazy load tetap berjalan.

## Langkah

- [ ] **1. Identifikasi halaman & komponen saat ini** — cari halaman sejarah
  permainan & kata ditemukan, pahami struktur list & mekanisme lazy
  load/paging yang sudah ada (FlatList/FlashList?).
- [ ] **2. Desain ulang jadi card masonry** — ubah list menjadi card dengan
  width/height acak (dalam rentang yang dibatasi) yang tetap rapi; pertahankan
  lazy load (render on demand saat scroll).
- [ ] **3. Verifikasi** — tsc + tes, cek tampilan di web preview & pastikan
  scroll/lazy load normal.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 032 <no> "teks"`)_
