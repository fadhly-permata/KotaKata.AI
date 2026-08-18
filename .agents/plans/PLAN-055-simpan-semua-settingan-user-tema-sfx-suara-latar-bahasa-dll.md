# Simpan semua settingan user (tema, sfx, suara latar, bahasa, dll)

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 055`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Simpan semua settingan yang telah dilakukan oleh user dong, tema
> gelap/terang, sfx, suara latar, bahasa. Dan lain sebagainya."

**Tujuan:** semua preferensi user tersimpan (persisten lintas perangkat,
bukan hanya lokal AsyncStorage):
- Tema aplikasi + mode gelap/terang.
- Efek suara (sfx) on/off, backsound/suara latar on/off.
- Bahasa (saat multi-language PLAN-054 siap).
- Setting lain yang relevan (mis. provider AI, dsb — inventariskan dulu
  yang sudah disimpan lokal saat ini).

## Cakupan

- Tabel Supabase baru (mis. `user_preferences` / `user_settings`, key-value
  per user dengan RLS) + migrasi + repository.
- Sinkronisasi: baca saat login/app start, tulis saat setting berubah;
  prioritas cloud vs lokal (offline tetap jalan, sync saat online).
- Inventarisasi setting yang sudah ada: `themeSelectionStore`
  (appThemeId + mode), `sound.ts` (sfx/ambient prefs), provider AI, dll.
- UI belum tentu berubah — fokus persistensi & sinkronisasi.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 055 <no> "teks"`)_
