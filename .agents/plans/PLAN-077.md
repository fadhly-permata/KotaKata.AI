# PLAN-077: Rapikan Konflik Env EAS Production

## Status: PENDING

## Laporan / Permintaan (dari pemilik)
Perapihan konflik environment variable di EAS production. Ditemukan saat
build APK preview (PLAN-076): `eas env:push --force` dari
`scripts/expo-build.mjs` gagal untuk `EXPO_PUBLIC_SUPABASE_ANON_KEY` di
environment **production** dengan pesan:

> This project already has an environment variable named
> "EXPO_PUBLIC_SUPABASE_ANON_KEY" in the following environments: production.

Dugaan: var tersebut ada di scope berbeda (mis. **account-level** vs
**project-level**), sehingga push project-level tidak bisa menimpanya.
Tidak memengaruhi build preview/APK, tapi harus beres sebelum build AAB
production ke Play Store supaya nilai yang terpakai benar-benar nilai dari
`.env.local` (bukan nilai lama yang menggantung).

## Langkah
- [ ] Audit var env EAS yang sudah ada: `eas-cli env:list --environment production`
      dan bandingkan scope (project vs account) + visibility tiap var dengan
      isi `.env.local`
- [ ] Hapus/update var duplikat yang bermasalah (mis. hapus var lama di scope
      account, atau samakan scope) sehingga `eas env:push --force` sukses
      tanpa error untuk semua var `EXPO_PUBLIC_*`
- [ ] Pastikan `node scripts/expo-build.mjs android <profile>` menjalankan
      sinkronisasi env tanpa pesan gagal lagi
- [ ] Verifikasi build production (AAB) membaca nilai env yang benar
      (cek log build EAS: "Environment variables ... loaded")
