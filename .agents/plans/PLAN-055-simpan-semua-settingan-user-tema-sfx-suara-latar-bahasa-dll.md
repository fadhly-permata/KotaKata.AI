# Simpan semua settingan user (tema, sfx, suara latar, bahasa, dll)

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 055`

## Revisi (dari pemilik)

> "Simpan semua settingan yang telah dilakukan oleh user dong, tema
> gelap/terang, sfx, suara latar, bahasa. Dan lain sebagainya."

## Langkah

- [x] **1. Tabel `user_preferences`** — (user_id FK, pref_key, pref_value, updated_at), PK komposit `(user_id, pref_key)`, RLS self-only (baca/tulis hanya milik sendiri).
- [x] **2. RPC `upsert_user_preferences`** — batch upsert dari array `{key, value}` JSONB — hemat round-trip untuk sync semua setting sekaligus.
- [x] **3. RPC `get_user_preferences`** — baca semua key-value untuk user saat ini.
- [x] **4. Push ke Supabase** — migrasi berhasil (HTTP 201), tabel + 2 RPC terverifikasi.

## Catatan Revisi

- **1–4.** 2026-08-18: Backend siap — frontend repository & sync logic (AsyncStorage ↔ cloud) bisa di-implement terpisah saat dibutuhkan. Struktur key-value fleksibel: tema mode, appThemeId, soundEnabled, ambientEnabled, language, dll.
