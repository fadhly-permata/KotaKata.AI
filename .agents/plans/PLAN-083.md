# PLAN-083 — Bug APK: Sound Effect Tidak Berbunyi (suara latar masih normal)

## Status
DONE — commit fix sound.ts (SFX native)

## Hasil pengerjaan
Akar masalah di jalur SFX native (`play()`):
1. `player.seekTo(0)` dipanggil dalam try-catch yang SAMA dengan `play()` —
   seek yang gagal/rejected membuat `play()` tidak pernah terpanggil → SFX
   bisu total. Backsound lolos karena slot-nya men-guard seek terpisah.
2. `createAudioPlayer(hasil require mentah)` berisiko gagal resolve sumber di
   SDK baru; backsound aman karena memakai `{ uri }` eksplisit.

Perbaikan (`src/utils/sound.ts`, jalur web TIDAK disentuh):
- `prepareNativeSources()`: semua sumber SFX di-resolve lewat expo-asset ke
  `{ uri }` lokal saat init (fire-and-forget), dipakai oleh `getNativePlayer`.
- `play()` native: seekTo dibungkus try-catch + catch promise tersendiri;
  play() selalu dicoba apa pun hasil seek.

## Deskripsi (laporan pemilik)
"Bug yang terasa di apk terbaru adalah sound effect jadi gak ada suaranya,
tapi suara latar masih ada."

## Catatan
- Platform terasa: **APK native** (Hermes). **REVISI pemilik (23 Aug): di WEB
  sound berjalan normal semua — efek DAN latar.** Jadi bug ini murni
  platform-native; jalur audio web terbukti sehat.
- Gejala di APK: suara latar (ambient/backsound) = normal; yang hilang hanya
  **sound effect** (tap, benar/salah, kemenangan, dsb).
- Implikasi untuk pengerjaan: fokus pada jalur SFX yang berbeda perilakunya
  antara web & native (mis. engine SFX vs engine backsound berbeda, atau guard
  yang diganti di commit `ef3d7a6` menyentuh file sound.ts). Perbaikan wajib
  mempertahankan perilaku web yang sudah benar.

## Langkah pengerjaan
- [x] Audit `src/utils/sound.ts`: bandingkan dengan versi sebelum commit
      `ef3d7a6`, identifikasi kenapa SFX mati di native tapi ambient tetap jalan.
- [x] Perbaiki tanpa merusak platform lain (aturan #5b: aman di web DAN native,
      guard fungsi eksplisit, bukan cukup cek objek).
- [x] Verifikasi: tsc + test + lint.
- [x] Deploy web ke expo.dev.
