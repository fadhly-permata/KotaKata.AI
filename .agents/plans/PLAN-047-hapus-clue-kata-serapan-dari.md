# Hapus clue berawalan "Kata serapan dari …"

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 047`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi dong agar:
> - Banyak clue dengan \"Kata serapan dari\" gua gak suka, mending dihilangkan."

**Tujuan:** semua clue_1 yang diawali **"Kata serapan dari bahasa X:"** (tag
asal bahasa dari PLAN-003/005 — ±949 kata serapan) maupun **"Kata dari bahasa
X:"** (±15 kata daerah Nusantara) diubah menjadi **clue definisi biasa**
(tanpa tag asal bahasa). Kualitas tetap terjaga: tanpa bocor jawaban, tanpa
duplikat, tanpa placeholder.

## Cakupan

- Seluruh seed tier 1–10 (`src/data/vocabulary/tierN*.ts`) — cari prefix
  `Kata serapan dari` & `Kata dari`.
- Generator tag: `scripts/vocab/etymology-data.mjs` +
  `add-language-origin.mjs` + `add-regional-origin.mjs` (kalau sudah tidak
  dipakai lagi → arsipkan/nonaktifkan agar tag tidak muncul lagi).
- `scripts/vocab/gen-vocab-sql.mjs` → `supabase/data/vocabulary.sql` + push
  ke Supabase (`push-vocab.mjs`).

## Langkah

- [ ] **1. Audit** — hitung & daftar semua clue_1 berprefix "Kata serapan
  dari …" / "Kata dari …" per tier (script scan word-boundary).
- [ ] **2. Tulis ulang** — ganti prefix dengan definisi normal (pakai fragmen
  definisi/sinonim yang sudah ada di c1/c2/c3 atau kurasi manual), pola
  anti-leak yang sama (jawaban tidak boleh bocor di clue).
- [ ] **3. Regenerate & QA** — `gen-vocab-sql.mjs` tepat 1000/tier,
  `check-clue-quality` 0 issue / 0 bocor / 0 duplikat, scan prefix = **0**.
- [ ] **4. Verifikasi** — tsc + tes + lint.
- [ ] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi row),
  commit + push + deploy web (aturan #6).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 047 <no> "teks"`)_
