# PLAN-093 — Bulk Revisi: Clue Bocor Dikumpulkan & Direvisi Ulang Sendiri (Bukan Semuanya)

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> ketika revisi bulk ada clue yang bocor, sebaiknya di kumpulin jadi satu,
> jangan revisi keseluruhan lagi, cukup yg bocor aja

## Revisi tambahan (dari pemilik, 23 Aug 2026)
> Retry yang bocor dilakukannya pas di halaman yang sama ya, jadi gak akan pindah
> halaman kalo masih ada yang bocor. Infokan ke ai engine kata yang bocor itu apa.
> Jadi ai gak bingung

- **Retry di halaman yang sama**: loop tidak lanjut ke page berikutnya sampai semua
  item di page aktif lolos cek bocor (atau gagal final setelah retry).
- **Beri tahu AI kata yang bocor**: request retry menyertakan info eksplisit per item —
  kata jawaban mana yang muncul di clue_1/2/3 sebelumnya — supaya AI tahu persis
  apa yang harus dihindari.

## Pemahaman
- Saat bulk revisi (PLAN-090/091), kalau ada item yang terdeteksi bocor (kata jawaban
  muncul di clue), sekarang perilakunya berhenti / atau harus mengulang seluruh page.
- Yang diminta: item bocor **dikumpulkan jadi satu daftar**, lalu **hanya item-item itu**
  yang direvisi ulang via AI (retry khusus bocor) — soal yang sudah valid tidak disentuh lagi.

## Rencana pengerjaan (belum dieksekusi)
1. Setelah batch request per page (PLAN-091): validasi bocor per item.
2. Item valid → langsung simpan. Item bocor → masuk daftar `leakedItems` page ini.
3. Jika masih ada yang bocor → TIDAK pindah halaman: kirim SATU request retry khusus
   berisi hanya daftar item bocor, tiap item diberi tahu KATA MANA yang bocor dan di
   clue mana ia muncul, dengan instruksi lebih ketat (kata itu + bentuk turunannya
   TIDAK boleh muncul di clue mana pun).
4. Ulangi validasi; kalau masih ada bocor lagi → retry sekali lagi (maks 2x retry),
   setelah itu baru lanjut halaman & catat sisa bocor ke ringkasan akhir (tidak disimpan).
5. Verifikasi tsc/test/lint → commit & push → deploy web dev.

## Catatan
- Bergantung urutan dengan PLAN-091 (batch per page) — idealnya dikerjakan setelahnya
  atau digabung dalam satu batch pengerjaan bersama PLAN-092 (tombol Stop).
