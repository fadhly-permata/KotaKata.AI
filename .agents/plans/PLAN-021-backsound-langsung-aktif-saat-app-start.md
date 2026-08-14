# Backsound tidak langsung aktif saat aplikasi dijalankan

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 021`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (laporan bug)

> Dicatat dari pesan pemilik: "kenapa background suara gak langsung aktif ketika aplikasi dijalankan?"

**Analisis penyebab (tanpa mengubah kode):**
- `ThemeProvider` sudah memanggil `setAmbientSound(appTheme.ambient)` saat mount — jadi secara logika backsound dimulai di start.
- **Web**: browser memblokir autoplay audio sampai interaksi user pertama (kebijakan browser, bukan bug kode). Kode sudah otomatis memutar saat gestur pertama (`retryAmbientOnGesture`). Yang bisa ditingkatkan: indikator/hint halus "ketuk layar untuk memutar suara latar" saat autoplay terblokir, supaya user tahu.
- **Native**: backsound mulai saat start, tapi sumbernya **URL MP3 online (Mixkit CDN)** — butuh jaringan; bunyi muncul setelah buffering. Offline / URL tidak terjangkau → senyap (by design).
- Bug minor terkait (ditemukan saat analisis, belum diputuskan dikerjakan):
  1. Race: `loadSoundPrefs`/`loadAmbientPrefs` async — kalau user menyimpan suara **mati**, di start efek mount sempat memutar backsound sebelum preferensi terbaca (backsound bisa terdengar walau setting mati, atau sebaliknya). Fix: tunggu prefs dimuat sebelum `setAmbientSound` pertama.
  2. Web: gestur pertama yang terjadi sangat awal (sebelum backsound siap) bisa lolos dari retry — listener tetap terpasang, jadi kecil pengaruhnya.

## Langkah

- [x] **1. Fix race preferensi** — `sound.ts`: promise `whenSoundPrefsReady()` selesai saat efek suara & backsound selesai dibaca dari AsyncStorage (`loadSoundPrefs`/`loadAmbientPrefs` menandai selesai di `finally`); `ThemeProvider` menunggu promise itu sebelum `setAmbientSound` pertama → backsound tidak sempat berbunyi walau user mematikan suara di sesi sebelumnya.
- [x] **2. Hint web saat autoplay diblokir** — `sound.ts` expose `subscribeAmbientStatus` (status "diblokir autoplay" di web); komponen baru `AmbientSoundHint` (pill "🔊 Ketuk layar untuk memutar suara latar", hilang sendiri 6 detik) dirender di `ScreenFade` → muncul di semua halaman, native tidak dirender.

## Catatan Revisi

- Selesai dikerjakan bersama PLAN-022 & PLAN-025 (batch 2026-08-14). Verifikasi tsc + 43 tes + lint lolos.
