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
- **In-game, di bawah keyboard virtual** — posisi tetap di bawah keyboard
- **Iklan tetap muncul saat keyboard di-hide** — artinya iklan selalu terlihat di area bawah game, baik keyboard tampil maupun tidak
- Implementasi: letakkan AdSense `<ins>` di bawah wrapper keyboard virtual di `GameScreen.tsx`
- Saat keyboard visible: iklan di bawah keyboard (area paling bawah layar)
- Saat keyboard hidden: iklan tetap terlihat di posisi yang sama (bawah action bar)
- Gunakan responsive ad format (320x100 mobile / 728x90 desktop)
- Hanya di platform **web** — native (APK) tidak menampilkan iklan

### 3. Pertimbangan
- Script AdSense hanya dimuat di web (`public/index.html`)
- Native build (APK) tidak terpengaruh — script tidak ada di bundle native
- Iklan harus diskalakan agar tidak mengambil terlalu banyak ruang layar
- Game grid + clue pill + action bar tetap prioritaskan ruang
- Pertimbangkan min-height agar iklan tidak terlalu kecil
- Jangan letakkan iklan di halaman auth/login

## Files Changed
- `public/index.html` — tambah script AdSense

## Verification
- Build web → cek AdSense script termuat di HTML
- Buka web di browser → cek iklan muncul (atau placeholder jika belum approve)
- Native build (APK) tidak terpengaruh (script hanya di public/index.html web)
