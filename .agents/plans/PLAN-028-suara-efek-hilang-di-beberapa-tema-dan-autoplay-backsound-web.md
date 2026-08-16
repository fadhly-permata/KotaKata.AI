# Suara efek hilang di beberapa tema + autoplay backsound di web

<!-- status: done -->
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

- [x] **1. Diagnosa suara efek** — identifikasi tema mana yang suara efeknya
  tidak muncul & penyebabnya (URL audio mati, konflik pemutaran, dsb).
- [x] **2. Autoplay backsound web** — pastikan suara latar diputar otomatis saat
  masuk game di web jika setting ON (perhatikan kebijakan autoplay browser:
  perlu interaksi/gesture pertama pengguna bila diperlukan).
- [x] **3. Verifikasi** — tsc + tes + cek di web & beberapa tema.

## Catatan Revisi

- **1.** 2026-08-16: Dikerjakan batch 2026-08-16: web — backsound di-autoplay saat masuk game (ensureAmbientPlaying di GameScreen) + retry gestur lebih agresif; efek suara web tidak hilang saat init belum selesai (pending play di-flush setelah init) + playbackRate diset defensif (tidak pernah memblokir play). URL backsound 4 tema diverifikasi hidup (HTTP 200).
