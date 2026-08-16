# Tema neumorphism baru + backsound & sound efek yang cocok

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 036`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi: buatkan tema neumorphism dong, jangan lupa tema suara
> latarnya juga ya. Dan buatkan juga tema sound efek yang cocok dengan tema
> tersebut."

**Tujuan:** menambah tema aplikasi baru bergaya **neumorphism** (soft UI —
warna lembut senada latar, bayangan dalam/terang timbul) di Pasar, lengkap
dengan:
1. **Backsound (suara latar)** tema — URL MP3 online yang cocok dengan
   suasana neumorphism (mis. ambient lembut/tenang).
2. **SoundSpec (sound efek)** tema — `rate` + `volume` yang cocok dengan
   gaya tema tersebut.

## Langkah

- [x] **1. Identifikasi sistem tema** — pelajari `themeData.ts` (AppTheme/
  BoardTheme/KeyboardTheme + `sound` + `ambient`), resolver `get*ThemeById`,
  generator seed SQL (`scripts/db/gen-themes-sql.mjs` → `supabase/data/
  themes.sql`) & cara push ke Supabase. Catatan penting: karena PLAN-033
  membuat papan/keyboard ikut tema aplikasi via id yang sama, tema app baru
  juga butuh **board theme & keyboard theme dengan id sama** (mis. `neumorfik`)
  agar papan & keyboard ikut bergaya neumorphism.
- [x] **2. Buat tema neumorphism** — palet light & dark bergaya soft-UI
  (latar senada permukaan, kontras lembut, aksen satu warna), `sound` (label +
  rate/volume cocok, mis. "Lembut" rate <1) dan `ambient` (label + URL MP3
  online yang cocok, verifikasi URL hidup), plus board & keyboard theme id
  sama; daftarkan di registry `APP_THEMES`/`BOARD_THEMES`/`KEYBOARD_THEMES`.
- [x] **3. Seed DB & verifikasi** — regenerate `themes.sql`, push ke Supabase
  (katalog Pasar), tsc + tes; pastikan tema tampil di Pasar, bisa diaktifkan,
  backsound & sound efek berganti saat tema aktif.

## Catatan Revisi

- **2.** 2026-08-16: Dikerjakan batch 2026-08-16: tema aplikasi 'Neumorfik' (id neumorfik) — palet soft-UI light/dark (abu lembut + aksen biru baja), SoundSpec 'Lembut' (rate 0.85, volume 0.75), ambient 'Kicau burung pagi' (mixkit 2472, URL diverifikasi HTTP 200 audio/mpeg); board & keyboard theme id neumorfik ikut dibuat (PLAN-033 me-resolve papan/keyboard dari id app), registry APP/BOARD/KEYBOARD_THEMES + themes.sql diregenerate (19 tema) & di-push ke Supabase (HTTP 201).
