# Kosakata hanya bahasa Indonesia — hilangkan kata asing, ganti agar tetap 1000 soal

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 048`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi dong agar:
> - Gua mau cuma bahasa indonesia yang ditampilkan pada kosakata, masa gua nemu
>   jawaban \"START\", kata-kata bahasa asing mending di hilangkan dan di ganti
>   (agar tetap 1000 soal)"

**Tujuan:** memastikan **semua jawaban** adalah kata bahasa Indonesia yang
wajar — lemma KBBI / serapan yang sudah lazim dan ber-Indonesianisasi. Kata
asing mentah (mis. "START"), akronim/istilah asing yang tidak lazim, merek &
nama diri **dihapus dan diganti** kata Indonesia setara sehingga **tiap tier
tetap tepat 1000 soal**.

**Catatan:** "START" tidak ditemukan di seed lokal — kemungkinan berasal dari
kosakata AI (`insert_ai_vocabulary`) atau sisa di DB Supabase. Audit harus
mencakup **DB Supabase**, bukan hanya file seed.

## Cakupan

- Seed tier 1–10 (`src/data/vocabulary/tierN*.ts`) + `supabase/data/vocabulary.sql`
  + **DB Supabase** (termasuk kata AI yang pernah masuk via `insert_ai_vocabulary`).
- Deteksi: regex kata asing (pola huruf/nama asing), daftar kata asing mentah,
  akronim, merek, nama diri; word-boundary anti false-positive (kata serapan
  lazim seperti "kolektif"/"ideologi" TETAP dipertahankan — itu sudah bahasa
  Indonesia).
- Pengganti: kurasi kata Indonesia berkesulitan setara (pola PLAN-026/041:
  3 clue tanpa bocor, tanpa duplikat di tier & antar tier).

## Langkah

- [x] **1. Buat scanner kata asing** — daftar kata yang bukan bahasa Indonesia
  (asing mentah, akronim asing tak lazim, nama diri/merek) + word-boundary;
  jalankan di semua seed **dan** query langsung ke DB Supabase (temukan
  "START" & sejenisnya, termasuk kata AI).
- [x] **2. Audit & daftar** — kumpulkan temuan per tier + dari DB; konfirmasi
  tiap kata (asing = hapus, serapan lazim = aman).
- [x] **3. Ganti** — kurasi pengganti bahasa Indonesia yang setara
  kesulitannya; pastikan tidak bentrok antar tier; tetap **1000 kata/tier**.
- [x] **4. Validasi** — scanner asing = 0 hit, scan vulgar tetap 0,
  `gen-vocab-sql.mjs` 1000/tier tanpa dedup, `check-clue-quality` 0 issue,
  tsc + tes + lint.
- [x] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi 1000/tier
  + kata asing 0 di DB), commit + push + deploy web (aturan #6).

## Catatan Revisi

- **5.** 2026-08-17: 9 kata asing/non-baku diganti kata Indonesia: start→rintis, lose→hempas, cheetah→citah, maroon→nila, trottoar→delima, qurban→kurban, fuchsia→fusia, olive→jambon, disorder→jengah (semua baku KBBI/umum, tanpa bentrok, 1000/tier tetap). 10 clue berbahasa Inggris diperbaiki (wine, topping, playing card, fuchsia, olive, rhinoceros, butter, corn, maroon, sidewalk → kata Indonesia). Scanner asing = 0 jawaban asing tersisa (yard/pasta/audio/menu dipertahankan: serapan lazim KBBI), duplikat 0, check-clue-quality 0 issue, vulgar 0, tsc + 50 tes lolos. Supabase terverifikasi: 10.000 row, 1000/tier, kata asing 0.
- **6.** 2026-08-17: Deploy web selesai — produksi live di https://kotakata-ai.expo.app (EAS Hosting).
