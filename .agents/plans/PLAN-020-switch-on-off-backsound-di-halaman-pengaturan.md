# Switch on/off backsound di halaman Pengaturan

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 020`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [x] **1. Preferensi backsound terpisah** — `kotakata.ambientEnabled` (default nyala) di `src/utils/sound.ts`: `isAmbientEnabled`, `loadAmbientPrefs`, `setAmbientEnabled`; backsound hanya diputar kalau efek suara DAN toggle backsound nyala; web ikut memuat preferensi.
- [x] **2. Switch di Pengaturan** — baris "Backsound Tema" (Switch + hint) di bawah "Efek Suara"; seksi di-rename "Tampilan & Suara".

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 020 <no> "teks"`)_
