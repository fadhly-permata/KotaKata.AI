# PLAN-084 — Editor Soal: Tombol Automasi Revisi Soal Via AI (loop revisi → simpan → next)

## Status
PENDING

## Deskripsi (laporan pemilik)
"Buatkan tombol automasi pada form editor soal untuk revisi soal via AI.
Ketika tombol tersebut diklik maka akan otomatis melakukan revisi via AI
(stop automasi kalau bocor), simpan, dan tekan tombol next, repeat."

## Catatan
- Fitur batch: satu tombol menjalankan loop otomatis di atas daftar soal
  halaman editor:
  1. Revisi clue soal aktif via AI (pakai provider BYOK yang sudah ada).
  2. Deteksi "bocor": jika hasil revisi mengandung/membocorkan jawaban
     (kata itu sendiri muncul di clue) → STOP automasi (jangan simpan hasil
     bocor), beri notifikasi.
  3. Simpan soal hasil revisi.
  4. Tekan "next" (navigasi ke soal berikutnya) dan ulangi dari langkah 1.
- Kontrol: tombol toggle Mulai/Hentikan automasi; indikator progress; stop
  juga saat user menekan stop / menutup modal / error berulang.
- Catatan konteks: halaman editor kini server-paged per 50 soal (PLAN-081);
  next di dalam modal bergerak dalam halaman aktif — tentukan perilaku saat
  mencapai akhir halaman (stop dengan ringkasan).

## Langkah pengerjaan
- [ ] Tambah state automasi (running, counter diproses, flag stop).
- [ ] Loop async: requestAiRevision untuk soal aktif → validasi anti-bocor
      (kata tidak boleh muncul di clue_1/2/3, case-insensitive) → simpan via
      RPC update yang ada → navigateToWord(next).
- [ ] Kondisi STOP: hasil bocor, sukses semua di halaman habis, tombol
      ditekan lagi (stop), atau error AI beruntun.
- [ ] UI: tombol toggle + badge jumlah soal yang sudah direvisi otomatis +
      notifikasi ringkasan saat berhenti.
- [ ] Verifikasi: tsc + test + lint, deploy web.
