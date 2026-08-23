# PLAN-094 — Bulk Automasi: Popup Konfirmasi 5 Detik Sebelum Next Page

**Status:** DONE ✅ (23 Aug 2026)
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> ketika otomasi bulk, sebelum pindah ke next page untuk melakukan revisi lagi,
> tampilkan popup konfirmasi 5 detik untuk stop. Kalo user gak pencet maka
> lanjutkan prosesnya.

## Pemahaman
- Di akhir tiap page (setelah semua soal valid tersimpan / retry bocor habis),
  automasi bulk menampilkan popup/modal konfirmasi berhitung mundur 5 detik:
  ada tombol **Stop** dan indikator otomatis lanjut.
- Kalau user tidak menekan apapun dalam 5 detik → automasi lanjut ke page
  berikutnya sendiri.
- Kalau user menekan Stop (atau ⏹ di header) → automasi berhenti dengan ringkasan.

## Rencana pengerjaan (belum dieksekusi)
1. Tambah state `pauseConfirmVisible` + hitungan mundur di QuestionEditorScreen.
2. Setelah loop while per page selesai (belum stopReason), tampilkan modal 5 detik;
   await hasilnya: "stop" → break, timeout → lanjut.
3. Modal wajib bisa dibatalkan via ⏹ header juga; jangan blok UI lain saat popup tampil.
4. Verifikasi tsc/test/lint → commit & push → deploy web dev.

## Catatan
- Hanya jalur bulk (PLAN-090+) yang kena — jalur ⚡ per-soal & revisi manual tidak diubah.

## Hasil pengerjaan (DONE 23 Aug 2026)
- Popup `ConfirmDialog` di akhir tiap page (kecuali page terakhir): hitung mundur
  5 detik, tombol **⏹ Stop Sekarang** / **▶️ Lanjut (Ns)**.
- Timeout tanpa aksi → lanjut otomatis ke page berikutnya; Stop → ringkasan akhir.
