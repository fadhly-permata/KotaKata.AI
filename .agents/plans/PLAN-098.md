# PLAN-098 — Leaderboard Mingguan

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #3 — skor/streak mingguan via Supabase. Kompetisi ringan =
> main balik lagi. PRASYARAT: PLAN-096 anti-cheat harus jalan dulu agar skor palsu
> tidak merusak kompetisi.

## Rencana pengerjaan (saat disuruh kerjakan)
1. Tabel skor mingguan (user_id, week, score, streak) + RPC submit server-side.
2. Layar Leaderboard: top-N minggu ini + posisi pemain.
3. Reset otomatis per minggu (view/aggregate berdasar rentang tanggal).
4. Verifikasi lintas platform (aturan #5b) → tsc/test → deploy web dev.
