# PLAN-095 — Soal Sering Berulang di Game (Reguler & Mode AI): Exclude Discoveries Dipertanyakan

**Status:** DONE ✅ (23 Aug 2026 — sesuai arahan eksplisit pemilik)
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
   pernah ditemukan user.

## Arahan final pemilik (23 Aug 2026)
> - mode ai: ambil semua kata (cukup kata, gak usah clue) dari table discoveries
>   dalam bentuk array string, dan jadikan exclude word untuk ai. Maksimal 500 kata.
> - mode non ai: waktu generate soal harusnya pake query "not in" jadi gak bakalan
>   ketemu sama soal sebelumnya. Ini hanya berlaku untuk XP dibawah 800.000.
>   Untuk diatas itu boleh ketemu dengan soal apapun dari tier manapun.

## Hasil pengerjaan
1. **Mode AI**: method baru `getDiscoveredWordTexts(userId, limit=500)` — ambil TEKS
   kata terbaru dari word_discoveries (500), langsung jadi `excludeWords` prompt AI;
   cap prompt MAX_EXCLUDE_WORDS ikut dinaikkan 300 → 500.
2. **Mode non-AI**: eksklusi server-side `.not(in)` TETAP berlaku hanya untuk
   XP < 800.000 (satu tier). XP ≥ 800.000 (allTiers): TANPA eksklusi — pool semua
   tier, boleh soal apa pun.
3. Test unit exclude di-update ke cap 500.
4. Verifikasi lintas platform (aturan #5b) + tsc/test → commit & push → deploy web dev.

## Catatan
- Perlu cek skema tabel discoveries (kolom user_id/word_id) sebelum menyusun query.
