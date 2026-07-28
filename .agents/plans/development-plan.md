# KotaKata.AI — Development Plan (19 Fase Detail)

> **Checkpoint auto-update:** SETIAP agent WAJIB update `checkpoint.json` setelah selesai.
> **PRD:** `.agents/documentation/PRD.md`

---

## Fase 1: Expo Init + TypeScript + ESLint/Prettier
**Durasi estimasi:** 1 session
- `npx create-expo-app` dengan TypeScript template
- `"strict": true` di tsconfig
- ESLint + Prettier (2-space, max 120 chars)
- Verifikasi project bisa di-run

## Fase 2: Folder Structure + Navigation Skeleton
**Durasi estimasi:** 1 session
- Feature-First folder: `src/features/{game,history,auth,profile,settings}/`
- Clean Architecture: `src/data/`, `src/domain/`, `src/presentation/`
- React Navigation native-stack + screen skeletons
- Dependencies: `@react-navigation/native`, `native-stack`, `react-native-screens`, `safe-area-context`

## Fase 3: Theme + Error Boundary + Logger
**Durasi estimasi:** 1 session
- **ThemeProvider:** Light/Dark mode (CSS vars + useColorScheme fallback, 300ms transition)
- **ErrorBoundary:** 2 layer (root + game module)
- **Logger:** react-native-logs (debug/info/warn/error)

## Fase 4: Supabase Project + SQL Migrations
**Durasi estimasi:** 1 session
- Buat Supabase project + simpan anon key & project URL
- SQL migration `users` (user_id PK, display_name, email, total_xp, current_tier, coins, updated_at)
- SQL migration `vocabulary_collection` (word_id PK, word, clue_1/2/3, tier_level, created_at) + RLS read-only
- SQL migration `word_discoveries` (discovery_id PK, user_id FK, word_id FK, word, clue_1/2/3, discovered_at, UNIQUE user+word) + RLS
- SQL migration `saved_boards` (board_id PK, user_id FK, tier_at_generation, grid_size, layout_data JSONB, is_finished, updated_at) + RLS

## Fase 5: Supabase Auth (Anonymous, Google, Email)
**Durasi estimasi:** 1 session
- Anonymous sign-in
- Google OAuth setup
- Email/password auth
- Identity linking: anon → permanent tanpa kehilangan data

## Fase 6: Local Database (WatermelonDB/RxDB)
**Durasi estimasi:** 1 session
- Install WatermelonDB atau RxDB
- Model definitions sesuai skema Supabase (users, vocabulary, wordDiscoveries, savedBoards)
- Inisialisasi local DB

## Fase 7: Sync Engine + Repository Layer
**Durasi estimasi:** 1–2 sessions
- Batch upsert ke Supabase saat online (debounced)
- 5-min scheduled sync
- Board-completion trigger sync
- 4 Repository classes: User, Vocabulary, WordDiscovery, Board

## Fase 8: Board Entities + Vocabulary Seed Data
**Durasi estimasi:** 1–2 sessions
- `BoardCell` (row, col, letter, isBlocked, isLocked, wordIndex, orientation)
- `BoardWord` (word, clue_1/2/3, orientation, startRow, startCol)
- `Board` (grid[][], words[], size, tierLevel)
- `WordPoolFilter`: tier filter + exclusion + fallback ke tier -1
- 500+ Indonesian words seed (50/tier, 3-10+ huruf, 3 clues each)

## Fase 9: Crossword Board Generator (Backtracking)
**Durasi estimasi:** 1–2 sessions
- Backtracking algorithm: start with longest words, place randomly, backtrack on dead end
- Intersection validation
- Grid sizes: 10×10 dan 12×12
- Fallback ke tier-1 jika bank kata tier aktif tidak cukup

## Fase 10: Board Validation + Grid Rendering (Skia)
**Durasi estimasi:** 1 session
- BoardValidator: overlap check, all words connected, no orphan words
- Responsive grid dengan `@shopify/react-native-skia`
- Dynamic cell sizing via `useWindowDimensions`
- Selected word highlight + orientation indicator

## Fase 11: Game Store + Input System
**Durasi estimasi:** 1–2 sessions
- Zustand GameStore: board state, selected cell, orientation, filled letters, hint usage, XP
- Touch: tap to select, tap again to toggle (horizontal/vertical)
- Custom in-game keyboard
- Keyboard: arrow keys + letter input + backspace (desktop/web)

## Fase 12: Word Validation + Hint System
**Durasi estimasi:** 1 session
- Auto-detect when all cells of a word are filled
- Compare with correct word
- Clue 2 & Clue 3 dengan XP penalty
- Reveal Letter (random, locked)

## Fase 13: XP Engine + Tier Progression + Board Completion
**Durasi estimasi:** 1 session
- XP gain: per kata benar (tier-based multiplier)
- XP penalty: Clue 2, Clue 3, Reveal Letter
- Tier thresholds: tier naik/turun (hanya setelah board completion)
- Board completion: detect → show results → save board → record discoveries

## Fase 14: Confirmation Dialogs + Tier Up Overlay
**Durasi estimasi:** 1 session
- Hint purchase confirmation (scale-fade 200ms + blur)
- Quit match alert
- Tier up celebration overlay
- CTA right, cancel left (low contrast)

## Fase 15: Profile Screen + Settings
**Durasi estimasi:** 1 session
- Profile: tier + XP bar + coins + stats (boards done, words found, hints used)
- Account: logout, link anon → permanent
- Settings: theme (light/dark/system), sound toggle, clear data, about

## Fase 16: History Screen (Sejarah Saya)
**Durasi estimasi:** 1 session
- FlashList of discovered words (chronological, newest first)
- Search bar: filter by word text or clue content
- Bottom sheet: word detail + clue_1/2/3

## Fase 17: Save/Resume Board System
**Durasi estimasi:** 1 session
- Auto-save on game exit
- Load from local DB
- Main menu: in-progress / completed badges
- Delete option

## Fase 18: Page Transitions + Performance
**Durasi estimasi:** 1 session
- slide_from_right + fade transitions
- 250-350ms, Easing.bezier(0.4, 0.0, 0.2, 1)
- React.memo/useCallback/useMemo on grid cells
- Reanimated worklets (UI thread)
- FlashList optimization

## Fase 19: Error Handling + Testing + Docs
**Durasi estimasi:** 1 session
- Error boundaries hardening
- Supabase auth error vs local DB error handling
- Network offline graceful degradation
- Logging levels review
- Cross-platform test (touch + keyboard)
- Update README + TSDoc

---

## Summary

| # | Fase | Session |
|---|------|---------|
| 1 | Expo Init + TS + ESLint | 1 |
| 2 | Folder + Navigation | 1 |
| 3 | Theme + Error + Logger | 1 |
| 4 | Supabase Project + Migrations | 1 |
| 5 | Supabase Auth | 1 |
| 6 | Local Database | 1 |
| 7 | Sync Engine + Repos | 1-2 |
| 8 | Board Entities + Vocab Seed | 1-2 |
| 9 | Board Generator (Backtracking) | 1-2 |
| 10 | Board Validation + Skia Grid | 1 |
| 11 | Game Store + Input | 1-2 |
| 12 | Word Validation + Hints | 1 |
| 13 | XP + Tier + Board Complete | 1 |
| 14 | Dialogs + Tier Ups | 1 |
| 15 | Profile + Settings | 1 |
| 16 | History (Sejarah Saya) | 1 |
| 17 | Save/Resume Board | 1 |
| 18 | Transitions + Performance | 1 |
| 19 | Error Handling + Test + Docs | 1 |
