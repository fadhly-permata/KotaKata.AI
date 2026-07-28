# KotaKata.AI — Development Plan (6 Fase)

> **Referensi:** `.agents/documentation/PRD.md`
> **Checkpoint:** `.agents/checkpoint.json`

---

## Fase 1: Project Scaffolding & Foundation

### Tujuan
Membangun fondasi proyek Expo + TypeScript dengan struktur Clean Architecture & Feature-First, tooling, dan navigation skeleton.

### Task List

- [ ] **1.1** Inisialisasi Expo project dengan TypeScript (`npx create-expo-app`)
- [ ] **1.2** Konfigurasi TypeScript Strict Mode (`"strict": true`, no `any`)
- [ ] **1.3** Setup ESLint + Prettier (2-space indent, max 120 chars)
- [ ] **1.4** Buat struktur folder Feature-First + Clean Architecture:
  ```
  src/
  ├── features/{game,history,auth,profile,settings}/
  ├── data/{sources,repositories,models}/
  ├── domain/{usecases,entities,interfaces}/
  ├── presentation/{components,hooks,stores,navigation}/
  ├── utils/
  └── app/
  ```
- [ ] **1.5** Setup React Navigation (native-stack dengan `slide_from_right`)
- [ ] **1.6** Setup Zustand store foundation
- [ ] **1.7** Buat ThemeProvider (Light/Dark mode + `useColorScheme` fallback)
- [ ] **1.8** Buat Error Boundary di root level
- [ ] **1.9** Setup react-native-logs untuk centralized logging
- [ ] **1.10** Buat screen skeleton: MainMenu, Game, History, Profile, Settings

