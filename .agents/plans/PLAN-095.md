# PLAN-095 — Soal Sering Berulang di Game (Reguler & Mode AI): Exclude Discoveries Dipertanyakan

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> btw, kok soal yang muncul kayak itu itu aja ya. Kayak kurang random gitu gua udah
> puluhan kali reset level gua ngerasa kayak sering muncul soal yang sama tuh di game.
> Begitu pula dengan versi ai. Sepertinya gak pernah exclude soal dari table discoveries

## Pemahaman
- Gejala: setelah puluhan kali reset level, soal yang muncul terasa berulang-ulang —
  di mode reguler (dari DB) maupun Mode AI.
- Dugaan pemilik: pemilihan soal TIDAK meng-exclude kata yang sudah pernah ditemukan
  (tabel `discoveries`), sehingga pool soal efektifnya kecil dan sering sama.

## Rencana pengerjaan (belum dieksekusi)
1. Telusuri jalur pemilihan soal:
   - Reguler: query/board builder — apakah ada join/filter terhadap discoveries per user?
   - Mode AI: apakah `excludeWords` (PLAN-050) benar diisi dari discoveries user
     sebelum memanggil `requestAiWords`?
2. Cek juga: apakah "reset level" menghapus discoveries, atau hanya reset progress —
   kalau discoveries tetap, exclude harusnya justru membuat soal BARU tiap reset;
   gejala berulang menandakan exclude tidak jalan / tidak dipakai.
3. Perbaiki: pastikan pemilihan soal (reguler & AI) meng-exclude kata yang sudah
   pernah ditemukan user; fallback bila pool habis (pakai least-recently-found).
4. Verifikasi lintas platform (aturan #5b) + tsc/test → commit & push → deploy web dev.

## Catatan
- Perlu cek skema tabel discoveries (kolom user_id/word_id) sebelum menyusun query.
