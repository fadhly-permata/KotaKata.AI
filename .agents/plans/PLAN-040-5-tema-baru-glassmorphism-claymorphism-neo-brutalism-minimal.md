# 5 tema baru: Glassmorphism, Claymorphism, Neo-Brutalism, Minimalist UI, Frost UI

<!-- status: pending -->
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
hanya beberapa halaman.

## Langkah

- [ ] **1. Identifikasi titik ekstensi tema** — `themeData.ts`: tipe `AppThemeDefinition`
  (`colors` + `background?` + `sound` + `ambient?` + token skin `shadow?`/`radius?`),
  registry `APP_THEMES`/`BOARD_THEMES`/`KEYBOARD_THEMES`, resolver `get*ThemeById`,
  generator seed `scripts/db/gen-themes-sql.mjs` → `supabase/data/themes.sql` + push
  ke Supabase (katalog Pasar), dan mekanisme skin (`skin.ts` + `neumorphic.ts`).
  Catatan: `shadow` saat ini bertipe `NeumorphicShadowSpec` (2 arah) — untuk gaya
  non-neumorphic (glass/clay/brutal/minimal/frost) perlu evaluasi apakah spec bayangan
  perlu diperluas (mis. dukungan warna/offset tunggal atau shadow soft transparan).
- [ ] **2. Tema Glassmorphism** — latar gradien/backdrop hidup (blur kaca), permukaan
  transparan semi-putih dengan border tipis transparan (frosted glass: highlight atas +
  bayangan lembut), aksen cerah. Light & dark. Board & keyboard id sama + sound/ambient
  cocok (mis. ambient lembut/elegant). Terapkan dukungan blur/transparansi di skin
  (token baru bila perlu) agar kartu/panel/tombol terlihat "kaca".
- [ ] **3. Tema Claymorphism** — warna pastel berani (clay), permukaan "lembek"
  (radius besar, bayangan lembut 2-arah seperti clay + highlight), border tegas lembut,
  aksen kontras. Light & dark. Board & keyboard id sama + sound/ambient cocok
  (mis. playful/hangat).
- [ ] **4. Tema Neo-Brutalism** — gaya brutalist: latar polos berani, border hitam tebal,
  bayangan keras offset solid (tanpa blur), sudut kotak/tajam (radius kecil/0), aksen
  warna-warni solid. Light & dark. Board & keyboard id sama + sound/ambient cocok
  (mis. energik).
- [ ] **5. Tema Minimalist UI** — sangat bersih: latar polos terang/gelap, banyak ruang
  kosong, border & bayangan minimal (hampir flat), aksen satu warna saja, teks
  kontras tinggi. Light & dark. Board & keyboard id sama + sound/ambient cocok
  (mis. tenang).
- [ ] **6. Tema Frost UI (soft glass)** — variasi glass yang lebih lembut: kaca buram
  (frost) dengan saturasi rendah, transparansi ringan, border tipis, bayangan sangat
  halus; nuansa dingin (frost/ice). Light & dark. Board & keyboard id sama +
  sound/ambient cocok (mis. dingin/sejuk).
- [ ] **7. Seed DB & verifikasi menyeluruh** — regenerate `themes.sql`, push ke Supabase,
  tsc + tes + lint, cek visual web (tiap tema light & dark, diaktifkan dari Pasar),
  pastikan backsound/sound efek berganti & skin merata (kartu, tombol, keyboard, grid).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 040 <no> "teks"`)_
