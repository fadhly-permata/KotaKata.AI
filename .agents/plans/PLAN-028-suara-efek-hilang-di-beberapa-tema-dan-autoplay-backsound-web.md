# Suara efek hilang di beberapa tema + autoplay backsound di web

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 028`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Suara Latar dan Suara Efek: pada beberapa tema terkadang suara efek jadi gak
> muncul. pada versi web, buat suara latar belakang dibuat autoplay dong saat
> masuk ke dalam game (kalo setting pada pengaturan ON)."

**Tujuan:**
1. Perbaiki suara efek yang kadang tidak muncul pada beberapa tema.
2. Di versi web, backsound (suara latar) di-autoplay saat masuk ke dalam game
   selama setting di Pengaturan dalam keadaan ON.

## Langkah

- [ ] **1. Diagnosa suara efek** — identifikasi tema mana yang suara efeknya
  tidak muncul & penyebabnya (URL audio mati, konflik pemutaran, dsb).
- [ ] **2. Autoplay backsound web** — pastikan suara latar diputar otomatis saat
  masuk game di web jika setting ON (perhatikan kebijakan autoplay browser:
  perlu interaksi/gesture pertama pengguna bila diperlukan).
- [ ] **3. Verifikasi** — tsc + tes + cek di web & beberapa tema.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 028 <no> "teks"`)_
