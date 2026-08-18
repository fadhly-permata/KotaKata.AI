# Pasang AdMob Google: interstitial fullscreen saat loading soal (Android)

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 063`

## Revisi (dari pemilik)

> "Pasang admob google dengan detail berikut (sekalian simpan di file
> .env.local buat reminder gua):
> - app_id: ca-app-pub-5179875584103025~5542577035
> - Ad Unit ID: ca-app-pub-5179875584103025/7416408822
>
> Pasangkan iklan full screen interstitial pada saat game sedang memuat soal
> (loading), dan iklan baru tertutup ketika user menutupnya secara manual.
> Detail di atas hanya untuk aplikasi android ya."

**Tujuan:** integrasi **Google AdMob** ke aplikasi Android KotaKata.AI:
- Tampilkan **interstitial fullscreen** saat game sedang **memuat/generate
  soal** (papan baru).
- Iklan hanya tertutup oleh **user secara manual** (tidak auto-close).
- **Hanya Android** — iOS tidak diubah (AdMob tidak tampil).

## Identitas AdMob

| Item | Nilai |
| :--- | :--- |
| App ID | `ca-app-pub-5179875584103025~5542577035` |
| Ad Unit ID (Interstitial) | `ca-app-pub-5179875584103025/7416408822` |

> **Catatan .env.local:** Pemilik harus menambahkan variabel berikut ke
> `.env.local` secara manual (perintah ini tidak mengedit .env):
> ```
> EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-5179875584103025~5542577035
> EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-5179875584103025/7416408822
> ```

## Cakupan

- **Install:** `expo-admob` atau `react-native-google-mobile-ads` (cek mana
  yang kompatibel dengan Expo SDK 57 + Expo Go / development build).
- **Setup:** registrasi App ID di `app.json`/`app.config.js` (field
  `android.config.googleMobileAdsAppId` untuk Expo) atau di kode awal app.
- **Ad Unit:** load interstitial ad unit → tampilkan saat game mulai memuat
  soal papan baru (navigate ke game atau tap "Main").
- **Behavior:** ad bersifat **user-dismissed** (hanya tertutup saat user tap
  tombol close / back); tidak ada auto-dismiss timer.
- **Platform guard:** `Platform.OS === "android"` — iOS skip ad.
- **AndroidManifest.xml:** tambah metadata AdMob App ID (otomatis via Expo
  config plugin atau manual di prebuild).

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan)_
