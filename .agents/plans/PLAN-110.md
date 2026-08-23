# PLAN-110 — Hasil Audit Bug (23 Aug 2026)

**Status:** PENDING

Scanner `npm run audit:bugs`: 101 file · 16 temuan (5 kritis, 11 sedang).
Setelah verifikasi manual konteks kode: **10 false positive**, **2 temuan nyata**,
sisanya duplikat antar-daftar kritis/sedang.

## 🔴 Kritis

### K1. ResolutionSimulator — akses `window.location` dieksekusi di native APK
- **Lokasi:** `src/presentation/components/common/ResolutionSimulator.tsx:83` (useMemo `iframeElement`)
- **Aturan:** #5b (API web-only wajib guard fungsi/platform)
- **Gejala:** factory useMemo mengakses `window.location.href` tanpa guard.
  Sejak fix React #310 (commit `0a979cb`) semua hook dipindah KE ATAS
  early-return — artinya factory ini dieksekusi di SETIAP render, TERMASUK
  native Hermes yang tidak punya `window.location`.
- **Dampak:** **crash App saat mount di APK** (TypeError) — regresi dari fitur
  simulasi resolusi (PLAN-068). Web aman; native rusak. Belum terlihat di log
  karena APK build terakhir belum memuat commit ini.
- **Saran fix:** guard di dalam factory (`if (!isWeb) return null;`) atau
  pindahkan pembuatan iframe ke variabel biasa SETELAH early-return
  (bukan hook).

## 🟡 Sedang

### S1. logDb — `Alert.alert` no-op di web untuk fatal error
- **Lokasi:** `src/utils/logDb.ts:407`
- **Gejala:** handler ErrorUtils (fatal) menampilkan dialog via `Alert.alert`
  yang no-op di react-native-web; dipanggil tanpa guard platform (hanya dibungkus
  try-catch dengan komentar "abaikan").
- **Dampak:** di web, fatal error tidak menampilkan dialog peringatan dari jalur
  ini (web tetap punya handler `window.onerror` + ErrorBoundary UI sendiri,
  jadi dampaknya kecil).
- **Saran fix:** skip `Alert.alert` saat `Platform.OS === "web"`, atau ganti
  mekanisme tampil per-platform.

## ✅ False positive (terverifikasi aman — guard ada di konteks)

| Lokasi | Alasan aman |
|---|---|
| GameScreen.tsx:941–942 | effect di-guard `Platform.OS !== "web"` (baris 932) |
| useEscapeClose.ts:22–23 | di-guard `!active \|\| Platform.OS !== "web"` (baris 21) |
| logDb.ts:429, 439 | dibungkus `typeof window.addEventListener === "function"` (~baris 426) |
| supabase.ts:81 window.close | blok luar mewajibkan `Platform.OS === "web"` |
| useAuth.ts:68, 74 | branch native `return data` lebih awal; popup code hanya web |

## 📌 Catatan pemeriksaan manual area baru (git log -10)

- Automasi bulk per-soal (d4e10c9 + turunannya): alur stop instan via
  `AbortController`, pause antar-soal, progress per soal — logika konsisten,
  tidak ditemukan masalah baru.
- Fix React #310 (0a979cb) justru memunculkan K1 di atas — dijadwalkan fix
  terpisah lewat plan ini.
