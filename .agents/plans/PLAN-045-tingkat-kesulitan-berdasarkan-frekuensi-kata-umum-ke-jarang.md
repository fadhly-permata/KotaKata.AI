# Tingkat kesulitan berdasarkan frekuensi pemakaian kata (umum → jarang), tanpa kata vulgar

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 045`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi dong agar:
> - tingkat kesulitan dibuat berdasarkan kata umum/sering digunakan sehari-hari
>   hingga kata yang jarang digunakan. Pastikan gak menggunakan kata vulgar"

**Tujuan:** menata ulang distribusi kosakata ke-10 tier sehingga tingkat
kesulitan benar-benar mencerminkan **frekuensi pemakaian sehari-hari**: tier
rendah = kata umum yang sering dipakai (anak-anak & pemula langsung kenal),
makin tinggi tier = kata makin jarang. Setiap tier tetap **tepat 1000 soal**,
dan **0 kata vulgar** (scanner `vulgar-words.mjs` PLAN-041 tetap menjadi
jaring pengaman).

## Cakupan

- 10 tier — file `src/data/vocabulary/tierN*.ts` (1000 kata/tier) +
  `supabase/data/vocabulary.sql` + DB Supabase (push ulang).
- Sumber frekuensi: daftar kata umum bahasa Indonesia / KBBI (lemma dasar vs
  kata langka), penilaian kurasi manual, dan heuristik (kata konkret
  sehari-hari = umum; kata sastra/istilah khusus = jarang).
- Sinkron dengan PLAN-026 (bentrok antar tier) & PLAN-041 (vulgar) — pola
  kurasi yang sama: 3 clue berbeda, tanpa bocor jawaban, tanpa duplikat.

## Langkah

- [x] **1. Bangun indeks frekuensi** — petakan tiap kata seed ke tingkat
  keumuman (umum / sedang / jarang / sangat jarang) dari daftar kata umum +
  KBBI + kurasi manual.
- [x] **2. Audit distribusi per tier** — script hitung sebaran tingkat
  keumuman tiap tier sekarang → daftar kata yang "salah tier" (kata umum di
  tier tinggi & kata jarang di tier rendah).
- [x] **3. Susun ulang antar tier** — pindahkan/ganti kata sesuai frekuensi
  (tier 1–3 = kata umum sehari-hari, 4–6 = sedang, 7–8 = jarang, 9–10 =
  sangat jarang); resolve bentrok antar tier (pola PLAN-026), clue ditulis
  ulang tanpa bocor, tetap 1000 kata/tier.
- [x] **4. Validasi & QA** — scan vulgar (`vulgar-words.mjs`) = 0 hit,
  `gen-vocab-sql.mjs` tepat 1000/tier tanpa dedup, `check-clue-quality` 0
  issue / 0 bocor / 0 duplikat, tsc + tes + lint.
- [x] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi 1000/tier),
  commit + push + deploy web (aturan #6).

## Catatan Revisi

- **5.** 2026-08-17: Indeks frekuensi dibangun (frequency-data.mjs: daftar kata sehari-hari SANGAT_UMUM + penanda kata jarang). Audit distribusi: tier2 hanya 2% kata umum (isi lema KBBI acak) & tier3 penuh kata sangat umum (jangan, sangat, datang, bicara...). Re-sort antar tier: rank 1 = tier1 (dipertahankan utuh 1000 kata), rank 2 = kata SANGAT_UMUM di tier 2+ ditarik ke tier2, rank 3 = sisanya stabil. Hasil: tier2 2%->62% kata umum, cascade tier3-10 makin jarang (t8-10 tetap kata 8+ huruf/formal), 1000/tier tanpa duplikat, tier1 identik. Validasi: vulgar 0, asing 0, check-clue-quality 0 issue semua tier, audit bersih, tsc + 50 tes lolos. Supabase terverifikasi 10.000 row 1000/tier. Script: plan045-resort-tiers.mjs, audit-frequency.mjs.
- **6.** 2026-08-17: Deploy web selesai — produksi live di https://kotakata-ai.expo.app (EAS Hosting).
