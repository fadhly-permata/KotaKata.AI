# PLAN-091 — Automasi Bulk: Batch Semua Soal per Page dalam 1 Request AI

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> proses revisi ai bulk harusnya jangan kirim ke ai satu-persatu soal dan cluenya,
> tapi kirim semua soal yang ada di page. Kalo satu persatu ya tetep lambat.

## Pemahaman
- Saat ini automasi bulk (PLAN-090) memanggil `requestAiRevision` **per soal** —
  walau ada jeda 2 detik, total waktu = jumlah soal × durasi respons model reasoning
  (lambat, deepseek-v4-flash butuh ribuan token reasoning per request).
- Yang diminta: **satu request AI per page** berisi seluruh daftar soal di page itu
  → AI mengembalikan revisi clue untuk SEMUA soal sekaligus (format batch),
  lalu validasi bocor + simpan semua hasil, next page.

## Rencana pengerjaan (belum dieksekusi)
1. Tambah fungsi batch di `src/utils/aiProvider.ts`:
   - Prompt batch: kirim array soal (id/kata/tier/clue saat ini) → minta JSON array
     hasil revisi `{ results: [{ kata/id, clue_1, clue_2, clue_3, leaks }] }`.
   - Budget token besar (200.000 sesuai PLAN-090) karena reasoning untuk
     puluhan soal dalam sekali generate.
2. Refactor loop bulk di `QuestionEditorScreen.tsx`: per page → 1 request batch →
   parse semua hasil → cek bocor per item (item bocor dilewati/ditandai, tidak
   stop keseluruhan bila hanya sebagian) → simpan yang valid via RPC → next page.
3. Progress banner menunjukkan page aktif + jumlah item berhasil.
4. Jalur ⚡ automasi per-soal di modal & revisi manual TIDAK diubah (aturan #5b).
5. Verifikasi tsc/test/lint → commit & push → deploy web dev.

## Catatan
- Parser batch harus toleran terhadap urutan hasil & item gagal parse individual.
- Kalau respons batch terpotong (finish_reason length), naikkan budget / retry.
