# Papan hint di tablet/laptop kosong — non-ponsel tampilkan semua tombol

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 056`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Pada tampilan ponsel, desain papan hint udah oke. Tapi pada tampilan
> tablet, laptop, jadi kosong banget papannya. Untuk tampilan non ponsel,
> buat agar panel menampilkan semua tombol aja."

**Tujuan:** panel hint in-game (`GameActionBar`, PLAN-035 — pager 3 halaman
Zoom/Petunjuk/Alat) terasa kosong di layar lebar (tablet/laptop). Untuk
tampilan **non-ponsel** (lebar layar ≥ ambang tertentu), tampilkan **semua
tombol sekaligus** dalam satu panel (tidak dipecah jadi pager halaman).

## Cakupan

- `src/features/game/GameActionBar.tsx` (atau komponen panel hint) —
  layout responsif: ponsel = pager (seperti sekarang), non-ponsel = semua
  tombol tampil berdampingan.
- Deteksi layar lebar (useWindowDimensions, ambang mis. ≥ 700–768px /
  mode tablet).
- Perhatikan tema papan/neumorphic shadow agar tombol tetap konsisten.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 056 <no> "teks"`)_
