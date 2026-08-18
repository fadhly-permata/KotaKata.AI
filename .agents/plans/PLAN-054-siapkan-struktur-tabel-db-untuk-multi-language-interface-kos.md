# Siapkan struktur tabel DB untuk multi-language (interface & kosakata)

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 054`

## Revisi (dari pemilik)

> "Gua rencananya mau buat game ini multi-language (baik interface maupun
> kosakata game-nya). Siapin dong table-nya agar mendukung kebutuhan ini."

## Langkah

- [x] **1. Tabel `vocabulary_translations`** — (word_id FK, locale, word, clue_1/2/3), PK komposit `(word_id, locale)`, RLS public read, index locale. Tambahan data-driven, tidak memutus query kosakata Indonesia yang ada.
- [x] **2. Tabel `app_strings`** — (key, locale, value) untuk terjemahan UI, RLS public read, index locale. Seed 33 string bahasa Indonesia default.
- [x] **3. Push ke Supabase** — migrasi `i18n-and-user-prefs.sql` berhasil (HTTP 201), ketiga tabel terverifikasi di DB.

## Catatan Revisi

- **1–3.** 2026-08-18: Struktur bersifat siap pakai — menambah bahasa baru tinggal insert row baru di `vocabulary_translations` dan `app_strings` tanpa ubah schema. Query kosakata existing tetap mengacu ke `vocabulary` (Indonesia) sebagai base.
