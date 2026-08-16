# Transisi looping suara latar lebih halus (tidak terasa putus)

<!-- status: pending -->
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

- [ ] **1. Diagnosa** — cek implementasi pemutaran backsound saat ini (player,
  cara looping, file audio per tema).
- [ ] **2. Implementasi transisi halus** — terapkan mekanisme agar perulangan
  tidak terasa putus (mis. fade singkat di batas loop / crossfade).
- [ ] **3. Verifikasi** — tsc + tes + dengarkan di beberapa tema (web & device).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 029 <no> "teks"`)_
