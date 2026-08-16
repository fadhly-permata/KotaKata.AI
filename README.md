# 📖 KotaKata.AI

**Teka-Teki Silang Puitis — Dynamic Crossword Game (Cross-Platform)**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-8A2BE2.svg)]()
[![Expo](https://img.shields.io/badge/Expo-React%20Native-000000.svg)](https://expo.dev/)

KotaKata.AI adalah game Teka-Teki Silang (TTS) modern dengan sistem peringkat puitis 10 tier. Papan permainan digenerate secara prosedural dari kosakata Bahasa Indonesia yang telah dikurasi, dan setiap permainan selalu berbeda. Satu basis kode untuk Android, iOS, Windows, Linux, dan Web.

## 🎮 Panduan Pemain

**📖 [GUIDE.md](GUIDE.md)** — panduan lengkap cara main: kontrol, sistem clue & hint, XP & tier, Mode AI, akun & data, FAQ, dan tips strategi.

## ✨ Fitur

| Fitur | Deskripsi |
| --- | --- |
| 🎮 **Papan Prosedural** | Setiap board digenerate client-side dari kosakata terkurasi; grid fleksibel dengan minimal 10 soal per papan |
| 📴 **Offline-First** | Progress board + log tersimpan lokal (AsyncStorage + sql.js), sinkron ke cloud saat online |
| ☁️ **Cloud Sync** | Supabase Auth + PostgreSQL + RLS; riwayat kata, XP, dan board tersimpan per user |
| 🏆 **10 Tier Puitis** | Dari *Eja Awal* hingga *Keabadian Seloka* — progres XP naik lewat menyelesaikan kata |
| 🔐 **Login Google Wajib** | Game hanya bisa dimainkan oleh user yang login Google (mode tamu dihapus) — progres tersinkronisasi cloud antar perangkat |
| ✨ **Kata Ajaib** | Popup kata acak + clue (otomatis mengecualikan clue sinonim/antonim) |
| 🔍 **Kata Ditemukan** | Riwayat kata yang pernah ditemukan, lazy-load per 25 data |
| 🕹️ **Sejarah Permainan** | Daftar papan yang sudah diselesaikan + viewer papan read-only bergaya crossword |
| 🌗 **Tema Terang/Gelap** | Transisi halus, konsisten di semua layar |
| 🎨 **Multi-Tema** | **Keseragaman tema**: 10 tema aplikasi (Puitis/Samudra/Senja/Hutan/Neumorfik/Glassmorphism/Claymorphism/Neo-Brutalism/Minimalist/Frost) — masing-masing punya versi **papan & keyboard dengan nama sama** (PLAN-033: papan/keyboard selalu ikut tema aplikasi) — semua light & dark, pilihan tersimpan permanen; tiap tema punya **latar gradien** (+ gambar latar di Samudra/Senja), **tema suara** (SoundSpec — Klasik/Tenang/Hangat/Segar/Lembut/Jernih/Tegas/Hening/Dingin), dan **backsound ambient** (URL MP3 online, loop crossfade), plus **gaya skin khas** (neumorfik/glass/frost = bayangan timbul-soft & permukaan transparan; clay = radius besar + highlight; brutalist = border tebal + bayangan keras; minimal = flat) |
| 🛍️ **Pasar (Store)** | Halaman katalog tema dengan 3 seksi (Aplikasi/Papan/Keyboard) + tombol **Preview** tiap tema (mockup sesuai jenis tema, toggle terang/gelap) sebelum diaktifkan; katalog tersimpan di database Supabase (tabel `themes`) dengan fallback offline — siap dikembangkan jadi tema berbayar |
| ⌨️ **Keyboard & Touch** | Mobile touch + desktop arrow keys, keyboard virtual in-game |
| ✨ **Animasi** | Orb ambien di **semua halaman** (`AmbientOrbs` — 24 orb acak, warna palet tema) + parallax & orb floating khusus di main menu & login, transisi halaman & popup beranimasi; dialog konfirmasi ber-ikon dengan tata letak responsif (vertikal di HP, horizontal di layar lebar) |

## 🏆 Sistem Peringkat

| Tier | Nama | Tier | Nama |
| :--- | :--- | :--- | :--- |
| 1 | **Eja Awal** | 6 | **Raut Metafora** |
| 2 | **Desau Saujana** | 7 | **Bait Hening** |
| 3 | **Rima Gerimis** | 8 | **Madah Sanubari** |
| 4 | **Untai Aksara** | 9 | **Risalah Langit** |
| 5 | **Gema Diksi** | 10 | **Keabadian Seloka** |

## 🎮 Cara Main

1. **Mulai Bermain** — papan TTS digenerate prosedural dari ±10.000 kosakata terkurasi (1000 kata × 10 tier, 3 clue per kata). Setiap permainan selalu berbeda.
2. **Isi sel** — ketuk sel untuk memilih kata, ketuk lagi untuk ganti arah (mendatar/menurun). Ketik huruf via keyboard virtual (mobile) atau keyboard fisik (desktop/web: huruf + panah ⬅➡⬆⬇, ⏎ ganti arah, ⌫ hapus).
3. **Selesaikan kata** — kata yang terisi penuh divalidasi otomatis: benar → terkunci + bunyi kemenangan + XP; salah → dengung peringatan, boleh dikoreksi.
4. **Naikkan tier** — setiap kata benar memberi XP (`25 + (panjang kata − 3) × 5`, dikali pengali tier 1×–5×). Saat XP cukup, tier naik (notifikasi + overlay perayaan); tingkat kesulitan soal ikut menyesuaikan.

### 💡 Sistem Clue & Hint

Setiap kata punya 3 clue yang selalu berbeda dan tidak pernah memuat jawaban:

| Hint | Efek | Biaya XP |
| :--- | :--- | :--- |
| **Clue 1** | Tampil default di panel soal | Gratis |
| **Clue 2** | Petunjuk tambahan lebih jelas | −50 XP |
| **Clue 3** | Petunjuk terjelas (sinonim/deskriptif) | −100 XP |
| **Reveal Letter** | Membuka 1 huruf acak (sel terkunci) | −75 XP |

> Clue 2/3/Reveal memerlukan konfirmasi sebelum dipakai. Kata serapan asing & kata daerah diberi penanda asal bahasa (mis. "Kata serapan dari bahasa Belanda") di clue pertama.

### 🏆 Fitur Pendukung

- **Daftar Tier** — tombol di halaman utama: 10 tier dengan highlight tier kamu saat ini.
- **Leaderboard** — lihat posisimu antar pemain (urut total XP, lalu waktu kenaikan); 3 teratas dapat medali.
- **Kata Ditemukan** — riwayat kata yang pernah kamu selesaikan (lazy-load per 25).
- **Sejarah Permainan** — daftar papan selesai + viewer read-only (sel hitam, nomor clue, grup Mendatar/Menurun).
- **Kata Ajaib** — popup kata acak + clue dari seluruh tier (clue Antonim/Sinonim dikecualikan).
- **Auto-save** — progres board tersimpan otomatis (500 ms setelah perubahan + saat menutup/refresh); board belum selesai bisa dilanjutkan dari "Mulai Bermain".
- **Login Google** — game hanya bisa dimainkan oleh user yang login Google (mode tamu dihapus sejak PLAN-030); progres (XP, tier, riwayat) tersinkronisasi cloud antar perangkat.

## 🤖 Mode AI (Main Mode AI)

Main dengan soal yang dibuat AI dari provider pilihanmu (**Bring Your Own Key**):

1. **Atur provider** — Pengaturan → "Tambahkan Provider AI". Pilih preset **OpenRouter**, **HuggingFace**, atau **URL kustom**, isi API key + nama model, lalu **Tes Koneksi** dan **Simpan**.
2. **Main** — tombol "Main Mode AI" meminta soal ke provider, divalidasi ketat (kata 3–10 huruf, clue tidak memuat jawaban, tanpa duplikat), lalu digenerate menjadi papan seperti biasa. Tingkat kesulitan soal menyesuaikan tier kamu.
3. **Tanpa XP** — Mode AI tidak menghitung XP sama sekali: tidak menambah XP saat selesai kata, dan tidak mengurangi XP saat memakai clue/reveal (semua gratis). Ada badge "Mode AI" + info di layar selesai.
4. **Perkaya database** — kata AI yang belum ada di database otomatis disimpan (deduplikasi) supaya bank kosakata terus bertambah.
5. **Gagal?** — kalau provider error / respons tidak valid, muncul dialog ramah dengan opsi **Coba Lagi** atau **Main Mode Normal** (mode biasa tidak terpengaruh).

> 🔑 **Privasi** — API key milikmu (BYOK) disimpan di perangkat dan di-sync ke profil akunmu (RLS, hanya kamu yang bisa membaca) supaya akun yang sama di perangkat lain tetap bisa Main Mode AI tanpa set ulang. Key tidak pernah dikirim ke pihak lain.

## 🛠 Tech Stack

- **Framework:** React Native + Expo (TypeScript)
- **Backend & Auth:** Supabase (PostgreSQL + RLS + Auth)
- **State Management:** Zustand
- **Navigation:** React Navigation (native-stack)
- **Local Storage:** AsyncStorage (progress, session, preferensi) + sql.js (log lokal)
- **Web:** react-native-web (satu kode untuk mobile & web)

## 📁 Project Structure

```
src/
├── features/        # Layar per fitur (game, history, auth, profile, settings)
├── data/            # Data layer (repositories, models, sources)
│   ├── sources/     # Supabase client
│   ├── repositories/# Repository (user, board, vocabulary, wordDiscovery)
│   ├── vocabulary/  # Seed kosakata terkurasi per tier (1–10)
│   └── models/      # Schemas & types
├── domain/          # Business logic
│   ├── entities/    # Domain types (Board, BoardCell, dst.)
│   └── usecases/    # Generator crossword, validator, XP engine, filter word pool
├── presentation/    # UI layer
│   ├── components/  # Komponen reusable (common/, icons/, game/, providers/)
│   ├── stores/      # Zustand stores (gameStore, themeSelectionStore)
│   ├── themes/      # Registry tema (themeData.ts) — aplikasi, papan, keyboard
│   └── navigation/  # React Navigation setup
└── utils/           # Helper (log DB, device identity, board progress, dsb.)

scripts/             # Tooling pengembangan, dikelompokkan per peruntukan
├── db/              # Operasi database (migrasi, push, query Supabase)
├── vocab/           # Bangun & perbaiki kosakata (seed KBBI, generate SQL, fix clue)
├── check/           # Verifikasi & uji kualitas (check-*, verify-*)
├── kbbi/            # Diagnostik & analisis data KBBI
└── assets/          # Generator aset (efek suara)

supabase/
├── migrations/      # SQL migrasi (tabel, RLS, fungsi)
└── data/            # Data besar (vocabulary.sql)

assets/
├── images/          # Ikon, splash, favicon
└── sfx/             # Efek suara
```

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Start development (web)
bunx expo start --web

# Type check
bun tsc --noEmit

# Lint
bun lint
```

## 🔑 Environment Variables

Buat `.env.local` (atau isi lewat tab Keys/API keys di platform):

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |
| `EXPO_TOKEN` | Token akses EAS — dipakai `eas build` untuk build APK/AAB (lihat [Build & Deploy](#-build--deploy)) |
| `SUPABASE_ACCESS_TOKEN` | Token akses Supabase (Management API) — dipakai script DB (`scripts/db/*.mjs`) |

## 🗄 Database (Supabase)

Migrasi SQL ada di folder `supabase/migrations/` (tabel, RLS, fungsi); data besar di `supabase/data/`. Jalankan via script:

```bash
bun scripts/db/apply-supabase-migrations.mjs
bun scripts/db/supabase-run.mjs "SELECT ..."   # jalankan query ad-hoc
node scripts/db/supabase-auth-config.mjs      # lihat konfigurasi Auth (site_url, redirect allow-list)
node scripts/db/supabase-auth-config.mjs '{...}'  # perbarui sebagian (PATCH) — mis. tambah domain ke uri_allow_list
```

Kosakata di-push dari seed lokal (`src/data/vocabulary/`) ke tabel `vocabulary`:

```bash
bun scripts/vocab/gen-vocab-sql.mjs   # generate SQL dari seed
bun scripts/db/push-vocab.mjs          # push kosakata ke Supabase
```

Katalog tema (tabel `themes`) di-generate dari registry lokal lalu di-push:

```bash
bun scripts/db/gen-themes-sql.mjs     # generate supabase/data/themes.sql dari themeData.ts
node scripts/db/push-themes.mjs       # regenerate + push katalog tema ke Supabase
```

Build & deploy:

```bash
bun run build:eas                     # build APK/AAB via expo.dev (EAS)
bun run deploy:web                    # export web + deploy ke EAS Hosting (expo.dev)
```

## 📝 Revisi & Planning

**📄 [Release Notes lengkap](RELEASE_NOTES.md)** — ringkasan progres semua plan
(PLAN-001 s/d PLAN-041 — semuanya ✅ done) + detail tiap rilis.

Daftar revisi produk dikelola di `.agents/plans/` (contoh: `PLAN-001-revisi-halaman-utama.md`)
dengan CLI plan:

```bash
bun .agents/plans/plan.mjs list    # lihat item & status
bun .agents/plans/plan.mjs start 001
bun .agents/plans/plan.mjs check 001 <nomor>
bun .agents/plans/plan.mjs note 001 <nomor> "catatan"
bun .agents/plans/plan.mjs help    # semua perintah
```

## 📦 Build & Deploy

```bash
# Build web untuk produksi (output: dist/)
bunx expo export --platform web

# Build APK Android via EAS (butuh EXPO_TOKEN di .env.local / tab Keys)
# ⚠️ Sesuai aturan repo: build/push ke EAS hanya boleh saat diminta eksplisit
# pemilik repo — tanpa izin, jangan jalankan perintah ini.
#
# Ada script siap pakai (baca EXPO_TOKEN dari env / .env.local / .env):
bun run build:eas                    # android + preview (APK)
node scripts/expo-build.mjs ios      # iOS + preview
node scripts/expo-build.mjs all production   # semua platform + production (AAB)
node scripts/expo-build.mjs --list   # lihat daftar build terakhir di expo.dev
# (lihat cara pakai lengkap: node scripts/expo-build.mjs --help)
```

## 🗺️ Development Status

Progress pembangunan project dilacak di `.agents/checkpoint.json`.

**Status plan revisi** (detail di [RELEASE_NOTES.md](RELEASE_NOTES.md)):

| Plan | Status | Isi |
| :--- | :--- | :--- |
| PLAN-001 | ✅ done | Revisi halaman utama & navigasi (22 langkah) |
| PLAN-002 | ✅ done | Main Mode AI — soal dari provider (BYOK) |
| PLAN-003 | ✅ done | Kualitas clue tier 1–10: 0 issue / 0 bocor / 0 duplikat |
| PLAN-004 | ✅ done | Keluar akun ke Profil + hapus akun permanen |
| PLAN-005 | ✅ done | Mode AI tanpa XP, log paging, leaderboard, notifikasi tier, tag asal bahasa |
| PLAN-006 | ✅ done | Log cloud, kirim log, detail debug, leaderboard lazy & dialog close |
| PLAN-007 | ✅ done | Review semua clue via script riset KBBI (placeholder 2472→0) |
| PLAN-008 | ✅ done | Sejarah Permainan lazy-load (paging saat scroll) |
| PLAN-009 | ✅ done | Responsif UI + orb login + dialog seragam + konfeti + dialog tier |
| PLAN-010 | ✅ done | Konfeti layar penuh + ESC tutup popup + panel profil |
| PLAN-011 | ✅ done | Bersihkan singkatan kuno (pd/dl/krn) di semua clue tier |
| PLAN-012 | ✅ done | Reveal XP fair (tanpa potong XP bila tidak ada huruf berubah) + animasi zoom-out + progress ring & toggle tema di header in-game |
| PLAN-013 | ✅ done | Semua halaman tidak lagi fullscreen (safe-area) + refactor kode (gameStore helpers, GameScreen → GameTopBar/CluePill/GameActionBar, FloatingOrbs) + tombol & halaman Pasar (Store) dengan 1 tema default |
| PLAN-014 | ✅ done | Multi-tema: 4 tema aplikasi + 3 tema papan + 3 tema keyboard (semua light/dark, bisa switch) — katalog tersimpan di database (tabel `themes`, RLS read publik) dengan fallback offline; halaman Pasar 3 seksi |
| PLAN-015 | ✅ done | Tombol Preview di tiap kartu tema Pasar — modal mockup sesuai jenis tema (aplikasi/papan/keyboard) dengan toggle terang/gelap sebelum aktivasi |
| PLAN-016 | ✅ done | Aturan GitHub Release (tidak dibuat dari workspace — identitas app bukan pemilik), script build EAS `scripts/expo-build.mjs` + npm `build:eas`, fix clue auto-height di HP (flexShrink 0 agar pill tidak pernah terdesak) |
| PLAN-017 | ✅ done | Background image & gradien: `BackgroundSpec` (gradien + URL gambar + overlay) di semua tema, komponen `ThemedBackground` (react-native-svg), ScreenFade merender latar tema aplikasi di semua halaman, halaman game pakai latar tema papan, keyboard pakai latar tema keyboard, preview Pasar merender gradien |
| PLAN-018 | ✅ done | Keseragaman tema (tiap tema app punya papan & keyboard senama), tema gambar latar (Samudra & Senja pakai foto), tema suara (rate+volume per tema, tanpa aset baru), orb ambien di semua halaman (`AmbientOrbs` reusable), dialog konfirmasi ber-ikon & responsif, deploy web ke EAS Hosting (`deploy:web`) |
| PLAN-019 | ✅ done | Backsound suara latar per tema (URL MP3 online terverifikasi): Puitis → rintik hujan, Samudra → ombak laut, Senja → jangkrik malam, Hutan → hujan di hutan — loop pelan (expo-audio native / HTMLAudioElement web), ikut mati saat suara dimatikan, kartu Pasar menampilkan chip "🎵 Backsound: <nama>" |
| PLAN-020 | ✅ done | Switch on/off backsound di Pengaturan — preferensi terpisah `kotakata.ambientEnabled` (default nyala); backsound hanya diputar kalau efek suara & backsound sama-sama nyala; baris "Backsound Tema" + Switch di bawah "Efek Suara" (seksi "Tampilan & Suara") |
| PLAN-021 | ✅ done | Backsound langsung aktif saat app start — fix race preferensi (`whenSoundPrefsReady`: backsound pertama menunggu preferensi terbaca supaya tidak sempat berbunyi saat setting mati) + hint web "🔊 Ketuk layar untuk memutar suara latar" saat autoplay diblokir browser (`AmbientSoundHint` di semua halaman via ScreenFade) |
| PLAN-022 | ✅ done | Hapus login email di halaman Login — form email, link "Atau masuk dengan email", `signInWithEmail`/`signUpWithEmail`/`linkEmail` dihapus; login hanya Google + Guest; dokumen (README/GUIDE/TERMS/PRIVACY) disinkronkan |
| PLAN-023 | ✅ done | Force close random Android 12–15 — dikerjakan batch 2026-08-16: mitigasi (animasi orb/bounce hanya saat layar fokus); verifikasi device disarankan |
| PLAN-024 | ✅ done | Force close scroll Main Menu Android 9 — dikerjakan batch 2026-08-16: mitigasi (animasi orb/bounce hanya saat layar fokus); verifikasi device disarankan |
| PLAN-025 | ✅ done | ThemedBackground tanpa react-native-svg — gradien jadi lapisan `View` berwarna bertumpuk (10 band interpolasi hex; vertical/horizontal/diagonal via rotate+scale); fallback warna solid, gambar latar & overlay tetap; `react-native-svg` masih dipakai ProgressRing & ikon (keputusan terpisah) |
| PLAN-026 | ✅ done | Kurasi ulang soal SEMUA tier (1–10, 1000 kata/tier): tier 1 kata konkret mudah, tier 2 buang kata tugas abstrak, bentrok antar tier di-resolve, clue absurd dibuang, SQL 10.000 kata di-push ke Supabase + script verifikasi |
| PLAN-027 | ✅ done | Mitigasi force close saat scroll main menu (dugaan resolusi tinggi): orb & bounce loop hanya beranimasi saat layar fokus — tidak menumpuk native-driver loop antar halaman; verifikasi device disarankan |
| PLAN-028 | ✅ done | Suara efek hilang di beberapa tema + autoplay backsound web saat masuk game (`ensureAmbientPlaying`) + retry gestur lebih agresif + efek web tidak hilang saat init belum selesai; URL backsound diverifikasi hidup |
| PLAN-029 | ✅ done | Looping suara latar mulus — crossfade dua slot (fade 2 dtk, maks 20% durasi); perulangan tidak terasa putus |
| PLAN-030 | ✅ done | Hapus login tamu — game hanya untuk user login Google; session anonim dikeluarkan otomatis (termasuk dari build lama); "Hubungkan Akun" dihapus; dokumen disinkronkan |
| PLAN-031 | ✅ done | Title HTML web "KotaKata AI - <Halaman>" (mis. "KotaKata AI - Beranda") — `public/index.html` + title per rute |
| PLAN-032 | ✅ done | Sejarah permainan & kata ditemukan jadi card masonry ukuran acak (tinggi/lebar acak tapi stabil, 2 kolom + sesekali card lebar penuh) — lazy load tetap |
| PLAN-033 | ✅ done | Tema papan & keyboard dihapus dari pasar — papan & keyboard selalu mengikuti tema aplikasi yang aktif |
| PLAN-034 | ✅ done | Toolbar In-Game responsif — tidak kebesaran/offset di Android lama (Infinix Hot 8); radius panel, header, & skala teks disesuaikan |
| PLAN-035 | ✅ done | Panel hint in-game ringkas — pager swipe kanan-kiri 3 halaman + panah ◀ ▶ (seperti CluePill) + indikator titik; panel setinggi satu baris |
| PLAN-036 | ✅ done | Tema Neumorfik (neumorphism) di Pasar — soft-UI abu lembut + biru baja, light/dark, papan & keyboard senada, backsound "Kicau burung pagi" + sound efek "Lembut" |
| PLAN-037 | ✅ done | Neumorfik dirombak gaya neumorphism.io — surface = warna latar + bayangan timbul (terang kiri-atas, gelap kanan-bawah) di kartu Pasar/header/panel hint/keyboard/kartu riwayat; aksen biru |
| PLAN-038 | ✅ done | Sistem skin menyeluruh (Winamp-like) — efek tema (warna/radius/bayangan) merata ke semua komponen semua halaman; token skin generik (overlay/chip/input/textOnPrimary) + helper skin.ts (surfaceStyle/contrastText dll); login & main menu ikut tema; fondasi agar tema baru cukup definisikan token |
| PLAN-039 | ✅ done | Semua tombol dapat efek neumorphism yang sama saat tema Neumorfik aktif — warna tombol dipertahankan; helper buttonShadow(theme) disapu ke semua tombol semua halaman, TooltipButton jadi titik pusat otomatis |
| PLAN-040 | ✅ done | 5 tema baru di Pasar: Glassmorphism (kaca transparan + gradien hidup), Claymorphism (pastel hangat radius besar), Neo-Brutalism (border tebal + bayangan keras), Minimalist UI (flat polos), Frost UI (kaca lembut es biru) — masing-masing light/dark + papan & keyboard senama + sound & backsound khas; themes.sql (34 tema) di-push ke Supabase |
| PLAN-041 | ✅ done | Kosakata bersih & aman anak — 52 kata vulgar/tidak layak (makian, alat kelamin, tindakan seksual, narkoba) diganti kata kurasi (1000/tier tetap), 8 clue memuat kata vulgar ditulis ulang; scanner permanen vulgar-words.mjs + QA DB check-vulgar-db.mjs (0 vulgar di DB, tetap 1000 soal/tier) |

## ❓ FAQ

**Akun & Data**

- **Kenapa harus login Google?** Sejak PLAN-030 game hanya bisa dimainkan oleh user yang login Google (mode tamu dihapus) — progres (XP, tier, riwayat kata, board) tersimpan di akun dan bisa dilanjutkan dari perangkat mana pun.
- **Bagaimana cara keluar akun?** Profil → **Keluar Akun** (kembali ke halaman login).
- **Bagaimana cara menghapus akun?** Profil → **Hapus Akun (Permanen)** — konfirmasi 2 level: peringatan, lalu ketik **kode acak 10 huruf** (case-insensitive). Menghapus seluruh data cloud + lokal secara permanen.
- **Apakah progres tersimpan otomatis?** Ya. Board disimpan 500 ms setelah perubahan + saat menutup/refresh tab. Board yang belum selesai bisa dilanjutkan dari "Mulai Bermain".

**XP & Tier**

- **Bisakah total XP berkurang karena hint?** Ya, jika penaltinya nyata. Clue 2/3, reveal huruf, dan reveal kata memotong XP secara permanen dari total akun (neto sesi papan — XP kata dikurangi penalti — dihitung saat papan selesai dan di-clamp agar tidak negatif). Pakai hint berlebihan bisa menurunkan tier; gunakan bijak.
- **Kata yang semua hurufnya di-reveal dapat XP?** Tidak — full-reveal dianggap selesai (papan tidak macet) tapi tidak memberi XP.
- **Kenapa soal di papan baru terasa lebih sulit?** Kamu mungkin baru naik tier. Papan mengambil kosakata sesuai tier aktif (1000 kata per tier, 10 tier).
- **Kenapa ada clue berawalan "Kata serapan dari bahasa …"?** Itu penanda asal bahasa (serapan asing / bahasa daerah Nusantara) yang terverifikasi dari KBBI.

**Mode AI**

- **Kenapa Mode AI tidak memberi XP?** Keputusan desain: mode ini soal tak terbatas dari AI, jadi tidak menghitung XP sama sekali (tidak tambah, tidak kurangi — semua hint gratis) agar tidak disalahgunakan untuk mencuci XP. Naik tier hanya dari Mode Normal.
- **Apakah API key aman?** Ya — BYOK: key disimpan di perangkat + di-sync ke profil akunmu (RLS, hanya kamu yang bisa membaca) supaya bisa dipakai lintas device. Tidak pernah dikirim ke pihak lain.
- **Apakah soal AI tersimpan?** Kata AI yang belum ada di database otomatis disimpan (deduplikasi) untuk memperkaya bank kosakata KotaKata.
- **Provider gagal / error?** Muncul dialog ramah dengan opsi **Coba Lagi** atau **Main Mode Normal** — mode normal tidak terpengaruh.

> FAQ lengkap + tips strategi ada di **[GUIDE.md](GUIDE.md)**.

## 📄 Lisensi

MIT — built with ❤️ by Fadhly Permata — lihat [LICENSE](LICENSE).
