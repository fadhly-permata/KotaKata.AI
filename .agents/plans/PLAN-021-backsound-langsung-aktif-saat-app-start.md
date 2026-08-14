# Backsound tidak langsung aktif saat aplikasi dijalankan

<!-- status: pending -->
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

## Langkah (rencana fix, belum dikerjakan)

- [ ] **1. Tentukan perilaku target** — web: tetap tunduk autoplay policy + opsi hint "ketuk untuk memutar suara latar"; native: pastikan start bersih saat launch (tunggu prefs, mulai streaming segera).
- [ ] **2. Implementasi** — (isi saat dikerjakan)

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 021 <no> "teks"`)_
