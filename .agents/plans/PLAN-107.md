# PLAN-107 — Papan Buatan User Lain Tidak Mengakumulasi XP

**Status:** ✅ SELESAI (23 Aug 2026)

## Hasil pengerjaan
1. Flag baru `noXpMode` di gameStore (reset otomatis oleh `reset()`).
2. Semua kalkulasi XP di store (solve, penalti clue 2/3, reveal letter/word,
   perubahan tier) kini dicek `aiMode || noXpMode`.
3. Gate submit XP anti-cheat di GameScreen: papan komunitas/buat soal tidak
   pernah memanggil RPC `apply_board_xp`.
4. `SharedBoardsScreen` & "Buat Soalmu Sendiri" set `setNoXpMode(true)`.
5. CompletionOverlay menampilkan catatan "Mode AI / Papan Komunitas — tanpa XP".
6. Mode Normal & Boss TIDAK berubah (XP tetap jalan + bonus boss).
Verifikasi: tsc ✅ · 79 test ✅
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> memainkan game buatan user lain tidak akan mengakumulasi xp sama sekali.
> Hanya mode normal dan mode boss yang akan mengakumulasi XP

## Pemahaman
- Aturan XP menjadi tegas per sumber papan:
  - ✅ **Mode Normal** → XP terakumulasi seperti sekarang.
  - ✅ **Mode Boss** → XP terakumulasi (termasuk bonus boss).
  - ❌ **Papan bagikan buatan pemain lain** (SharedBoards) → TANPA XP sama sekali.
  - ❌ **Buat Soalmu Sendiri** & **Main Mode AI** → juga TANPA XP (konsisten dengan
    aturan lama "Mode AI tanpa XP").
- Perlu diverifikasi saat pengerjaan:
  1. Apakah jalur SharedBoards saat ini masih bisa memberi XP (flag aiMode/daily
     tidak di-set saat main dari halaman komunitas)?
  2. Pastikan RPC anti-cheat `apply_board_xp` / jalur penambahan XP melewati
     semua sumber non-normal/non-boss.
  3. UI: indikator "tanpa XP" di papan bagikan supaya pemain tidak bingung.
  4. Verifikasi lintas platform (aturan #5b) + tsc/test + deploy web dev.

## Langkah pengerjaan (bila disetujui)
1. Audit jalur XP per mode di GameScreen/gameStore.
2. Set flag mode non-XP untuk papan dari SharedBoards.
3. Uji: menang papan bagikan → total XP TIDAK berubah; normal/boss → berubah.
