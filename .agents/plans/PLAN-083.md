# PLAN-083 — Bug APK: Sound Effect Tidak Berbunyi (suara latar masih normal)

## Status
PENDING

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
- [ ] Audit `src/utils/sound.ts`: bandingkan dengan versi sebelum commit
      `ef3d7a6`, identifikasi kenapa SFX mati di native tapi ambient tetap jalan.
- [ ] Perbaiki tanpa merusak platform lain (aturan #5b: aman di web DAN native,
      guard fungsi eksplisit, bukan cukup cek objek).
- [ ] Verifikasi: tsc + test + lint.
- [ ] Deploy web ke expo.dev.
