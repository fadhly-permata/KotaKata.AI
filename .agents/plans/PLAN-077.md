# PLAN-077: Rapikan Konflik Env EAS Production

## Status: DONE

## Laporan / Permintaan (dari pemilik)
Perapihan konflik environment variable di EAS production. Ditemukan saat
build APK preview (PLAN-076): `eas env:push --force` dari
`scripts/expo-build.mjs` gagal untuk `EXPO_PUBLIC_SUPABASE_ANON_KEY` di
environment **production** dengan pesan:

> This project already has an environment variable named
> "EXPO_PUBLIC_SUPABASE_ANON_KEY" in the following environments: production.

## Hasil Audit (22 Agustus 2026)
- Var di EAS **sudah benar scope-nya**: PROJECT + PUBLIC, nilai konsisten
  antara preview & production (EXPO_PUBLIC_SUPABASE_URL +
  EXPO_PUBLIC_SUPABASE_ANON_KEY), dibuat 12 Agustus.
- Akar konflik BUKAN scope ganda, melainkan perilaku eas-cli:
  `env:push` maupun `env:set` menolak operasi yang mencakup dua environment
  sekaligus (`--environment preview --environment production`) kalau var
  bernama sama sudah ada di salah satunya.

## Langkah
- [x] Audit var env EAS (`eas-cli env:list --format long` via mode baru
      `node scripts/expo-build.mjs --env <environment>`)
- [x] Ganti mekanisme sinkronisasi: `env:push` (file) → **`eas env:set` per
      var PER environment** (create-or-update, tidak pernah konflik) di
      `scripts/expo-build.mjs`
- [x] Tambah flag `--sync-only` (sinkron env tanpa kirim build) dan
      `--env <name>` (inspeksi daftar env) untuk maintenance
- [x] Verifikasi `--sync-only`: 4 update sukses (2 var × preview+production),
      tanpa error ✅
