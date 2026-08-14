# Aturan Release GitHub, Script Build EAS & Fix Clue Auto-Height

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 016`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Tiga revisi dari pemilik repo:

1. **Atribusi rilis GitHub** — release v1.0.0 di GitHub tercatat atas nama
   `freebuff-web[bot]` (GitHub App Freebuff), bukan nama pemilik. Penyebabnya:
   perintah `gh` di workspace ini berjalan dengan kredensial GitHub App yang
   dikelola Freebuff (satu-satunya identitas yang tersedia untuk API GitHub),
   sehingga release yang dibuat lewat `gh release create` otomatis diatribusikan
   ke app tersebut — beda dengan commit yang memakai `user.name`/`user.email`
   git (Fadhly Permata). Perlu aturan agar ke depan release TIDAK dibuat dari
   workspace ini (atau dibuat dengan peringatan eksplisit), karena identitas
   pemilik tidak tersedia di sini.

2. **Script build via expo.dev** — pemilik ingin script yang bisa dipanggil
   sendiri dari terminal/shell (freebuff.com/web) untuk build APK/AAB lewat
   EAS (expo.dev), lengkap dengan cara pakai & lokasinya.

3. **Clue panel masih tidak auto-resize di HP** — saat teks soal panjang dan
   butuh beberapa baris, pill clue tidak ikut bertambah tinggi di layar ponsel
   (padahal di tablet/desktop aman). Perlu hardening layout agar pill tidak
   pernah menyusut / terpotong di native.

## Solusi

1. **Aturan di `AGENTS.md` (Aturan Proyek)** — jangan membuat GitHub Release
   dari workspace ini; kalau diminta, siapkan draf catatan rilis + tag dan
   minta pemilik membuat dari akunnya sendiri, atau peringatkan bahwa release
   akan tercatat atas nama GitHub App Freebuff.

2. **Script `scripts/expo-build.mjs`** — wrapper `eas build` non-interaktif:
   membaca `EXPO_TOKEN` dari env / `.env.local` / `.env`, default
   `--platform android --profile preview` (APK), terima argumen platform &
   profile, tampilkan URL hasil build di expo.dev + cara cek `build:list`.
   Ditambah npm script `build:eas` dan dokumentasi di README.

3. **Hardening auto-height pill clue** — `CluePill.tsx`: `flexShrink: 0` pada
   pill + pembungkus teks supaya tinggi selalu mengikuti isi (tidak pernah
   disusutkan Yoga saat ruang layar sempit di HP); `bottomPanels` juga diberi
   `flexShrink: 0` supaya panel bawah tidak ikut terdesak.

## Langkah

- [x] **1. Aturan release** — AGENTS.md: larang buat GitHub Release (identitas
  app, bukan pemilik) + prosedur penggantinya.
- [x] **2. Script build EAS** — `scripts/expo-build.mjs` + npm script
  `build:eas` + dokumentasi README.
- [x] **3. Fix clue auto-height** — `CluePill.tsx` + `GameScreen` (flexShrink 0).
- [x] **4. Dokumen & verifikasi** — RELEASE_NOTES + README; tsc + test + lint.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 016 <no> "teks"`)_
