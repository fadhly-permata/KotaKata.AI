# KotaKata.AI — Project Instructions

You are an AI coding assistant working on **KotaKata.AI**, a cross-platform dynamic crossword game built with React Native (Expo). This document defines the project's rules, conventions, and context for AI agents.

---

## Project Overview
- **App:** Teka-Teki Silang (TTS) / Crossword game — offline-first, multiplatform (Android, iOS, Windows, Linux, Web)
- **Core mechanic:** Client-side procedural board generation, tier-based progression (10 poetic tiers), hint system with XP penalties
- **Language:** Indonesian (UI/UX, tier names, clues), English (code, comments, documentation)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native (TypeScript, Strict Mode) — Expo or Bare Workflow |
| Backend & Auth | Supabase (Auth: Anonymous, Google, Email + RLS) |
| Cloud DB | Supabase PostgreSQL (JSONB support for board layouts) |
| Local DB | WatermelonDB / RxDB (SQLite/LokiJS, offline-first reactive) |
| State Mgmt | Zustand or Redux Toolkit |
| Animations | React Native Reanimated v3 + Gesture Handler |
| Rendering | React Native Skia (high-perf grid rendering) |
| Lists | @shopify/flash-list (word history screen) |
| Bottom Sheet | @gorhom/bottom-sheet |

## Architecture
**Clean Architecture + Feature-First folder structure:**
```
src/
├── features/
│   ├── game/          # Board, grid, input
│   ├── history/       # "Sejarah Saya" — word discoveries
│   ├── auth/          # Login/anonymous linking
│   ├── profile/       # User profile, tier, XP
│   └── settings/      # Theme, preferences
├── data/
│   ├── sources/       # Supabase client, WatermelonDB models
│   ├── repositories/  # Repository implementations
│   └── models/        # Serialization / DTOs
├── domain/
│   ├── usecases/      # Business logic (pure TypeScript, no React/UI deps)
│   ├── entities/      # Domain entities
│   └── interfaces/    # Repository contracts
├── presentation/
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # Zustand/Redux stores
│   └── navigation/    # React Navigation config
├── utils/             # Helpers, constants, logger
└── app/               # Expo Router entry
```

## Coding Conventions
- **TypeScript Strict Mode** (`"strict": true`) — avoid `any`
- **Naming:**
  - Components, Types, Interfaces: `PascalCase`
  - Functions, Hooks, Variables: `camelCase` (hooks MUST start with `use`)
  - Constants: `UPPER_SNAKE_CASE`
- **Formatting:** 2-space indent, max 120 chars per line, ESLint + Prettier
- **One component/hook per file** — export as default
- **Documentation:** TSDoc (`/** ... */`) for all utilities, hooks, and interfaces
- **Performance:** `React.memo`, `useCallback`, `useMemo` on grid cells; Reanimated on UI thread (60/120fps)

## Database (Supabase PostgreSQL + RLS)
Key tables (see `PRD.md` §7 for full schema):
- `public.users` — Profile, XP, tier, coins
- `public.vocabulary_collection` — Master word bank (word, clue_1/2/3, tier_level)
- `public.word_discoveries` — Words solved per user (blocks re-generation)
- `public.saved_boards` — Board states as JSONB for save/resume

**Policy:** All tables use RLS scoped to `auth.uid()`. Vocabulary is read-only for authenticated users.

## Data Sync Strategy (Offline-First)
```
[UI/Game Screen] → (debounced writes) → [Local DB] → (batch upsert when online) → [Supabase]
```
- Primary reads/writes go through **local storage** (WatermelonDB/RxDB)
- Cloud sync occurs on board completion or every 5 minutes (batched upsert)
- Anonymous auth → identity linking to permanent Google/Email account

## Tiering System
10 poetic tiers — XP up (correct guesses), XP down (hints used):
| Tier | Name |
|------|------|
| 1 | Eja Awal |
| 2 | Desau Saujana |
| 3 | Rima Gerimis |
| 4 | Untai Aksara |
| 5 | Gema Diksi |
| 6 | Raut Metafora |
| 7 | Bait Hening |
| 8 | Madah Sanubari |
| 9 | Risalah Langit |
| 10 | Keabadian Seloka |

**Important:** XP penalties for hints should NOT downgrade tier mid-game. Recalculate only on board completion or returning to main menu.

## UI/UX Standards
- **Transitions:** 250-350ms, `Easing.bezier(0.4, 0.0, 0.2, 1)`, slide_from_right or fade
- **Modals:** Scale-fade animation (95% → 100% + opacity), 200ms, backdrop blur (intensity 20-30)
- **Theme:** Light (`#FFFFFF` active cells, `#E0E0E0` borders) & Dark (`#1E1E1E` active cells, `#333333` borders) — 300ms fade transition, respect `useColorScheme` default

## Error Handling
- Error Boundaries at root + game module level
- Specific async/network error handling (Supabase auth failures ≠ local DB failures)
- Structured logging via `react-native-logs` (debug, info, warn, error levels)

## Git Conventions
- Commit messages: `type(scope): description` (e.g. `feat(game): add procedural board generation`, `docs: update PRD`)
- Preserve pre-existing user changes; stage only files belonging to the current request
