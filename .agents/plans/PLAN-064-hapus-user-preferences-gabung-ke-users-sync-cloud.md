# PLAN-064 — Hapus user_preferences, Gabung Preferensi ke users + Sync Cloud

## Problem

1. **Tabel `user_preferences` redundant** — ada di DB tapi TIDAK PERNAH dipakai di kode (0 referensi di src/). Model key-value (pref_key/pref_value) tidak konsisten dengan DRY rule.

2. **Setting tidak tersimpan ke cloud** — Semua preferensi user (tema gelap/terang, efek suara, backsound, pilihan tema) hanya disimpan di AsyncStorage (lokal perangkat). Ketika user login di device lain, setting hilang.

3. **Setting tidak persisten lintas session** — User mengeluh "kenapa kayak gak nyimpen apa-apa waktu gua ubah settingan di aplikasi?"

## Current State

| AsyncStorage Key | Lokasi | Isi |
|---|---|---|
| `kotakata_theme_mode` | ThemeProvider.tsx | "light" \| "dark" \| "system" |
| `kotakata_theme_selection` | themeSelectionStore.ts | appThemeId, boardThemeId, keyboardThemeId |
| `kotakata.soundEnabled` | sound.ts | boolean (efek suara) |
| `kotakata.ambientEnabled` | sound.ts | boolean (backsound tema) |
| `kotakata.aiProvider` | aiProvider.ts | AI config (SUDAH sync ke cloud via `users.ai_provider_config`) |
| `kotakata.aiProviderOwner` | aiProvider.ts | uid pemilik config lokal |

DB tables: `user_preferences` (UNUSED), `users` (punya: user_id, display_name, email, device_id, total_xp, current_tier, coins, updated_at, ai_provider_config)

## Solution

### 1. Tambah kolom preferensi ke tabel `users`
```
ALTER TABLE users ADD COLUMN theme_mode text DEFAULT 'system';
ALTER TABLE users ADD COLUMN sound_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN ambient_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN app_theme_id text DEFAULT 'puitis';
ALTER TABLE users ADD COLUMN board_theme_id text DEFAULT 'puitis';
ALTER TABLE users ADD COLUMN keyboard_theme_id text DEFAULT 'puitis';
```

### 2. Drop tabel `user_preferences`
```sql
DROP TABLE IF EXISTS user_preferences;
```

### 3. Update `UserDoc` schema
Tambah field: `theme_mode`, `sound_enabled`, `ambient_enabled`, `app_theme_id`, `board_theme_id`, `keyboard_theme_id`

### 4. Update `userRepository`
- Tambah kolom ke `USER_COLUMNS`
- Tambah method `getPreferences(userId)` → baca semua kolom preferensi
- Tambah method `savePreferences(userId, prefs)` → update kolom preferensi (debounced)
- Update `upsert()` untuk include kolom baru

### 5. Buat `userPreferencesService` (atau di userRepository)
- `loadPreferences(userId)` → baca dari cloud, tulis ke AsyncStorage (local cache)
- `savePreferences(userId, prefs)` → tulis ke cloud (debounced 500ms)
- `migrateLocalPrefsToCloud(userId)` → satu kali: baca semua AsyncStorage → tulis ke cloud (backfill untuk user lama)

### 6. Update ThemeProvider
- `setThemeMode`: tetap simpan ke AsyncStorage (cepat) + panggil `savePreferences` ke cloud
- Saat mount + user logged in: load dari cloud dulu → kalau cloud punya data, gunakan cloud → kalau tidak, pakai AsyncStorage (backfill)

### 7. Update themeSelectionStore
- `setAppThemeId`/`setBoardThemeId`/`setKeyboardThemeId`: tetap simpan ke AsyncStorage + sync ke cloud

### 8. Update sound.ts
- `setSoundEnabled`/`setAmbientEnabled`: tetap simpan ke AsyncStorage + sync ke cloud

### 9. Migrasi data lama
- Saat user pertama login setelah update: baca AsyncStorage → kalau cloud kosong → tulis ke cloud (backfill)
- Pattern sama dengan `syncAiProviderConfigWithCloud`

## Files Changed
- `supabase/migrations/064-user-prefs-in-users.sql` (NEW)
- `src/data/models/schemas.ts` — tambah field ke UserDoc
- `src/data/repositories/userRepository.ts` — tambah kolom, method get/save preferences
- `src/utils/userPreferences.ts` (NEW) — service load/save/sync preferences
- `src/presentation/components/providers/ThemeProvider.tsx` — sync ke cloud saat ganti themeMode
- `src/presentation/stores/themeSelectionStore.ts` — sync ke cloud saat ganti tema
- `src/utils/sound.ts` — sync ke cloud saat ganti suara/backsound
- `src/presentation/navigation/RootNavigator.tsx` — panggil migrateLocalPrefsToCloud saat session load

## Verification
- tsc -b --noEmit → 0 errors
- bun test → 50 tests pass
- Tabel `user_preferences` sudah tidak ada
- Kolom preferensi ada di tabel `users`
- Ubah setting → cek Supabase → kolom ter-update
- Login device lain → setting tetap ada
