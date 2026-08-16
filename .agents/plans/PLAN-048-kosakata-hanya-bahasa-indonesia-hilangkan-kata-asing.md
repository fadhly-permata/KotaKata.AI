# Kosakata hanya bahasa Indonesia — hilangkan kata asing, ganti agar tetap 1000 soal

<!-- status: pending -->
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

- [ ] **1. Buat scanner kata asing** — daftar kata yang bukan bahasa Indonesia
  (asing mentah, akronim asing tak lazim, nama diri/merek) + word-boundary;
  jalankan di semua seed **dan** query langsung ke DB Supabase (temukan
  "START" & sejenisnya, termasuk kata AI).
- [ ] **2. Audit & daftar** — kumpulkan temuan per tier + dari DB; konfirmasi
  tiap kata (asing = hapus, serapan lazim = aman).
- [ ] **3. Ganti** — kurasi pengganti bahasa Indonesia yang setara
  kesulitannya; pastikan tidak bentrok antar tier; tetap **1000 kata/tier**.
- [ ] **4. Validasi** — scanner asing = 0 hit, scan vulgar tetap 0,
  `gen-vocab-sql.mjs` 1000/tier tanpa dedup, `check-clue-quality` 0 issue,
  tsc + tes + lint.
- [ ] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi 1000/tier
  + kata asing 0 di DB), commit + push + deploy web (aturan #6).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 048 <no> "teks"`)_
