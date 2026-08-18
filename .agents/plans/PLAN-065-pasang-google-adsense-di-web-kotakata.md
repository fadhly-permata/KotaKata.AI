# PLAN-065 — Pasang Google AdSense di Web KotaKata.AI

## Problem

User ingin memasang iklan Google AdSense di versi web aplikasi KotaKata.AI.

## AdSense Info

- **Publisher ID:** `ca-pub-5179875584103025`
- **Script:** `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5179875584103025" crossorigin="anonymous"></script>`
- **Platform:** Web saja (bukan native mobile)

## Solution

### 1. Tambahkan script AdSense ke `public/index.html`
- Tambahkan tag `<meta name="google-adsense-account" content="ca-pub-5179875584103025">` di `<head>`
- Tambahkan script AdSense di `<head>` atau sebelum `</body>`
- Script hanya dimuat di web (React Native web), tidak mempengaruhi native

### 2. Tempatkan iklan
- **Belum tentukan** — tergantung user ingin iklan di halaman mana (landing page, in-game, settings, dll.)
- Untuk MVP: iklan di halaman utama (MainMenu) atau bawah halaman game
- Gunakan AdSense auto-ad atau manual placement

### 3. Pertimbangan
- Script AdSense memanggil Google Analytics — tidak mempengaruhi performa native
- Untuk Expo web (Vite), script bisa langsung ditaruh di `public/index.html`
- Jangan letakkan iklan di halaman auth/login
- Pertimbangkan user experience — jangan sampai iklan mengganggu gameplay

## Files Changed
- `public/index.html` — tambah script AdSense

## Verification
- Build web → cek AdSense script termuat di HTML
- Buka web di browser → cek iklan muncul (atau placeholder jika belum approve)
- Native build (APK) tidak terpengaruh (script hanya di public/index.html web)
