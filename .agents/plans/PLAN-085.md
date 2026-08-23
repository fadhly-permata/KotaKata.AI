# PLAN-085 — Dukungan Provider AI Baru: api.b.ai (OpenAI-compatible)

## Status
PENDING

## Deskripsi (laporan pemilik)
"Buatkan dukungan provider ai ini:
```
curl -X POST \"https://api.b.ai/v1/chat/completions\" \
  -H \"Authorization: Bearer YOUR_API_KEY\" \
  -H \"Content-Type: application/json\" \
  -d '{
    \"model\": \"gpt-5.2\",
    \"messages\": [ { \"role\": \"user\", \"content\": \"Hello World\" } ],
    \"stream\": true,
    \"temperature\": 0.7,
    \"max_tokens\": 1000
  }'
```"

## Catatan
- Endpoint: `https://api.b.ai/v1/chat/completions` → base URL provider:
  `https://api.b.ai/v1`.
- Autentikasi: `Authorization: Bearer <API_KEY>` (BYOK, sama pola dengan
  preset OpenAI-compatible yang sudah ada).
- Model default dari contoh: `gpt-5.2`; parameter standar OpenAI-compatible
  (messages, temperature, max_tokens; contoh memakai stream=true tapi fitur
  app memakai respons non-stream).
- Kemungkinan besar cukup menambah satu entri preset di daftar provider
  `src/utils/aiProvider.ts` (custom fetch OpenAI-compatible), tanpa logika baru.
- Jangan lupakan jalur terkait: halaman Provider AI (AiProviderScreen) otomatis
  mengikuti daftar preset bila datanya satu sumber.

## Langkah pengerjaan
- [ ] Tambahkan preset provider api.b.ai di daftar preset aiProvider.ts
      (base URL https://api.b.ai/v1, endpoint /chat/completions, Bearer auth,
      default model gpt-5.2).
- [ ] Pastikan muncul di halaman Pengaturan → Provider AI dan bisa dipakai
      Mode AI + Revisi clue (termasuk tombol Automasi PLAN-084).
- [ ] Verifikasi: tsc + test + lint, deploy web.
