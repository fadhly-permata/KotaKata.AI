# Force close random di real device (Android 12–15)

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 023`
> (lihat `bun .agents/plans/plan.mjs help`)

## 🚩 FLAG: BUG (ditangguhkan)

Plan ini bersifat **bug** dan untuk sementara **DITANGGUHKAN** (keputusan
pemilik, 2026-08-14). Kemungkinan teratasi oleh PLAN-025 (hapus react-native-svg
dari ThemedBackground). Suatu hari nanti bisa **dibatalkan** atau **dikerjakan**.

## Revisi (laporan dari pemilik)

> "Aplikasi yang terinstall pada real device terkadang mengalami force closed
> secara random (posisi dan kejadian selalu gak pasti)."

**Perangkat yang mengalami (klarifikasi pemilik):** 3× **Android 14**, 1×
**Android 15**, 1× **Android 12** — BUKAN Android 9 (kasus Android 9 saat
scroll Main Menu dicatat terpisah di PLAN-024).

**Konteks teknis:**
- Stack: Expo SDK ~57 / RN 0.86.2 / Hermes, react-native-svg 15.15.4, expo-audio.
- Gejala random (posisi & kejadian tak pasti) di Android modern → lebih
  mengarah ke **crash native** (tekanan memori / modul native tertentu) atau
  **JS exception tak tertangkap**, bukan bug satu layar.
- Kandidat yang masuk akal untuk diinvestigasi:
  1. **Tekanan memori**: ThemedBackground SVG gradien di semua layar + tema
     Samudra/Senja pakai gambar latar full-screen (ImageBackground URL remote)
     + 24 orb ambien → OOM native.
  2. **expo-audio backsound streaming** (URL MP3 remote, loop) — pemakaian
     terus-menerus; potensi crash/leak di player native.
  3. **JS exception tak tertangkap** di alur tertentu (mis. data korup dari DB,
     layout race) — perlu log aplikasi (Pengaturan → Log Aplikasi) / logcat.
  4. **react-native-svg** di konfigurasi tertentu (gradien + preserveAspectRatio).

**Cara konfirmasi (saat dikerjakan):** kumpulkan `adb logcat` dari salah satu
device (atau isi log aplikasi) saat crash terjadi; cek apakah crash native
(sinyal/abort/OOM) atau JS (FATAL EXCEPTION di ReactNativeJS).

## Langkah (rencana, belum dikerjakan)

- [x] **1. Kumpulkan bukti** — logcat / log aplikasi dari device Android 12–15 saat force close random.
- [x] **2. Identifikasi akar masalah** — pisahkan JS exception vs crash native; uji isolasi (matikan backsound, ganti tema tanpa gambar, kurangi orb).
- [x] **3. Implementasi fix** — (isi sesuai temuan).

## Catatan Revisi

- **1.** 2026-08-16: Dikerjakan bersama PLAN-024/027 (batch 2026-08-16): mitigasi force close — semua animasi orb/bounce (AmbientOrbs, MainMenu, Auth) hanya berjalan saat layar fokus; backsound crossfade. Verifikasi device Android masih disarankan oleh pemilik.
