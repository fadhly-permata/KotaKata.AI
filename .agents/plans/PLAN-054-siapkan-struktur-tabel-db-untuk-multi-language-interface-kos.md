# Siapkan struktur tabel DB untuk multi-language (interface & kosakata)

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 054`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Gua rencananya mau buat game ini multi-language (baik interface maupun
> kosakata game-nya). Siapin dong table-nya agar mendukung kebutuhan ini."

**Tujuan:** siapkan struktur database (migrasi Supabase) yang mendukung
**multi-language**:
- **Kosakata game**: 1 kata bisa punya beberapa versi bahasa (jawaban +
  clue_1/2/3 per bahasa) tanpa merusak data pemain yang sudah ada
  (word_id tetap acuan; discovery/history tetap mengarah ke word_id).
- **Interface**: tabel terjemahan label UI per bahasa (atau desain yang
  mendukungnya — mis. `app_strings` / `i18n` table, atau cukup pola yang
  disiapkan sekarang untuk dipakai nanti).
- Bahasa awal tetap Indonesia; struktur dibuat sedemikian rupa sehingga
  menambah bahasa baru tidak mengubah schema (data-driven).

## Cakupan

- Migrasi Supabase baru (`supabase/migrations/…`) — mis. normalisasi
  `vocabulary` menjadi tabel kata + tabel terjemahan per bahasa, atau
  kolom jsonb `translations` per word_id; pastikan tidak memutus query
  eksisting (vocabularyRepository, word discovery, dll).
- Tabel terjemahan interface (string keys + locale).
- Update generator SQL kosakata & repository bila perlu (tetap kompatibel
  dengan skema lama saat baru bahasa id).
- Dokumentasi rencana di plan/RELEASE_NOTES.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 054 <no> "teks"`)_
