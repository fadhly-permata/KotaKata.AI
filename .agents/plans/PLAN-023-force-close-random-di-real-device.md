# Force close (random) di real device — termasuk Android 9 saat scroll main menu

<!-- status: pending -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 023`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (laporan dari pemilik)

> "Aplikasi yang terinstall pada real device terkadang mengalami force closed
> secara random (posisi dan kejadian selalu gak pasti)."
> Khusus: APK di **Android 9** — app terbuka, tapi **saat scroll di Main Menu selalu force close**.

**Konteks teknis:**
- Stack: Expo SDK ~57 / RN 0.86.2 / Hermes, react-native-svg 15.15.4, expo-audio — sangat baru; Android 9 = API 28 (2018, cukup tua). Kemungkinan inkompatibilitas modul native tertentu di API 28.
- Main Menu: `ScrollView` + `Animated.event(..., { useNativeDriver: true })` parallax (FloatingOrbs) + `Animated.loop` bounce + ThemedBackground SVG gradien (ScreenFade) di belakang semua layar.
- "Force close" di APK release bisa = **JS exception tak tertangkap** (tanpa redbox) ATAU **crash native** (OOM / modul native). Belum ada logcat/stacktrace → penyebab belum bisa dipastikan.

**Kandidat penyebab (untuk diverifikasi saat dikerjakan):**
1. Parallax `Animated.event` native driver + banyak animasi berjalan serentak (FloatingOrbs loop) di Android 9 → jank/ANR/crash.
2. `ThemedBackground` (react-native-svg, `preserveAspectRatio="none"`) — potensi masalah render di Android lama (API < 29).
3. Tekanan memori: gradien SVG + (tema Samudra/Senja) gambar latar full-screen + 24 orb ambien → OOM native (cocok dengan "force close random").
4. Modul native terbaru (RN 0.86) vs Android 9 — perlu uji minimal.

**Cara konfirmasi (saat dikerjakan):** minta `adb logcat` dari device (atau cek Pengaturan → Log Aplikasi — app mencatat error/warning JS lokal), lalu reproduce: pilih tema default Puitis vs Samudra/Senja, scroll cepat vs lambat.

## Langkah (rencana, belum dikerjakan)

- [ ] **1. Kumpulkan bukti** — logcat / log aplikasi dari device Android 9 saat crash scroll + saat force close random.
- [ ] **2. Identifikasi akar masalah** — pisahkan JS exception vs crash native; uji dengan animasi/orb/gambar dimatikan.
- [ ] **3. Implementasi fix** — (isi sesuai temuan).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 023 <no> "teks"`)_
