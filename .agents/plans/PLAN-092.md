# PLAN-092 — Tombol Automasi Bulk Jadi Stop Saat Berjalan

**Status:** PENDING
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> Ketika sedang berjalan proses revisi ai bulk. Ubah tombolnya jadi stop dong.
> Karna gua gak tau caranya stop nih

## Pemahaman
- Selama automasi bulk (PLAN-090) berjalan, pemilik tidak menemukan cara menghentikannya —
  tombol 🤖 di header seharusnya berubah jadi tombol **⏹ Stop** yang jelas & mudah dilihat.
- Kemungkinan masalah di implementasi saat ini: tombol tidak berubah tampilan saat jalan,
  atau disabled/tertutup banner progres sehingga tidak kelihatan bisa diklik untuk stop.

## Rencana pengerjaan (belum dieksekusi)
1. Pastikan tombol 🤖 header saat `bulkRunning = true`:
   - Berubah jadi **⏹ Stop Automasi** (merah, jelas), tetap aktif/dapat diklik.
   - Tidak tertutup/disabled oleh banner progres.
2. Klik Stop → set flag stop → loop berhenti pada iterasi berikutnya → tampilkan ringkasan.
3. Cek juga jalur ⚡ automasi per-soal di modal punya perilaku stop yang sama jelasnya.
4. Verifikasi tsc/test/lint → commit & push → deploy web dev.

## Catatan
- Bisa digabung dengan PLAN-091 (batch per page) karena menyentuh file & loop yang sama.
