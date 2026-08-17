# Review soal tier 2 hingga 10

<!-- status: in-progress -->
<!-- dibuat: 2026-08-16 -->
<!-- dikerjakan ulang: 2026-08-17 (pemilik: "kerjakan plan 42") -->

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

- [x] **1. Jalankan audit otomatis** — `audit-vocab.mjs` +
  `check-clue-quality.mjs` (per tier) + `detect-regional.mjs` +
  `verify-origin-prefixes.mjs` + scanner vulgar untuk tier 2–10, plus script
  baru `scripts/check/plan042-review-lemma.mjs` (cek lemma KBBI + duplikat
  lintas tier + clue bocor/placeholder + akhiran klitik).
- [x] **2. Review manual per tier** — tinjau temuan tiap tier (khususnya
  tier 2–4 yang paling sering dimainkan); tandai kata absurd / bukan lemma /
  tak dapat dimainkan / kesulitan tidak proporsional.
- [x] **3. Perbaiki** — ganti/tulis ulang kata & clue bermasalah (pola
  PLAN-026: kurasi, 3 clue berbeda, tanpa bocor jawaban, tanpa duplikat di
  tier); update file tier.
- [x] **4. Validasi & QA** — `gen-vocab-sql.mjs` (tepat 1000/tier),
  `check-clue-quality` 0 issue, `audit-vocab` 0 temuan, scanner vulgar
  0 VULGAR / 0 ANSWER-ONLY, `plan042-review-lemma` 0 bocor/0 duplikat,
  tsc + 50 tes + qa-logic lolos.
- [ ] **5. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi row),
  `check-vulgar-db.mjs` 0 kata vulgar, commit + push + deploy web (aturan #6).

## Catatan Revisi

- **SKIP (histori).** 2026-08-16: Di-skip sementara atas permintaan pemilik.
  Dibuka lagi & dikerjakan 2026-08-17 atas perintah "kerjakan plan 42".
- **1–4.** 2026-08-17: Audit + review + perbaikan. **10 kata bermasalah
  diganti** (tetap 1000/tier, posisi baris dipertahankan supaya word_id &
  riwayat discovery pemain tidak berubah):
  - *Tidak bisa dimainkan* (jawaban mengandung tanda hubung, sel "-" tak bisa
    diketik di papan): t7 `berbisik-bisik`→`bisik`, t9 `berteriak-teriak`→`jerit`.
  - *Bukan lemma / klitik imperatif-tanya*: t4 `berilah`→`suguhan`,
    t5 `bukankah`→`seandainya`, t9 `hendaklah`→`semestinya`.
  - *Bentuk turunan -an yang janggal*: t6 `lengkingan`→`lengking`,
    t10 `ringkikan`→`ringkik`, t10 `menyalah`→`melenceng`.
  - *Kata asing bukan lemma KBBI (policy PLAN-048)*: t6 `lovebird`→`cendrawasih`.
  - *Kata daerah terlalu eksotis di tier mudah*: t3 `bahuku`→`genteng`.
  Semua pengganti dicek: tidak dipakai tier lain (0 duplikat lintas tier),
  clue baru tanpa bocor jawaban, `check-clue-quality` 0 issue, scanner vulgar
  0 VULGAR / 0 ANSWER-ONLY, `audit-vocab` 0 temuan (whitelist -nya lemma
  diperluas: seandainya, semestinya), tsc + 50 tes + qa-logic lolos.
  Sisanya yang ter-flag (nonton/nyambung/skuad/struk/viral/dst.) ditinjau
  manual dan **dipertahankan**: kata umum/kolokial lazim atau serapan KBBI
  yang sudah ber-Indonesianisasi.
