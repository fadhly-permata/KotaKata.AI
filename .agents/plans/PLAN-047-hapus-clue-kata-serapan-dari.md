# Hapus clue berawalan "Kata serapan dari …"

<!-- status: done -->
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

- [x] **1. Audit** — hitung & daftar semua clue_1 berprefix "Kata serapan
  dari …" / "Kata dari …" per tier (script scan word-boundary).
- [x] **2. Tulis ulang** — ganti prefix dengan definisi normal (pakai fragmen
  definisi/sinonim yang sudah ada di c1/c2/c3 atau kurasi manual), pola
  anti-leak yang sama (jawaban tidak boleh bocor di clue).
- [x] **3. Regenerate & QA** — `gen-vocab-sql.mjs` tepat 1000/tier,
  `check-clue-quality` 0 issue / 0 bocor / 0 duplikat, scan prefix = **0**.
- [x] **4. Verifikasi** — tsc + tes + lint.
- [x] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi row),
  commit + push + deploy web (aturan #6).

## Catatan Revisi

- **5.** 2026-08-17: Semua tag asal bahasa dihapus (755 di SQL + TS sudah dibersihkan): prefix 'Kata serapan dari bahasa X:' (745) & 'Kata dari bahasa X:' (10) = 0. QA check-clue-quality 0 issue semua tier (15 issue lama ikut dibereskan), vulgar 0, audit 0, tsc + 50 tes lolos. Supabase terverifikasi: total 10.000, 1000/tier, tagged 0. Script add-language-origin & add-regional-origin dinonaktifkan (no-op) agar tag tidak muncul lagi; verify-origin-prefixes.mjs jadi guard (tag harus 0).
