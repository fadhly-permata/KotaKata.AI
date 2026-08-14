# Keseragaman Tema, Tema Suara & Gambar Latar, Orb Semua Halaman, Dialog Keluar, Deploy Web

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 018`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Pemilik repo mencatat 3 keluhan soal tema + 3 revisi baru:

**Keluhan tema (belum tuntas):**
1. **Tema gambar background** — dukungan `imageUrl` sudah ada sejak PLAN-017,
   tapi belum ada tema bawaan yang benar-benar memakai gambar latar.
2. **Tema suara** — tema belum punya kepribadian audio sama sekali.
3. **Keseragaman tema** — saat membuat tema baru harusnya 1 nama tema punya
   versi aplikasi + papan + keyboard sekaligus; sekarang banyak yang tidak
   nyambung (mis. tema aplikasi "Samudra" tidak punya papan/keyboard Samudra).

**Revisi baru:**
4. **Orb di semua halaman** — efek orb hanya ada di Main Menu & Login; mau di
   semua halaman, posisi/ukuran/lokasi dinamis & random, minimal 20 orb, boleh
   tumpang tindih, dan jadikan komponen reusable.
5. **Dialog keluar permainan** — tambahkan ikon di tombolnya + tata letak
   tombol responsif (HP: vertikal, layar lebar: horizontal).
6. **Deploy Web EAS** — deploy web ke expo.dev (EAS Hosting).

## Solusi

1. **Keseragaman tema** — `themeData.ts` ditambah **papan & keyboard** untuk
   tiap tema aplikasi: Samudra, Senja, Hutan (puitis sudah lengkap). Total
   katalog: 4 app · 6 papan · 6 keyboard. Palet papan/keyboard diturunkan dari
   palet aplikasi agar senada.
2. **Tema gambar background** — `imageUrl` dipasang di tema aplikasi **Samudra**
   (gambar laut) & **Senja** (gambar senja) + overlay kontras; gradien tetap
   jadi fallback saat offline/gagal dimuat.
3. **Tema suara** — tiap tema aplikasi punya `sound` spec (`rate` + `volume`):
   Puitis=Klasik, Samudra=Tenang (lebih pelan & lembut), Senja=Hangat, Hutan=Segar
   (lebih cepat). `sound.ts` memakai `playbackRate`/`volume` expo-audio
   (native) & HTMLAudioElement (web) — tanpa aset audio baru.
4. **Orb semua halaman** — komponen baru `AmbientOrbs` (self-contained: ~24
   orb random, warna palet tema, animasi naik-turun fase berbeda, satu native
   driver). Dirender otomatis oleh **ScreenFade** (dipakai hampir semua layar,
   termasuk GameScreen). Main Menu & Login mematikan via `orbs={false}` karena
   sudah punya FloatingOrbs parallax sendiri.
5. **Dialog keluar** — `ConfirmDialog` dapat `confirmIcon`/`cancelIcon` (emoji
   di tombol) + tata letak responsif (kolom di layar sempit, baris di layar
   lebar via `useWindowDimensions`).
6. **Deploy Web** — script `scripts/expo-deploy-web.mjs` + npm script
   `deploy:web`: export web (`expo export`) lalu `eas deploy` (EAS Hosting).
7. **DB & dokumen** — regenerasi `supabase/data/themes.sql` + push; README,
   RELEASE_NOTES; verifikasi tsc + test + lint.

## Langkah

- [x] **1. Registry tema** — papan/keyboard Samudra, Senja, Hutan + sound spec + imageUrl Samudra/Senja.
- [x] **2. Tema suara** — `sound.ts` (setSoundTheme + rate/volume) & ThemeProvider terapkan.
- [x] **3. AmbientOrbs + ScreenFade** — komponen reusable, render global, MainMenu/Auth matikan.
- [x] **4. ConfirmDialog** — ikon tombol + responsif; GameScreen pakai ikon.
- [x] **5. DB** — regenerasi seed + push ke Supabase.
- [x] **6. Deploy Web EAS** — script deploy:web + jalankan deploy ke expo.dev.
- [x] **7. Dokumen & verifikasi** — README, RELEASE_NOTES, tsc/test/lint, preview start.

## Catatan Revisi

- _(belum ada — gunakan `bun .agents/plans/plan.mjs note 018 <no> "teks"`)_
