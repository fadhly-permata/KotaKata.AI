# PLAN-089 — Automasi Revisi AI: tambah jeda antar iterasi (provider lambat seperti B.AI)

## Status
DONE — delay 2 detik antar iterasi automasi

## Hasil pengerjaan
Jeda `2.000 ms` ditambahkan antar iterasi loop automasi di
`QuestionEditorScreen.tsx` setelah simpan berhasil. Provider lambat
(deepseek-v4-flash/reasoning model) butuh waktu agar request berikutnya
tidak ditolak/race. Delay diterapkan di semua provider (umum) supaya
tidak fragile terhadap model lain yang juga lambat. 76 test pass.

## Deskripsi (laporan pemilik)
"Respon b.ai itu lambat, untuk otomasi revisi soal, bikin jeda yang beda
dong. Kalo manual bener, tapi kalo otomasi selalu gagal. Mungkin udah
keburu di retry."

## Analisis
- Manual Revisi Via AI berhasil, tapi **⚡ Automasi Revisi AI selalu gagal**
  untuk provider B.AI (deepseek-v4-flash — model reasoning lambat).
- Kemungkinan: automasi loop mengirim request beruntun tanpa jeda → provider
  rate-limit / request sebelumnya belum selesai → response race atau error
  transien yang memicu consecutiveErrors ≥ 3 → automasi berhenti.
- Solusi: tambah delay (mis. 1–2 detik) antar iterasi loop automasi, khusus
  atau umum, supaya provider punya waktu merespons dengan benar.
- Juga perlu dicek saat pengerjaan: apakah ada retry logic internal di
  chatRequest yang bisa bentrok dengan loop cepat.

## Langkah pengerjaan
- [x] Tambah delay (2 detik) antar iterasi loop automasi di
      `QuestionEditorScreen.tsx` setelah simpan berhasil.
- [x] Delay diterapkan untuk semua provider (umum, tidak spesifik model).
- [x] Verifikasi: tsc + test + lint, deploy web.