### Dependencies
- Expo SDK
- TypeScript
- React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`)
- Zustand
- React Native Reanimated v3
- react-native-logs

### Output
- Proyek bisa di-run di Expo Go / development build
- Navigasi antar screen lancar
- Theme switching berfungsi (light/dark)
- Struktur folder siap untuk fase berikutnya

---

## Fase 2: Supabase Backend & Offline-First Database

### Tujuan
Setup Supabase (Auth + PostgreSQL) dan WatermelonDB/RxDB untuk sinkronisasi data offline-first.

### Task List

- [ ] **2.1** Buat Supabase project & konfigurasi client (`@supabase/supabase-js`)
- [ ] **2.2** Migration SQL: tabel `public.users`
  - Kolom: user_id, display_name, email, total_xp, current_tier, coins, updated_at
  - RLS: user hanya bisa akses data sendiri
- [ ] **2.3** Migration SQL: tabel `public.vocabulary_collection`
  - Kolom: word_id, word, clue_1, clue_2, clue_3, tier_level, created_at
  - RLS: read-only untuk authenticated users
- [ ] **2.4** Migration SQL: tabel `public.word_discoveries`
  - Kolom: discovery_id, user_id, word_id, word, clue_1, clue_2, clue_3, discovered_at
  - Unique constraint: (user_id, word_id)
  - RLS: user hanya bisa akses data sendiri
- [ ] **2.5** Migration SQL: tabel `public.saved_boards`
  - Kolom: board_id, user_id, tier_at_generation, grid_size, layout_data (JSONB), is_finished, updated_at
  - RLS: user hanya bisa akses board sendiri
- [ ] **2.6** Setup Supabase Auth:
  - Anonymous Sign-In
  - Google OAuth
  - Email/Password
- [ ] **2.7** Implementasi identity linking (anon → permanent)
- [ ] **2.8** Setup WatermelonDB / RxDB:
  - Model definitions sesuai skema database
  - Local database initialization
- [ ] **2.9** Buat Sync Engine:
  - Batch upsert ke Supabase saat online
  - Schedule sync setiap 5 menit (jika ada perubahan)
  - Sync on board completion
- [ ] **2.10** Buat repositories (abstraction layer):
  - `UserRepository`
  - `VocabularyRepository`
  - `WordDiscoveryRepository`
  - `BoardRepository`

### Dependencies
- `@supabase/supabase-js`
- WatermelonDB atau RxDB
- Supabase project credentials (anon key, project URL)

### Output
- User bisa login anonymous atau via Google/Email
- Data tersimpan di local DB dan tersinkronisasi ke cloud
- RLS bekerja dengan benar

---

## Fase 3: Vocabulary System & Procedural Board Generator

### Tujuan
Membangun bank kosakata bahasa Indonesia dan algoritma procedural crossword board generation.

### Task List

- [ ] **3.1** Desain & implementasi tipe/entitas board:
  - `BoardCell` (row, col, letter, isBlocked, isLocked, wordIndex, orientation)
  - `BoardWord` (word, clue_1/2/3, orientation, startRow, startCol)
  - `Board` (grid[][], words[], size, tierLevel)
- [ ] **3.2** Buat vocabulary seed data (min 50 kata per tier = 500 kata):
  - Level 1: Kata dasar 3-4 huruf (contoh: "API", "AIR", "BUKU")
  - Level 2: Kata 4-5 huruf
  - Level 3-4: Kata 5-6 huruf
  - Level 5-6: Kata 6-8 huruf, diksi menengah
  - Level 7-8: Kata 8-10 huruf, diksi kompleks
  - Level 9-10: Kata 10+ huruf, diksi puitis/sastra
  - Setiap kata wajib punya clue_1, clue_2, clue_3
- [ ] **3.3** Implementasi word pool filter:
  - Filter by `tier_level` pemain
  - Exclusion filter: buang kata dari `word_discoveries`
  - Fallback: ambil kata dari tier_level -1 jika pool tidak cukup
- [ ] **3.4** Implementasi Crossword Board Generator (backtracking / greedy):
  - Input: list of words, grid size (10×10 atau 12×12)
  - Algoritma: place words secara acak, backtrack jika buntu
  - Validasi: minimal persilangan, tidak ada kata terisolasi
  - Output: Board dengan grid, posisi kata, dan orientasi
- [ ] **3.5** Implementasi board validation:
  - Cek overlapping cells cocok hurufnya
  - Cek tidak ada kata asing yang terbentuk
  - Cek semua kata terhubung
- [ ] **3.6** Integrasi generator dengan responsive grid rendering (Skia):
  - Grid component dengan `react-native-skia`
  - Dynamic cell size berdasarkan `useWindowDimensions`
  - Highlight selected word
  - Tampilkan orientation indicator

### Dependencies
- React Native Skia (`@shopify/react-native-skia`)
- Vocabulary seed data (Indonesian words with clues)

### Output
- Board baru bisa di-generate setiap kali pemain main
- Grid tampil dengan ukuran responsif
- Kata yang sudah pernah ditemukan tidak muncul lagi

---

## Fase 4: Game Engine & Core Gameplay

### Tujuan
Membangun game engine lengkap: input, navigation, hint system, XP calculation, dan tier progression.

### Task List

- [ ] **4.1** Implementasi Game Store (Zustand):
  - Current board state
  - Selected cell / word
  - Input orientation (horizontal/vertical)
  - Filled letters
  - Hint usage tracker
  - Score/XP state
- [ ] **4.2** Implementasi touch input (mobile):
  - Tap cell → select + auto-detect orientation
  - Tap selected cell → toggle orientation
  - Custom in-game keyboard component
- [ ] **4.3** Implementasi keyboard input (desktop/web):
  - Arrow key navigation (←↑→↓)
  - Letter key input
  - Backspace / delete
  - Key event listener
- [ ] **4.4** Implementasi word validation:
  - Detect when all cells of a word are filled
  - Compare with correct word
  - Mark word as complete / incorrect
- [ ] **4.5** Implementasi Hint System:
  - Clue 1: Default ditampilkan
  - Clue 2: Buka dengan XP penalty X
  - Clue 3: Buka dengan XP penalty Y
  - Reveal Letter: Buka 1 huruf acak dengan XP penalty Z
  - Locked state untuk revealed cells
- [ ] **4.6** Implementasi konfirmasi dialog:
  - Hint purchase confirmation (scale-fade animation, 200ms)
  - Quit game confirmation
  - Tier up celebration overlay
- [ ] **4.7** Implementasi XP Engine:
  - XP gain: per kata benar
  - XP penalty: Clue 2, Clue 3, Reveal Letter
  - Tier threshold calculation
  - Tier naik/turun (hanya setelah board completion)
- [ ] **4.8** Implementasi board completion flow:
  - Deteksi semua kata terisi benar
  - Tampilkan hasil (XP earned, kata ditemukan, tier update)
  - Simpan ke saved_boards (is_finished = true)
  - Catat ke word_discoveries

### Dependencies
- Zustand game store
- React Native Gesture Handler
- `@gorhom/bottom-sheet` (untuk konfirmasi dialog)

### Output
- Game loop lengkap: generate board → input → validasi → hint → XP → selesai
- Multi-input support: mobile touch + desktop keyboard
- XP & tier system berfungsi

---

## Fase 5: User Profile, History & Theme

### Tujuan
Membangun halaman profil, "Sejarah Saya" (word discoveries), save/resume board, dan theme management.

### Task List

- [ ] **5.1** Halaman Profile:
  - Tampilkan tier saat ini (nama puitis + filosofi)
  - XP progress bar
  - Total koin
  - Statistik: board selesai, kata ditemukan, hint digunakan
  - Tombol logout / link akun
- [ ] **5.2** Halaman "Sejarah Saya" (Word Discoveries):
  - FlashList dari `@shopify/flash-list`
  - List kata yang sudah dipecahkan (kronologis)
  - Search bar (cari berdasarkan kata / clue)
  - Bottom sheet detail kata (word, clue_1, clue_2, clue_3)
- [ ] **5.3** Implementasi Save/Resume Board:
  - Auto-save state saat keluar game
  - Load saved board dari local DB
  - List saved boards di main menu (dengan status: in-progress / completed)
  - Delete saved board
- [ ] **5.4** Implementasi Theme System lengkap:
  - Light mode: `#FFFFFF` active cells, `#E0E0E0` borders, navy text
  - Dark mode: `#1E1E1E` active cells, `#333333` borders, `#F5F5F5` text
  - Black cells (mati): `#121212` dark / abu gelap light
  - 300ms fade transition via Reanimated
  - Persist preference di Local Storage
  - Respect `useColorScheme` default
