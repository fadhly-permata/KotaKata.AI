# Rombak tema Neumorfik jadi gaya neumorphism.io (latar senada + bayangan timbul)

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 037`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tema neumorphic yg gua pengen yang kayak di sini https://neumorphism.io"

**Tujuan:** tema "Neumorfik" (PLAN-036) yang sudah dibuat belum sesuai gaya
neumorphism.io yang dimaksud. Gaya khas neumorphism.io:
1. Latar **abu lembut** (light: sekitar `#e0e5ec`; dark: abu gelap senada).
2. **Permukaan (surface) SAMA dengan warna latar** — bukan surface yang beda
   warna; elemen dibedakan lewat **bayangan ganda**: terang di kiri-atas
   (mis. `rgba(255,255,255,0.5)` / versi terang) dan gelap di kanan-bawah
   (mis. `rgb(163,177,198,0.6)` / versi gelap), sehingga terlihat "timbul".
3. Aksen **biru** (keluarga `#3d5afe`–`#5b8cff`) seperti toggle di situs itu.
4. Border sangat halus/tanpa border; teks abu gelap lembut.

Jadi palet yang sekarang (surface beda tone + border jelas) perlu dirombak
menjadi: **surface = latar**, dan dukungan **bayangan timbul** pada elemen
kunci (kartu Pasar, panel, tombol, keyboard, grid) supaya benar-benar terlihat
neumorphism.

## Langkah

- [ ] **1. Rombak palet Neumorfik** — `themeData.ts`: light `background`≈
  `#e0e5ec` & `surface` = tone yang sama (bukan beda warna), border sangat
  halus, aksen biru `#3d5afe`-ish; dark mode senada (abu gelap, surface = latar).
  Board & keyboard theme `neumorfik` ikut dirombak agar tetap senada.
- [ ] **2. Dukungan bayangan timbul** — tambahkan spec bayangan neumorphic
  (opsional per tema: warna terang & gelap + offset) di theme, lalu terapkan ke
  komponen kunci yang memakai warna surface: kartu di Pasar, TopBar/panel hint
  in-game, tombol, keyboard keys, grid cells — elemen "timbul" (raised) dan
  "tertekan" (pressed) sesuai gaya neumorphism.io.
- [ ] **3. Seed & verifikasi** — regenerate `themes.sql` + push ke Supabase,
  tsc + tes, cek tampilan di preview (web) untuk light & dark.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 037 <no> "teks"`)_
