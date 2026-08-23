# PLAN-083 — Bug APK: Sound Effect Tidak Berbunyi (suara latar masih normal)

## Status
PENDING

## Deskripsi (laporan pemilik)
"Bug yang terasa di apk terbaru adalah sound effect jadi gak ada suaranya,
tapi suara latar masih ada."

## Catatan
- Platform terasa: **APK native** (Hermes). Belum dikonfirmasi apakah web
  juga terdampak.
- Suara latar (background music) = normal; yang hilang hanya **sound effect**
  (tap, benar/salah, kemenangan, dsb).
- Perlu dicek saat pengerjaan: perubahan apa pada `src/utils/sound.ts`
  (commit fix Hermes `ef3d7a6` menyentuh file ini) yang bisa mematikan jalur
  SFX saja tanpa memengaruhi ambient/backsound — mis. guard API web-only yang
  keliru memblok inisialisasi SFX, atau efek samping penggantian guard
  `typeof window`.

## Langkah pengerjaan
- [ ] Audit `src/utils/sound.ts`: bandingkan dengan versi sebelum commit
      `ef3d7a6`, identifikasi kenapa SFX mati di native tapi ambient tetap jalan.
- [ ] Perbaiki tanpa merusak platform lain (aturan #5b: aman di web DAN native,
      guard fungsi eksplisit, bukan cukup cek objek).
- [ ] Verifikasi: tsc + test + lint.
- [ ] Deploy web ke expo.dev.
