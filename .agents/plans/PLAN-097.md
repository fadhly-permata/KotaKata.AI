# PLAN-097 — Daily Challenge / Misi Harian

**Status:** DONE ✅ (23 Aug 2026)
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #1 — board spesial per hari yang sama untuk semua pemain +
> streak reward. Penahan retensi paling murah dan efektif.

## Rencana pengerjaan (saat disuruh kerjakan)
1. Tabel `daily_boards` (tanggal, tier, word ids) — di-generate deterministik per hari.
2. UI masuk Daily Challenge dari home; progress harian tersimpan per user.
3. Streak counter + reward tampilan (badge/streak flame).
4. Verifikasi lintas platform (aturan #5b) → tsc/test → deploy web dev.

## Hasil pengerjaan
1. **Papan deterministik per tanggal** (`src/utils/dailyChallenge.ts`): seed RNG
   (mulberry32) dari `kotakata-daily-YYYY-MM-DD` — semua pemain di hari yang sama
   mendapat papan identik; tier berotasi per hari (dayOfYear % 10 + 1).
2. Pool = satu tier penuh TANPA eksklusi discoveries (papan harian memang sama
   untuk semua), digenerate via crosswordGenerator biasa.
3. Kolom profil baru: `users.daily_streak`, `users.daily_last_done` (migrasi sudah
   diterapkan ke Supabase). Streak dihitung klien-side saat board selesai:
   selesai hari berturut-turut = +1, terlewat = reset ke 1; main ulang hari yang
   sama tidak menaikkan dobel.
4. UI: kartu "🗓️ Tantangan Harian" di halaman utama (tier hari ini + 🔥 streak,
   centang ✓ bila sudah selesai hari ini). Flag `dailyMode` di gameStore di-clear
   oleh reset() seperti aiMode.
