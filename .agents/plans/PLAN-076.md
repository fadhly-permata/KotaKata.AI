# PLAN-076: APK Blank Putih Saat Dibuka

## Status: PENDING

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
- [ ] Konfirmasi penyebab: cek apakah env `EXPO_PUBLIC_*` tersedia saat build
      EAS (`eas.json` env / EAS secrets), dan cek log device (`adb logcat`)
      untuk error "Missing Supabase env vars"
- [ ] Terapkan perbaikan sesuai akar masalah (mis. set env di profil EAS /
      EAS secrets, atau fallback graceful di supabase.ts)
- [ ] Verifikasi build APK baru tidak blank
- [ ] Commit & push, lalu deploy web ke expo.dev (aturan #6)
