# Pisahkan tombol buka clue 2 dan clue 3

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 057`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Biar kelihatan kaya fitur, untuk membuka clue 2 dan 3, tombol-nya dipisah
> aja."

**Tujuan:** saat ini membuka clue 2 / clue 3 kemungkinan lewat satu tombol
berurutan (buka berikutnya / "Petunjuk"). Pisahkan menjadi **dua tombol
terpisah**: satu untuk membuka **Clue 2**, satu untuk membuka **Clue 3**
(mis. biaya/XP per buka tetap mengikuti aturan yang ada). Tombol untuk clue
yang sudah terbuka menjadi nonaktif/indikator.

## Cakupan

- Komponen panel clue/petunjuk in-game (CluePill / GameActionBar —
  koordinasi dengan PLAN-056 dan PLAN-058).
- Logic buka clue (state clue terbuka, biaya XP bila ada) — cek
  implementasi saat ini (mungkin `revealHint`/XP engine).
- Tampilan: 2 tombol (mis. "Clue 2" & "Clue 3") dengan status terbuka/
  terkunci.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 057 <no> "teks"`)_