- [ ] **5.5** Implementasi halaman Settings:
  - Theme toggle (light/dark/system)
  - Sound effects toggle (future)
  - Hapus data lokal
  - About / version

### Dependencies
- `@shopify/flash-list`
- `@gorhom/bottom-sheet`
- Zustand theme store
- WatermelonDB queries

### Output
- Player bisa lihat progres & history
- Board bisa disave & dilanjutkan
- Theme light/dark fully working

---

## Fase 6: Polish & Refinement

### Tujuan
Polish final: animasi, performa, error handling, dan testing.

### Task List

- [ ] **6.1** Implementasi page transitions (Reanimated):
  - `slide_from_right` untuk navigasi linier
  - `fade` untuk context change (board completion → result)
  - Durasi: 250-350ms, `Easing.bezier(0.4, 0.0, 0.2, 1)`
- [ ] **6.2** Implementasi dialog system yang konsisten:
  - Scale-fade animation (95% → 100% + opacity)
  - 200ms duration via Reanimated
  - Backdrop blur (BlurView intensity 20-30)
  - CTA button di kanan, cancel di kiri
- [ ] **6.3** Performance optimization:
  - `React.memo` + `useCallback` + `useMemo` pada grid cells
  - Reanimated worklets untuk animasi UI thread
  - FlashList recycling optimization
  - Reduce unnecessary re-renders
- [ ] **6.4** Error handling hardening:
  - Error boundaries di root + game module
  - Specific Supabase auth error handling
  - Specific local DB error handling
  - Network connectivity detection
  - Graceful degradation saat offline
- [ ] **6.5** Centralized logging review:
  - Debug level untuk development
  - Error level untuk produksi
  - Log rotasi / size management
- [ ] **6.6** Cross-platform testing:
  - Android (touch input, keyboard)
  - iOS (touch input)
  - Web / Desktop (keyboard navigation)
  - Responsive layout verification
- [ ] **6.7** Final documentation:
  - Update README.md
  - API documentation untuk domain layer
  - Setup instructions untuk developer baru

### Dependencies
- React Native Reanimated v3
- `@react-native-community/blur` atau Expo BlurView
- react-native-logs

### Output
- Aplikasi siap untuk production release
- Animasi mulus di 60/120fps
- Error handling yang robust
- Dokumen lengkap untuk maintainer
