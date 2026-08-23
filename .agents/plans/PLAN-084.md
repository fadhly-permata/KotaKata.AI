# PLAN-084 — Editor Soal: Tombol Automasi Revisi Soal Via AI (loop revisi → simpan → next)

## Status
DONE — tombol automasi revisi AI di modal Edit Soal

## Hasil pengerjaan
- Tombol **⚡ Automasi Revisi AI** di bawah tombol Simpan/Revisi manual —
  toggle: saat berjalan berubah jadi **⏹ Hentikan Automasi (N tersimpan)**.
- Loop per soal (mulai dari soal aktif sampai akhir halaman): revisi via AI →
  validasi anti-bocor ganda (flag `leaks` dari AI + pengecekan mandiri kata
  muncul di clue) → **hasil bocor TIDAK disimpan, automasi berhenti** → simpan
  via RPC `update_vocabulary_admin` → next → ulangi.
- Kondisi berhenti: bocor, akhir halaman, tombol ditekan lagi, modal ditutup,
  atau 3 error AI beruntun. Ringkasan selalu muncul di notifikasi.
- Form menampilkan soal yang sedang diproses; tombol manual dinonaktifkan
  selama automasi berjalan.

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
- [x] Tambah state automasi (running, counter diproses, flag stop).
- [x] Loop async: requestAiRevision untuk soal aktif → validasi anti-bocor
      (kata tidak boleh muncul di clue_1/2/3, case-insensitive) → simpan via
      RPC update yang ada → navigateToWord(next).
- [x] Kondisi STOP: hasil bocor, sukses semua di halaman habis, tombol
      ditekan lagi (stop), atau error AI beruntun.
- [x] UI: tombol toggle + badge jumlah soal yang sudah direvisi otomatis +
      notifikasi ringkasan saat berhenti.
- [x] Verifikasi: tsc + test + lint, deploy web.
