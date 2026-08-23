# PLAN-099 — Level Boss Tiap Akhir Tier

**Status:** DONE ✅ (23 Aug 2026 — MVP fungsional)
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #4 — board lebih sulit dengan timer sebagai milestone
> ganti tier, dengan reward eksklusif.

## Rencana pengerjaan (saat disuruh kerjakan)
1. Deteksi kata terakhir tiap tier → jalankan mode boss (timer + kesulitan naik).
2. UI khusus boss (visual beda, timer countdown, konsekuensi gagal).
3. Reward eksklusif (badge per tier).
4. Verifikasi lintas platform (aturan #5b) → tsc/test → deploy web dev.

## Hasil pengerjaan (MVP)
1. **Ketersediaan**: tombol ⚔️ Level Boss muncul di Main Menu bila XP kurang
   ≤ 5.000 dari ambang tier berikutnya (tier 10 = selalu tersedia).
2. **Papan**: tier aktif + exclude discoveries, papan lebih besar (min 12 kata,
   grid 11–14) via generator biasa.
3. **Timer 10 menit**: chip countdown merah di atas papan; waktu habis → boss
   gagal, tanpa penalti, kembali ke menu.
4. **Reward**: menang = bonus **+1.500 XP** ikut delta apply_board_xp (satu
   submit tervalidasi anti-cheat) + `users.boss_wins`++ (badge jumlah kemenangan
   ditampilkan di kartu boss).
