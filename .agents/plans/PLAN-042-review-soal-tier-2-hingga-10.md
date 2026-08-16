# Review soal tier 2 hingga 10

<!-- status: skipped -->
<!-- skip-reason: diminta pemilik 2026-08-16 — "Plan 42 kita skip dulu, dan kasih flag bahwa dia belum dikerjakan. Gak usah ditampilkan terus kecuali gua tanya sisa pendingan kerjaan kita." -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 042`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi:
> - Lakukan review untuk soal tier 2 hingga 10."

**Tujuan:** review menyeluruh kualitas soal tier 2–10 (tier 1 sudah dikurasi
ulang di PLAN-026) — pastikan tidak ada kata absurd (seperti "airan"/"airnya"
yang pernah ditemukan), clue tidak nyambung, kata bukan lemma, duplikat,
placeholder, atau bocor jawaban. Hasilnya dicatat per tier dan diperbaiki.

## Cakupan

- Tier 2–10 (file `src/data/vocabulary/tierN*.ts`), 1000 kata/tier.
- Aspek: kata bukan lemma / turunan aneh, kata tugas, akronim, nama diri,
  kata asing, clue tidak nyambung dengan jawaban, clue bocor/placeholder,
  c1==c2==c3, duplikat dalam tier & lintas tier yang mengganggu, kesulitan
  tidak sesuai tier (tier 2 terlalu sulit / tier tinggi terlalu mudah).

## Langkah

- [ ] **1. Jalankan audit otomatis** — `scripts/check/audit-vocab.mjs` +
  `check-clue-quality.mjs` + `detect-regional.mjs` + `verify-origin-prefixes.mjs`
  untuk tier 2–10; kumpulkan daftar temuan (kata aneh, clue bermasalah, QA).
- [ ] **2. Review manual per tier** — tinjau temuan + sampel acak tiap tier
  (khususnya tier 2–4 yang paling sering dimainkan); tandai kata absurd /
  clue tak nyambung / kesulitan tidak proporsional.
- [ ] **3. Perbaiki** — ganti/tulis ulang kata & clue bermasalah (pola
  PLAN-026: kurasi, 3 clue berbeda, tanpa bocor jawaban, tanpa duplikat di
  tier); update file tier.
- [ ] **4. Validasi & QA** — `gen-vocab-sql.mjs` (tepat 1000/tier), QA scripts
  0 issue/0 bocor/0 duplikat, tsc + tes + lint.
- [ ] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi row),
  commit + push + deploy web (aturan #6).

## Catatan Revisi

- **SKIP.** 2026-08-16: Di-skip sementara atas permintaan pemilik (belum dikerjakan).
  Status `skipped` menyembunyikannya dari `plan.mjs list` biasa; tampil lagi via
  `plan.mjs list --all` atau saat pemilik menanyakan sisa pekerjaan pending.
