# Transisi looping suara latar lebih halus (tidak terasa putus)

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 029`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Suara latar terkadang terasa putus sebelum terjadi looping. mungkin perlu di
> buat agar lebih halus lagi transisi looping-nya sehingga gak kerasa kaya audio
> yang di looping."

**Tujuan:** hilangkan kesan audio "putus" saat looping suara latar — transisi
akhir → awal loop dibuat mulus (fade-out/fade-in pendek, crossfade, atau
pemilihan titik loop yang tepat).

## Langkah

- [x] **1. Diagnosa** — cek implementasi pemutaran backsound saat ini (player,
  cara looping, file audio per tema).
- [x] **2. Implementasi transisi halus** — terapkan mekanisme agar perulangan
  tidak terasa putus (mis. fade singkat di batas loop / crossfade).
- [x] **3. Verifikasi** — tsc + tes + dengarkan di beberapa tema (web & device).

## Catatan Revisi

- **1.** 2026-08-16: Dikerjakan batch 2026-08-16: loop backsound memakai CROSSFADE dua slot (fade 2 detik, maks 20% durasi) — slot kedua mulai dari awal saat slot pertama hampir habis, perpindahan tidak terasa putus; properti loop tetap jadi jaring pengaman.
