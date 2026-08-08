# 📖 KotaKata.AI

**Teka-Teki Silang Puitis — Dynamic Crossword Game (Cross-Platform)**

KotaKata.AI adalah game Teka-Teki Silang (TTS) modern dengan sistem peringkat puitis 10 tier. Papan permainan digenerate secara prosedural dari kosakata Bahasa Indonesia yang telah dikurasi, dan setiap permainan selalu berbeda. Satu basis kode untuk Android, iOS, Windows, Linux, dan Web.

## ✨ Fitur

| Fitur | Deskripsi |
| --- | --- |
| 🎮 **Papan Prosedural** | Setiap board digenerate client-side dari kosakata terkurasi; grid fleksibel dengan minimal 10 soal per papan |
| 📴 **Offline-First** | Progress board + log tersimpan lokal (AsyncStorage + sql.js), sinkron ke cloud saat online |
| ☁️ **Cloud Sync** | Supabase Auth + PostgreSQL + RLS; riwayat kata, XP, dan board tersimpan per user |
| 🏆 **10 Tier Puitis** | Dari *Eja Awal* hingga *Keabadian Seloka* — progres XP naik lewat menyelesaikan kata |
| 👤 **Identitas Guest** | Guest anonim memakai UUID perangkat sebagai jangkar identitas (tanpa permission MAC/IMEI) |
| ✨ **Kata Ajaib** | Popup kata acak + clue (otomatis mengecualikan clue sinonim/antonim) |
| 🔍 **Kata Ditemukan** | Riwayat kata yang pernah ditemukan, lazy-load per 25 data |
| 🕹️ **Sejarah Permainan** | Daftar papan yang sudah diselesaikan + viewer papan read-only bergaya crossword |
| 🌗 **Tema Terang/Gelap** | Transisi halus, konsisten di semua layar |
| ⌨️ **Keyboard & Touch** | Mobile touch + desktop arrow keys, keyboard virtual in-game |
| ✨ **Animasi** | Parallax + orb floating di main menu, transisi halaman & popup beranimasi |

## 🏆 Sistem Peringkat

| Tier | Nama | Tier | Nama |
| :--- | :--- | :--- | :--- |
| 1 | **Eja Awal** | 6 | **Raut Metafora** |
| 2 | **Desau Saujana** | 7 | **Bait Hening** |
| 3 | **Rima Gerimis** | 8 | **Madah Sanubari** |
| 4 | **Untai Aksara** | 9 | **Risalah Langit** |
| 5 | **Gema Diksi** | 10 | **Keabadian Seloka** |

## 🛠 Tech Stack

- **Framework:** React Native + Expo (TypeScript)
- **Backend & Auth:** Supabase (PostgreSQL + RLS + Auth)
- **State Management:** Zustand
- **Navigation:** React Navigation (native-stack)
- **Local Storage:** AsyncStorage (progress, session, identitas guest) + sql.js (log lokal)
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
│   ├── components/  # Komponen reusable (grid, keyboard, popup, dsb.)
│   ├── stores/      # Zustand stores (gameStore)
│   └── navigation/  # React Navigation setup
└── utils/           # Helper (log DB, device identity, board progress, dsb.)
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

Buat `.env.local` (atau isi lewat tab Keys di Freebuff):

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |

## 🗄 Database (Supabase)

Migrasi SQL ada di folder `supabase/` (tabel, RLS, fungsi). Jalankan via script:

```bash
bun scripts/apply-supabase-migrations.mjs
bun scripts/supabase-run.mjs "SELECT ..."   # jalankan query ad-hoc
```

Kosakata di-push dari seed lokal (`src/data/vocabulary/`) ke tabel `vocabulary`:

```bash
bun scripts/gen-vocab-sql.mjs   # generate SQL dari seed
bun scripts/push-vocab.mjs      # push kosakata ke Supabase
```

## 📝 Revisi & Planning

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
# Build untuk produksi (output: dist/)
bunx expo export --platform web
```

## 🗺️ Development Status

Progress pembangunan project dilacak di `.agents/checkpoint.json`.

## 📄 Lisensi

MIT — built with ❤️ by Fadhly Permata
