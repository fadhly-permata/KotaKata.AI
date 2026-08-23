# PLAN-090 — Tombol Otomasi Revisi AI Seluruh Soal Per Page

## Status
**PENDING**

## Deskripsi revisi (dari pemilik)
Tambahkan tombol otomasi soal per page (seluruh soal pada halaman editor soal).
- **Posisi tombol**: di samping tombol "Tambah Soal" (header halaman Editor Soal), bukan di dalam modal.
- **Perilaku**: saat diklik, automasi mengerjakan **seluruh soal pada page yang sedang aktif** — revisi via AI → cek bocor → simpan semua hasil → pindah ke **page berikutnya** → ulangi.
- Berbeda dengan ⚡ Automasi yang ada sekarang (PLAN-084) yang jalan dari dalam modal Edit Soal dan berhenti di akhir page; yang ini otomatis lanjut antar-page sampai habis atau dihentikan.

## Revisi tambahan dari pemilik
- Untuk pengerjaan revisi otomasi **bulk** ini, gunakan **max token 200.000** supaya tidak stuck karena budget token reasoning/content kurang saat memproses banyak soal beruntun.

## Rencana pengerjaan (saat disuruh kerjakan)
1. Tambah tombol (mis. "🤖 Automasi Page") di header Editor Soal sebelah tombol "+".
1b. Jalur automasi bulk memakai budget `max_completion_tokens` = 200000 (fallback: batas maksimum yang diterima provider bila 200000 ditolak).
2. Loop: untuk tiap soal di page aktif → requestAiRevision → anti-bocor (stop kalau bocor, tidak simpan) → simpan via RPC `update_vocabulary_admin` → next item.
3. Setelah page habis → fetchPage(page+1) → ulangi, sampai halaman terakhir / user hentikan.
4. Pertahankan jeda 2 detik antar iterasi (PLAN-089) & pengaman error beruntun.
5. UI: indikator progress (page N, soal M/K), toggle stop, ringkasan saat berhenti.
6. Verifikasi tsc/test/lint → commit & push → deploy web dev.
