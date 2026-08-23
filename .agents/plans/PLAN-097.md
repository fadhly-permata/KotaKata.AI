# PLAN-097 — Daily Challenge / Misi Harian

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #1 — board spesial per hari yang sama untuk semua pemain +
> streak reward. Penahan retensi paling murah dan efektif.

## Rencana pengerjaan (saat disuruh kerjakan)
1. Tabel `daily_boards` (tanggal, tier, word ids) — di-generate deterministik per hari.
2. UI masuk Daily Challenge dari home; progress harian tersimpan per user.
3. Streak counter + reward tampilan (badge/streak flame).
4. Verifikasi lintas platform (aturan #5b) → tsc/test → deploy web dev.
