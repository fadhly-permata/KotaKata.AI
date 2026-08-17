# Fix animasi orb sering macet di web (setelah patch terakhir)

<!-- status: done -->
<!-- dibuat: 2026-08-17 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 051`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Animasi Orb: Setelah patching terakhir animasi orb sering macet (testing
> baru di web based, gak tau kalo yang android)."

**Tujuan:** menghilangkan kondisi animasi orb (dan partikel AmbientFx) yang
**sering berhenti/macet** di web — orb diam di satu posisi sampai layar
di-refresh/navigasi. Perilaku Android belum terverifikasi pemilik; fix harus
TIDAK membatalkan mitigasi force close (PLAN-023/024/027) di native.

## Temuan analisis awal (belum ubah kode)

- Lokasi animasi orb: `AmbientOrbs.tsx` (semua halaman via `ScreenFade`),
  `AmbientFx.tsx` (PLAN-044 — partikel mengikuti backsound, menggantikan orb),
  `FloatingOrbs.tsx` + loop `orbBounce`/`bounceAnim` di `MainMenuScreen.tsx`
  & `AuthScreen.tsx`.
- Semua loop memakai pola yang sama sejak guard fokus PLAN-027:
  `useEffect → if (!isFocused) return; → Animated.loop(Animated.sequence([...]))
  → loop.start() → cleanup loop.stop()`.
- `useNativeDriver: true` TIDAK berlaku di web (react-native-web 0.21.2
  memakai JS driver) — jadi perbedaan platform tidak terlihat dari kode.
- Kandidat penyebab macet (bug `Animated.loop` + `sequence` + stop/restart
  yang dikenal di RN/RNW, mis. facebook/react-native#28517):
  1. **Churn stop/restart saat ganti fokus**: navigasi keluar-masuk layar
     memanggil `loop.stop()` di tengah siklus, lalu `setValue(0)` + loop baru
     saat fokus kembali — di RNW bisa meninggalkan value macet di posisi akhir
     sehingga orb diam (loop tidak jalan).
  2. **`Animated.loop(sequence)` berhenti setelah satu siklus** di sebagian
     versi RNW terutama setelah pernah di-`stop()` — cocok dengan gejala
     "sering macet" (kadang jalan, kadang tidak).
  3. **Tab background → resume**: timer JS RNW bisa melorot/berhenti saat tab
     tidak aktif dan tidak lanjut benar setelah kembali.

## Cakupan

- `src/presentation/components/common/AmbientOrbs.tsx`
- `src/presentation/components/common/AmbientFx.tsx`
- `src/presentation/components/common/FloatingOrbs.tsx` (bila perlu)
- `src/features/game/MainMenuScreen.tsx` & `src/features/auth/AuthScreen.tsx`
  (loop `orbBounce` + `bounceAnim`)
- Wajib: tetap jaga guard fokus di **native** (mitigasi force close).

## Langkah (disusun saat dikerjakan)

- [x] **1. Reproduksi & petakan** — pastikan gejala: layar mana yang macet
  (menu? semua halaman?), apakah setelah navigasi keluar-masuk, apakah setelah
  ganti tab browser; cek konsol web untuk error.
- [x] **2. Perbaiki mekanisme loop** — buat pola animasi yang tahan stop/restart
  di RNW: mis. satu loop kontinu yang hidup selama komponen terpasang dengan
  pause/resume via `stopAnimation` + `setValue` yang aman, atau restart yang
  membuang animasi lama sepenuhnya (bukan `loop.stop()` + loop baru pada value
  yang sama); alternatif platform-specific (`Platform.OS === "web"`).
- [x] **3. Terapkan konsisten** — `AmbientOrbs`, `AmbientFx`, `orbBounce`/
  `bounceAnim` (MainMenu + Auth) pakai pola baru yang sama.
- [x] **4. Jaga mitigasi Android** — pastikan guard fokus tetap aktif di
  native supaya tidak menumpuk loop saat layar tertutup (PLAN-023/024/027).
- [x] **5. Verifikasi** — tsc + tes + lint; cek web preview: navigasi
  keluar-masuk & ganti tab berkali-kali, orb tidak macet; Android tidak bisa
  dites di sini (serahkan ke pemilik, tanpa mengubah perilaku native).
- [x] **6. Rilis** — commit + push + deploy web (aturan #6).

## Catatan Revisi
- **2.** 2026-08-17: Akar masalah SEBENARNYA setelah verifikasi lanjutan: selain churn fokus, array orbBounce dibuat INLINE di body komponen (MainMenu & Auth) → identitas berubah tiap render → useMemo dep berubah → effect stop/restart semua loop SETIAP render (inilah yang bikin macet di RNW; tetap terjadi setelah fix tahap 1 karena useMemo bergantung array tak stabil). Fix final: orbBounce distabilkan via useRef([...]).current + useAmbientLoops web pakai deps [] (sekali mount, kebal churn apa pun).

- **5.** 2026-08-17: Helper useAmbientLoops (src/utils/ambientLoop.ts): web = loop sekali mount tanpa churn stop/restart (anti macet RNW), native = tetap gated fokus (mitigasi force close). Diterapkan ke AmbientOrbs, MainMenu (bounce + 7 orb), AuthScreen (4 orb); AmbientFx pakai platform-split inline (custom loop). CompletionOverlay aman (loop sekali mount).
