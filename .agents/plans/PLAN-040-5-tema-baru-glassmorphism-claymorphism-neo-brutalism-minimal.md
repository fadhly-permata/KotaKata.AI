# 5 tema baru: Glassmorphism, Claymorphism, Neo-Brutalism, Minimalist UI, Frost UI

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 040`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambah revisi:
> - buatin tema glassmorphism
> - buatin tema claymorphis
> - buatin tema noe-brutalism
> - buatin tema minimalist UI
> - buatin tema frost ui (soft glass)"

**Tujuan:** menambah **5 tema aplikasi baru** di Pasar (registry `APP_THEMES`),
masing-masing dengan gaya visual khasnya + **board & keyboard theme dengan id
sama** (PLAN-033: papan & keyboard mengikuti tema aplikasi via id) + **SoundSpec**
& **ambient backsound** yang cocok dengan kepribadian tema (mengikuti pola
PLAN-036/037). Sistem skin PLAN-038 (token `shadow`/`radius`/warna generik +
helper `skin.ts`) dipakai supaya efek gaya tema merata ke SEMUA komponen, bukan
hanya beberapa halaman.## Langkah

- [x] **1. Identifikasi titik ekstensi tema** — `themeData.ts`: tipe `AppThemeDefinition`
  (`colors` + `background?` + `sound` + `ambient?` + token skin `shadow?`/`radius?`),
  registry `APP_THEMES`/`BOARD_THEMES`/`KEYBOARD_THEMES`, resolver `get*ThemeById`,
  generator seed `scripts/db/gen-themes-sql.mjs` → `supabase/data/themes.sql` + push
  ke Supabase (katalog Pasar), dan mekanisme skin (`skin.ts` + `neumorphic.ts`).
  Catatan: `shadow` saat ini bertipe `NeumorphicShadowSpec` (2 arah) — untuk gaya
  non-neumorphic (glass/clay/brutal/minimal/frost) perlu evaluasi apakah spec bayangan
  perlu diperluas (mis. dukungan warna/offset tunggal atau shadow soft transparan).
  **Hasil evaluasi:** TIDAK perlu perluas tipe — variasi gaya dicapai lewat nilai spec:
  glass/frost = blur besar + offset kecil + alpha rendah (soft diffuse); clay = offset
  sedang + blur sedang + warna highlight/dark berwarna; brutalist = `light: "transparent"`
  + `blur: 0` → bayangan keras SATU arah (trik tanpa ubah tipe); minimal = tanpa token
  `shadow` (helper skin no-op).
- [x] **2. Tema Glassmorphism** — id `glassmorphism`: latar gradien ungu→biru→merah muda
  + veil putih (overlay), permukaan `rgba(255,255,255,0.4)` (light) / `rgba(255,255,255,0.1)`
  (dark), border putih transparan, bayangan soft blur 22-24, radius 18; sound "Jernih",
  ambient "Angin sepoi" (mixkit 2658 ✓); board & keyboard id sama.
- [x] **3. Tema Claymorphism** — id `claymorphism`: pastel hangat krim/peach/mawar,
  radius 22, bayangan clay (highlight putih + dark coklat hangat, offset 8/blur 18);
  sound "Hangat", ambient "Api unggun malam" (mixkit 1329 ✓); board & keyboard id sama.
- [x] **4. Tema Neo-Brutalism** — id `neo-brutalism`: warna solid berani, border hitam
  tebal, radius 4, bayangan keras blur 0 offset 5 (light `transparent` → satu arah),
  gelap pakai border & bayangan putih; sound "Tegas", ambient "Hiruk-pikuk kota"
  (mixkit 2505 ✓); board & keyboard id sama.
- [x] **5. Tema Minimalist UI** — id `minimalist`: flat (tanpa shadow), latar polos,
  border abu halus, aksen hitam-putih, radius 10; sound "Hening", ambient "Angin hutan
  sejuk" (mixkit 1237 ✓); board & keyboard id sama.
- [x] **6. Tema Frost UI (soft glass)** — id `frost`: kaca buram es biru rendah saturasi,
  bayangan sangat halus, border tipis; sound "Dingin", ambient "Angin dingin"
  (mixkit 1172 ✓); board & keyboard id sama.
- [x] **7. Seed DB & verifikasi menyeluruh** — regenerate `themes.sql` (34 tema), push ke
  Supabase (HTTP 201), tsc + 43 tes + lint lolos, ambience URL diverifikasi HTTP 200.

## Catatan Revisi

- **1–7.** 2026-08-16: Dikerjakan tuntas satu batch — 5 tema aplikasi baru di registry
  (APP/BOARD/KEYBOARD_THEMES + ThemeProvider resolve otomatis via id), masing-masing
  light/dark penuh + token skin radius/shadow + SoundSpec + ambient (URL Mixkit
  diverifikasi HTTP 200). Gaya khas per tema via nilai spec shadow (tanpa ubah tipe):
  glass/frost soft diffuse, clay 2-arah hangat, brutalist blur 0 + light transparent
  (bayangan keras satu arah), minimal tanpa shadow (flat). themes.sql diregenerate
  (34 tema) & di-push ke Supabase (HTTP 201); tsc + 43 tes + lint lolos; commit
  6f40496 (tema + seed) → docs di commit terpisah + deploy web (aturan #6).
