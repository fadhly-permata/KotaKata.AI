# PLAN-076: APK Blank Putih Saat Dibuka

## Status: DONE

## Laporan Bug (dari pemilik)
Ketika di-deploy jadi APK (build Android via EAS), saat aplikasi dibuka
layarnya cuma blank (putih) tanpa ada tampilan apa-apa.

## Analisis Awal (dugaan penyebab, belum diubah kodenya)
1. **Kandidat utama — env var Supabase tidak ter-bundle di build release.**
   `src/data/sources/supabase.ts` melempar `throw new Error("Missing Supabase
   env vars...")` di level modul kalau `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` kosong. `.env.local` tidak ikut ke server
   build EAS (tidak di-commit), jadi di build APK modul ini throw sebelum
   React render → layar putih. Di dev/lokal jalan karena `.env.local` ada.
2. **sql.js / WASM di native.** `src/utils/logDb.ts` mengimpor
   `sql-wasm-browser.js` + `.wasm` (di-resolve Metro sebagai asset). Sudah ada
   fallback ke AsyncStorage, tapi perlu dipastikan import modul wasm tidak
   crash di Hermes sebelum fallback jalan.
3. Error lain saat load bundle (mis. dependency native yang tidak masuk APK)
   — bisa dibuktikan dengan log dari device / `adb logcat`.

## Langkah Pemeriksaan & Perbaikan (belum dikerjakan)
- [x] Konfirmasi penyebab: `src/data/sources/supabase.ts` melempar throw di
      level modul kalau `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` kosong; file
      `.env*` di-.gitignore sehingga tidak ikut ter-upload ke server build EAS
      → modul crash sebelum React render → APK layar putih
- [x] Perbaikan akar masalah: `scripts/expo-build.mjs` kini otomatis
      men-sinkronisasi semua var `EXPO_PUBLIC_*` dari `.env.local`/`.env` ke
      env EAS (`eas env:push`, environment preview + production) sebelum
      mengirim build, jadi nilai ter-inline ke bundle release/APK
- [x] Jaring pengaman: `supabase.ts` tidak lagi melempar error di level
      modul — fallback ke client dummy + loggerError, app tetap render dan
      pesan error kelihatan di Log Aplikasi (bukan layar putih)
- [x] Verifikasi: tsc --noEmit ✅, bun test 69 pass ✅, lint tanpa error baru
      ⚠️ verifikasi build APK baru menunggu perintah pemilik (aturan #1:
      build native butuh persetujuan eksplisit)
- [x] Commit & push, lalu deploy web ke expo.dev (aturan #6)
