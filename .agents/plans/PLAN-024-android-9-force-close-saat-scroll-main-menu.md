# Android 9: force close saat scroll Main Menu

<!-- status: pending -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 024`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (laporan/pertanyaan dari pemilik)

> "Ketika APK di install di Android 9, aplikasi bisa dibuka tapi pas di main
> menu pas gua scroll selalu force close, itu kenapa ya?"

**CATATAN:** kasus ini TERPISAH dari PLAN-023 (force close random di Android
12–15). Di Android 9 gejalanya **deterministik**: app terbuka normal, tapi
**scroll di Main Menu → force close**.

**Konteks teknis:**
- Android 9 = API 28 (2018, cukup tua vs stack 2026: Expo SDK ~57 / RN 0.86 /
  react-native-svg 15.15.4 / Hermes).
- Main Menu: `ScrollView` + `Animated.event(..., { useNativeDriver: true })`
  parallax (FloatingOrbs) + `Animated.loop` bounce + ThemedBackground SVG
  gradien di belakang layar.
- Kandidat penyebab (untuk diverifikasi saat dikerjakan):
  1. Parallax `Animated.event` native driver + banyak animasi serentak di
     device tua → jank/ANR/crash.
  2. `ThemedBackground` react-native-svg (`preserveAspectRatio="none"`,
     gradien) — dikenal bermasalah di Android lama (API < 29).
  3. Tekanan memori pada device Android 9 (RAM kecil): gradien SVG + gambar
     latar + orb.
  4. Kompatibilitas RN 0.86 / modul native vs API 28.

**Cara konfirmasi (saat dikerjakan):** `adb logcat` saat scroll → crash;
uji isolasi (scroll dengan tema Puitis vs Samudra/Senja, matikan orb/animasi).

## Langkah (rencana, belum dikerjakan)

- [ ] **1. Kumpulkan bukti** — logcat dari device Android 9 saat crash scroll Main Menu.
- [ ] **2. Identifikasi akar masalah** — JS exception vs crash native; uji isolasi.
- [ ] **3. Implementasi fix** — (isi sesuai temuan).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 024 <no> "teks"`)_
