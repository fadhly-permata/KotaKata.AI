# PLAN-105 — Clue Adaptif AI

**Status:** ⏸️ HOLD (ditunda oleh pemilik, 23 Aug 2026)
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #9 — kalau pemain salah 2×, AI menyederhanakan clue
> secara on-the-fly.

## Catatan pemilik
> Flag HOLD — belum diprioritaskan.

## Rencana pengerjaan (DITUNDA — jangan dikerjakan sampai flag diangkat)
1. Trigger: 2× salah pada kata yang sama → request penyederhanaan clue via BYOK.
2. Cache hasil agar tidak dobel biaya; fallback ke clue asli bila offline/gagal.
3. Anti-bocor tetap divalidasi ulang setelah penyederhanaan.
