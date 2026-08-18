-- ============================================================
-- KotaKata AI — Katalog Tema (themes)
-- ============================================================
-- Tabel katalog tema yang dijual di halaman Pasar (Store). Data di sini
-- adalah SUMBER KEBENARAN katalog; paletnya (jsonb light/dark) dibaca app
-- untuk preview swatch. Aplikasi juga punya salinan lokal registry
-- (src/presentation/themes/themeData.ts) yang DIBUAT dari sumber yang sama
-- via generator — lihat scripts/db/gen-themes-sql.ts — supaya render tetap
-- jalan offline (fallback) saat katalog cloud tidak bisa dijangkau.
--
-- Tiga jenis (kind) tema:
--   app      → palet GLOBAL (semua halaman) — light & dark penuh.
--   board    → desain halaman GAME saja: papan, soal (clue pill) & panel hint.
--   keyboard → desain InGameKeyboard.
--
-- RLS: katalog bersifat PUBLIK (semua pengguna, termasuk anon, boleh
-- membaca). Tidak ada operasi tulis dari aplikasi — tema dikelola developer
-- lewat SQL (migrasi / data seed).
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/themes.sql
-- Kemudian isi datanya: node scripts/db/supabase-run.mjs supabase/data/themes.sql
-- ============================================================

create table if not exists public.themes (
  -- PK komposit (id, kind): id yang sama boleh dipakai di jenis berbeda
  -- (mis. "puitis" ada sebagai app, board, DAN keyboard).
  id text not null,
  kind text not null check (kind in ('app', 'board', 'keyboard')),
  primary key (id, kind),
  name text not null,
  tagline text not null default '',
  description text not null default '',
  is_default boolean not null default false,
  price_label text not null default 'Gratis',
  -- Jenis tema di Pasar (PLAN-052): 'free' (bawaan) atau 'premium' (koleksi
  -- eksklusif). Migrasi lama tidak punya kolom ini — tambahkan idempotent
  -- di bawah supaya `create table if not exists` aman untuk DB baru & lama.
  theme_type text not null default 'free',
  light jsonb not null,
  dark jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.themes enable row level security;

-- Tambahan idempotent untuk DB yang sudah dibuat sebelum kolom theme_type
-- ada (create table if not exists di atas tidak menyentuh tabel lama).
alter table public.themes add column if not exists theme_type text not null default 'free';

alter table public.themes drop constraint if exists themes_theme_type_check;
alter table public.themes add constraint themes_theme_type_check
  check (theme_type in ('free', 'premium'));

-- Katalog publik: semua role (anon & authenticated) boleh membaca.
drop policy if exists "themes_read_all" on public.themes;
create policy "themes_read_all" on public.themes
  for select using (true);

create index if not exists themes_kind_sort_idx
  on public.themes (kind, sort_order);
