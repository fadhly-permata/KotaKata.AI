# PLAN-102 — Haptic Feedback Native

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #7 — getar halus saat jawaban benar/salah/event penting.
> Web: diabaikan otomatis (guard eksplisit fungsi, aturan #5b).

## Rencana pengerjaan (saat disuruh kerjakan)
1. Wrapper haptic (expo-haptics atau setara) dengan guard `typeof fn === "function"`
   untuk web/Hermes.
2. Pasang di event: tile benar, salah, board selesai, tier naik.
3. Pengaturan on/off di Settings (sinkron cloud prefs).
4. Verifikasi web tidak terpengaruh + APK aman → tsc/test → deploy web dev.
