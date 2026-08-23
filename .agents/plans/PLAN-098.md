# PLAN-098 — Leaderboard Mingguan

**Status:** DONE ✅ (23 Aug 2026)
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

## Hasil pengerjaan
1. Tabel `weekly_scores` (user_id text, week_start Senin ISO, xp_gained) + RLS select.
2. XP mingguan terkumpul **otomatis dari jalur anti-cheat** `apply_board_xp`
   — hanya delta tervalidasi server yang dihitung; tidak ada jalur submit terpisah
   yang bisa dimanipulasi klien.
3. RPC `get_weekly_leaderboard(limit)` security definer untuk baca lintas-user.
4. UI: tab **🏆 Total / 📅 Minggu Ini** di modal leaderboard, top 50 + posisi pemain.
5. Fix bug laten: `users.user_id` ternyata TEXT — auth.uid() kini di-cast eksplisit
   di apply_board_xp (sebelumnya berpotensi error runtime saat submit pertama).
