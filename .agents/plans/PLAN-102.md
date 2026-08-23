# PLAN-102 — Haptic Feedback Native

**Status:** DONE ✅ (23 Aug 2026)
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

## Hasil pengerjaan
1. `src/utils/haptic.ts` — wrapper expo-haptics lazy-loaded: web = no-op total,
   native dengan guard fungsi eksplisit (aturan #5b), error ditelan (non-kritis).
2. Event bergetar: kata benar (success), salah (error), papan selesai (success).
3. Preferensi "kotakata.hapticEnabled" (default NYALA) + Switch **Getar (Haptic)**
   di Pengaturan seksi Tampilan & Suara; dibaca saat app start via RootNavigator.
4. Catatan: getar baru TERASA di APK (butuh build Android berikutnya); di web fitur
   ini no-op sesuai desain.
