# PLAN-093 — Bulk Revisi: Clue Bocor Dikumpulkan & Direvisi Ulang Sendiri (Bukan Semuanya)

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> ketika revisi bulk ada clue yang bocor, sebaiknya di kumpulin jadi satu,
> jangan revisi keseluruhan lagi, cukup yg bocor aja

## Pemahaman
- Saat bulk revisi (PLAN-090/091), kalau ada item yang terdeteksi bocor (kata jawaban
  muncul di clue), sekarang perilakunya berhenti / atau harus mengulang seluruh page.
- Yang diminta: item bocor **dikumpulkan jadi satu daftar**, lalu **hanya item-item itu**
  yang direvisi ulang via AI (retry khusus bocor) — soal yang sudah valid tidak disentuh lagi.

## Rencana pengerjaan (belum dieksekusi)
1. Setelah batch request per page (PLAN-091): validasi bocor per item.
2. Item valid → langsung simpan. Item bocor → masuk daftar `leakedItems`.
3. Setelah batch pertama selesai: kirim SATU request retry khusus berisi hanya
   daftar item bocor (dengan instruksi lebih ketat: kata TIDAK boleh muncul di clue).
4. Hasil retry divalidasi lagi; yang masih bocor → dilaporkan di ringkasan akhir
   (tidak disimpan), bukan menggagalkan keseluruhan.
5. Verifikasi tsc/test/lint → commit & push → deploy web dev.

## Catatan
- Bergantung urutan dengan PLAN-091 (batch per page) — idealnya dikerjakan setelahnya
  atau digabung dalam satu batch pengerjaan bersama PLAN-092 (tombol Stop).
