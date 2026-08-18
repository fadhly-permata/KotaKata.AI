# Pisahkan tombol buka clue 2 dan clue 3

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 057`

## Revisi (dari pemilik)

> "Biar kelihatan kaya fitur, untuk membuka clue 2 dan 3, tombol-nya dipisah
> aja."

## Langkah

- [x] **1. Split props** — GameActionBar baru: `clue2Opened`, `clue3Opened`, `clue2Disabled`, `onRevealClue2`, `clue3Disabled`, `onRevealClue3` menggantikan prop gabungan lama.
- [x] **2. Dua tombol terpisah** — tombol "📖 2" (Clue 2) + tombol "🔤 3" (Clue 3) masing-masing dengan badge "✓" jika sudah terbuka; Clue 3 nonaktif (opacity 0.4) jika Clue 2 belum dibuka.
- [x] **3. Dua ConfirmDialog** — `showRevealClue2Confirm` & `showRevealClue3Confirm` terpisah di GameScreen, masing-masing menampilkan XP penalty sendiri.
- [x] **4. Verifikasi** — tsc + 50 tes lolos.

## Catatan Revisi

- **1–4.** 2026-08-18: GameScreen diupdate — state/confirm/callback terpisah untuk clue 2 & 3; badge angka (2/3) di tombol, bukan nextClueToReveal dinamis.
