-- ============================================================
-- PLAN-054: Multi-language support (i18n)
-- ============================================================
-- Vocabulary translations: each word can have multiple language versions.
-- The base vocabulary table remains Indonesian; translations are additive.
-- word_id references vocabulary(word_id) — one row per word per locale.
-- ============================================================

create table if not exists public.vocabulary_translations (
  word_id text not null references public.vocabulary(word_id) on delete cascade,
  locale  text not null default 'id',
  -- Word answer in this locale (if different from base; null = same as base)
  word    text,
  -- Clues in this locale (null = use base Indonesian clue)
  clue_1  text,
  clue_2  text,
  clue_3  text,
  created_at timestamptz not null default now(),
  primary key (word_id, locale)
);

alter table public.vocabulary_translations enable row level security;

-- Public read (katalog kosakata bersifat publik)
drop policy if exists "vocabulary_translations_read" on public.vocabulary_translations;
create policy "vocabulary_translations_read"
  on public.vocabulary_translations for select using (true);

create index if not exists idx_vocab_trans_locale
  on public.vocabulary_translations (locale);

-- ============================================================
-- UI strings / interface translations (PLAN-054)
-- ============================================================
-- Key-value pairs per locale for all user-facing strings.
-- Keys use dot notation: "menu.play", "settings.sound", etc.
-- ============================================================

create table if not exists public.app_strings (
  key     text not null,
  locale  text not null default 'id',
  value   text not null,
  created_at timestamptz not null default now(),
  primary key (key, locale)
);

alter table public.app_strings enable row level security;

-- Public read (terjemahan UI bersifat publik)
drop policy if exists "app_strings_read" on public.app_strings;
create policy "app_strings_read"
  on public.app_strings for select using (true);

create index if not exists idx_app_strings_locale
  on public.app_strings (locale);

-- ============================================================
-- Seed: default locale "id" (Bahasa Indonesia)
-- ============================================================
-- Existing strings are hardcoded in TS — this table provides the structure
-- for future locales. The id locale can optionally serve as override.
-- ============================================================

insert into public.app_strings (key, locale, value) values
  ('game.title', 'id', 'KotaKata AI'),
  ('game.play', 'id', 'Main'),
  ('game.store', 'id', 'Pasar'),
  ('game.history', 'id', 'Sejarah Permainan'),
  ('game.profile', 'id', 'Profil'),
  ('game.settings', 'id', 'Pengaturan'),
  ('game.win', 'id', 'Selamat! Kamu menyelesaikan papan ini!'),
  ('game.hint.clue2', 'id', 'Petunjuk ke-2'),
  ('game.hint.clue3', 'id', 'Petunjuk ke-3'),
  ('game.hint.letter', 'id', 'Buka Satu Huruf'),
  ('game.hint.word', 'id', 'Buka Semua Huruf Kata'),
  ('game.reset', 'id', 'Reset Papan'),
  ('game.keyboard.show', 'id', 'Tampilkan Keyboard'),
  ('game.keyboard.hide', 'id', 'Sembunyikan Keyboard'),
  ('settings.title', 'id', 'Pengaturan'),
  ('settings.sound', 'id', 'Efek Suara'),
  ('settings.ambient', 'id', 'Backsound Tema'),
  ('settings.theme', 'id', 'Mode Terang/Gelap'),
  ('settings.theme.light', 'id', 'Terang'),
  ('settings.theme.dark', 'id', 'Gelap'),
  ('settings.theme.system', 'id', 'Ikut Sistem'),
  ('store.title', 'id', 'Pasar'),
  ('store.tab.free', 'id', 'Gratis'),
  ('store.tab.modern', 'id', 'Modern'),
  ('store.activate', 'id', 'Aktifkan'),
  ('store.active', 'id', 'Sedang Dipakai'),
  ('store.preview', 'id', 'Preview')
on conflict (key, locale) do nothing;

-- ============================================================
-- PLAN-055: User Preferences — persist all settings to cloud
-- ============================================================
-- Each user can store key-value preferences that sync across devices.
-- Keys: "themeMode", "appThemeId", "soundEnabled", "ambientEnabled",
--        "language", etc.
-- ============================================================

create table if not exists public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  pref_key   text not null,
  pref_value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pref_key)
);

alter table public.user_preferences enable row level security;

-- Users can read/write their own preferences only.
drop policy if exists "user_prefs_self" on public.user_preferences;
create policy "user_prefs_self"
  on public.user_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RPC to upsert a batch of preferences in one call (avoids N round-trips).
create or replace function public.upsert_user_preferences(
  p_prefs jsonb
) returns void as $$
declare
  elem jsonb;
begin
  for elem in select jsonb_array_elements(p_prefs)
  loop
    insert into public.user_preferences (user_id, pref_key, pref_value, updated_at)
    values (
      auth.uid(),
      elem->>'key',
      elem->>'value',
      now()
    )
    on conflict (user_id, pref_key) do update set
      pref_value = excluded.pref_value,
      updated_at = now();
  end loop;
end;
$$ language plpgsql security definer;

-- RPC to read all preferences for current user.
create or replace function public.get_user_preferences()
returns table(pref_key text, pref_value text) as $$
  select up.pref_key, up.pref_value
  from public.user_preferences up
  where up.user_id = auth.uid()
  order by up.pref_key;
$$ language sql security definer;
