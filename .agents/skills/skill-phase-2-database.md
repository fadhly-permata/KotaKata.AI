# KotaKata.AI — Phase 2: Supabase Backend & Offline-First Database

## Objective
Set up Supabase (Auth + PostgreSQL with RLS) and WatermelonDB/RxDB for offline-first data synchronization.

## Steps
1. Create Supabase project and save anon key + project URL
2. Install: `@supabase/supabase-js`, `@supabase/ssr`, WatermelonDB or RxDB
3. Run SQL migrations for 4 tables (users, vocabulary_collection, word_discoveries, saved_boards) with RLS
4. Set up Supabase Auth: anonymous, Google OAuth, email/password
5. Implement anonymous → permanent identity linking
6. Initialize WatermelonDB/RxDB with models matching Supabase schema
7. Build Sync Engine (batch upsert, 5-min schedule, board-completion trigger)
8. Create Repository layer (UserRepository, VocabularyRepository, WordDiscoveryRepository, BoardRepository)

## Schema Reference
See `.agents/documentation/PRD.md` §7 for full CREATE TABLE statements.

## Key Architecture Rule
```
[UI] → (local writes) → [Local DB] → (batch sync when online) → [Supabase]
```
Always write to local DB first. Cloud sync is background-only.
