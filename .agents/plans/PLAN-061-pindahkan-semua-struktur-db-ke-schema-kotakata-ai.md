# Pindahkan semua struktur DB ke schema kotakata_ai

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 061`

## Revisi (dari pemilik)

> "Pindahkan semua struktur database ke schema bernama 'kotakata_ai'."

**Tujuan:** memindahkan semua tabel, fungsi, index, RLS policies, dan seed
data dari schema `public` ke schema `kotakata_ai`. Ini membersihkan namespace
`public` (hanya menyisakan tabel auth bawaan Supabase: `auth.users`,
`auth.sessions`, dll.) dan memberi domain project.

## Cakupan

### Tabel yang dipindah (7):
`vocabulary`, `themes`, `saved_boards`, `user_log_reports`,
`user_preferences`, `word_discoveries`, `users`

### Yang harus diupdate:
- **Migrasi SQL** — semua file `supabase/migrations/*.sql` diubah ke
  `kotakata_ai.tablename` + tambah `create schema if not exists kotakata_ai`
  di awal.
- **RLS policies** — `ON public.tablename` → `ON kotakata_ai.tablename`.
- **Fungsi (RPC):** `delete_user_data`, `get_leaderboard_paged`,
  `get_leaderboard_rank`, `get_user_preferences`, `insert_ai_vocabulary`,
  `restore_guest_identity`, `upsert_user_preferences` — ubah
  `public.tablename` → `kotakata_ai.tablename` di body fungsi + pastikan
  `search_path` ditetapkan.
- **Frontend:** semua `.from("tablename")` di `src/data/repositories/*.ts`
  → `.from("kotakata_ai.tablename")`.
- **Script:** `gen-themes-sql.mjs`, `push-vocab.mjs`, `push-themes.mjs`,
  `check-vulgar-db.mjs`, `verify-vocab.mjs`, `verify-origin-prefixes.mjs`,
  `supabase-run.mjs`, `gen-vocab-sql.mjs` — update referensi tabel.
- **`src/convex/_generated/`** — kalau ada referensi tabel convex, skip
  (Convex terpisah dari Supabase).

### Approach:
1. Jalankan SQL migrasi: `CREATE SCHEMA IF NOT EXISTS kotakata_ai;`
2. `ALTER TABLE public.X SET SCHEMA kotakata_ai;` untuk setiap tabel
3. Update semua fungsi/RPC ke schema baru
4. Update frontend repositories
5. Update scripts
6. Verifikasi tsc + tes
7. Push ke Supabase & verify
8. Deploy web

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan)_
