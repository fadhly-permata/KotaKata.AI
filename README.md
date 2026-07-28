# 📖 KotaKata.AI

**Teka-Teki Silang Puitis — Cross-Platform Dynamic Crossword Game**

KotaKata.AI adalah game Teka-Teki Silang (TTS) modern multiplatform (Android, iOS, Windows, Linux, Web) dengan sistem peringkat puitis 10 tier menggunakan satu basis kode.

## ✨ Fitur

| Fitur | Status |
| --- | --- |
| 🎮 **Papan Prosedural** — setiap board beda, digenerate client-side | ✅ |
| 📴 **Offline-First** — RxDB local storage | ✅ |
| ☁️ **Cloud Sync** — Supabase Auth + PostgreSQL + RLS | ✅ |
| 🏆 **10 Tier Puitis** — Eja Awal → Keabadian Seloka | ✅ |
| 📖 **Sejarah Saya** — riwayat kata + pencarian | ✅ |
| 🌗 **Tema Terang/Gelap** — transisi halus 300ms | ✅ |
| ⌨️ **Keyboard & Touch** — mobile + desktop arrow keys | ✅ |

## 🏆 Sistem Peringkat

| Tier | Nama | Filosofi |
| :--- | :--- | :--- |
| 1 | **Eja Awal** | Langkah paling mula mengeja |
| 2 | **Desau Saujana** | Kata mulai terdengar di kejauhan |
| 3 | **Rima Gerimis** | Ketukan hurup beraturan |
| ... | ... | ... |
| 10 | **Keabadian Seloka** | Puncak tertinggi kebahasaan |

## 🛠 Tech Stack

- **Framework:** React Native (TypeScript) with Expo
- **Backend & Auth:** Supabase (PostgreSQL + RLS + Auth)
- **Local Storage:** RxDB (in-memory storage)
- **State Management:** Zustand
- **Navigation:** React Navigation (native-stack)
- **Styling:** React Native StyleSheet

## 📁 Project Structure

```
src/
├── features/        # Feature modules (game, history, auth, profile, settings)
├── data/            # Data layer (repositories, sources, models)
│   ├── sources/     # Database, Supabase, sync engine
│   ├── repositories/ # Repository classes
│   └── models/      # Schemas & types
├── domain/          # Business logic
│   ├── entities/    # Domain types (Board, BoardCell, etc.)
│   └── usecases/    # Business rules (generator, validator, XP engine)
└── presentation/    # UI layer
    ├── components/  # Reusable components
    ├── stores/      # Zustand stores
    └── navigation/  # React Navigation setup
```

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Start development
bunx expo start --web

# Type check
npx tsc --noEmit
```

## 🔑 Environment Variables

Gunakan **Keys** tab di Freebuff atau buat `.env.local`:

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |

## 📦 Build & Deploy

```bash
# Build for production
bunx expo build:web

# Output: dist/
```

## 🗺️ Development Status

**Progress: 13/19 fase completed** — lihat `.agents/checkpoint.json` untuk detail.

## 📄 Lisensi

MIT — built with ❤️ by Fadhly Permata
