# PLAN-086 — Bug: Provider B.AI selalu mengembalikan response kosong

## Status
DONE — parser aiProvider tahan model reasoning + param token baru

## Hasil pengerjaan
Tiga penyebab "response kosong" di B.AI/gpt-5.2 dibereskan di
`chatRequest` (`aiProvider.ts`):
1. **Parameter token**: model generasi baru OpenAI (o-series, gpt-5.x)
   tidak menerima `max_tokens` — kini model bergaya reasoning (preset `bai`
   atau model `gpt-5*`/`o1/3/4*`) dikirim dengan `max_completion_tokens`
   (dilipatgandakan ×8 karena token reasoning ikut dihitung).
2. **Ekstraksi konten multi-format** (`extractContent`): fallback ke
   `message.reasoning_content` saat `content` kosong, dukung content berbentuk
   array of parts, dan `choices[0].text` format lama.
3. **Pesan error diagnostik**: bila tetap kosong, error menyebut
   `finish_reason` (mis. `length` = token habis) supaya jelas penyebabnya.
Jalur provider lain tidak berubah. 4 test unit baru (74 pass).

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
- [x] Reproduksi & analisis bentuk respons model reasoning vs parser lama.
- [x] Sesuaikan parser aiProvider.ts agar menangkap konten dari bentuk respons
      B.AI yang sebenarnya (termasuk kemungkinan reasoning model).
- [x] Pastikan Tes Koneksi & permintaan soal sama-sama berjalan; jalur provider
      lain TIDAK berubah.
- [x] Verifikasi: tsc + test + lint, deploy web.
