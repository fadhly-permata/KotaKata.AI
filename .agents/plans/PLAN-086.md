# PLAN-086 — Bug: Provider B.AI selalu mengembalikan response kosong

## Status
PENDING

## Deskripsi (laporan pemilik)
"Provider b.ai kok selalu response kosong ya"

## Catatan
- Preset B.AI baru ditambahkan di PLAN-085 (commit `3a36951`): base URL
  `https://api.b.ai/v1`, endpoint `/chat/completions`, default model
  `gpt-5.2`, OpenAI-compatible.
- "Response kosong" bisa terjadi di Tes Koneksi maupun saat meminta soal —
  perlu didiagnosis dengan melihat RAW response dari API.
- Hipotesis awal (verifikasi saat pengerjaan):
  1. Model `gpt-5.2` mungkin tipe *reasoning* — konten jawaban bisa kosong di
     `choices[0].message.content` dan berpindah ke field lain
     (`reasoning_content` dsb.), atau butuh `max_tokens` lebih besar.
  2. Format respons bisa sedikit berbeda dari OpenAI standar (mis. wrapper
     berbeda / field kosong saat stream tidak diminta).
  3. Endpoint `/chat/completions` mungkin menuntut header/parameter tambahan.
- Diagnosis yang benar: tambahkan logging raw body (di-mask untuk UI) atau uji
  langsung endpoint dengan curl + key pemilik untuk melihat bentuk respons asli,
  lalu sesuaikan parser.

## Langkah pengerjaan
- [ ] Reproduksi: panggil api.b.ai dengan format permintaan yang sama seperti
      yang dikirim app; catat raw response (status, struktur JSON).
- [ ] Sesuaikan parser aiProvider.ts agar menangkap konten dari bentuk respons
      B.AI yang sebenarnya (termasuk kemungkinan reasoning model).
- [ ] Pastikan Tes Koneksi & permintaan soal sama-sama berjalan; jalur provider
      lain TIDAK berubah.
- [ ] Verifikasi: tsc + test + lint, deploy web.
