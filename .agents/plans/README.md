# KotaKata.AI — Development Plans

> **Root:** `.agents/plans/`
> **Checkpoint:** `.agents/checkpoint.json` — **Otomatis di-update agent setiap selesai fase**
> **PRD:** `.agents/documentation/PRD.md`

## 19 Fase Development

| # | Fase | Status |
|---|------|--------|
| 1 | Expo Init + TypeScript + ESLint/Prettier | ⬜ |
| 2 | Folder Structure + Navigation Skeleton | ⬜ |
| 3 | Theme + Error Boundary + Logger | ⬜ |
| 4 | Supabase Project + SQL Migrations | ⬜ |
| 5 | Supabase Auth (Anonymous, Google, Email) | ⬜ |
| 6 | Local Database (WatermelonDB/RxDB) | ⬜ |
| 7 | Sync Engine + Repository Layer | ⬜ |
| 8 | Board Entities + Vocabulary Seed Data | ⬜ |
| 9 | Crossword Board Generator (Backtracking) | ⬜ |
| 10 | Board Validation + Grid Rendering (Skia) | ⬜ |
| 11 | Game Store + Input System | ⬜ |
| 12 | Word Validation + Hint System | ⬜ |
| 13 | XP Engine + Tier Progression + Completion | ⬜ |
| 14 | Confirmation Dialogs + Tier Up Overlay | ⬜ |
| 15 | Profile Screen + Settings | ⬜ |
| 16 | History Screen (Sejarah Saya) | ⬜ |
| 17 | Save/Resume Board System | ⬜ |
| 18 | Page Transitions + Performance | ⬜ |
| 19 | Error Handling + Testing + Docs | ⬜ |

## Cara Kerja
1. Agent baca `checkpoint.json` → tahu fase terakhir + status
2. Agent kerjakan fase yang `"not_started"` berikutnya
3. **WAJIB update `checkpoint.json`** di akhir setiap session
4. User tinggal bilang "lanjut" — agent otomatis cari fase yang belum dikerjakan

## Skill Files
Setiap fase punya skill file di `.agents/skills/` yang bisa di-load via `skill` tool.
