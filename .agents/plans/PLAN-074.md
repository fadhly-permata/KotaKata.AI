# PLAN-074: Implementasi Vercel AI SDK (BYOK)

## Status: CANCELLED

> Dibatalkan oleh pemilik (22 Agustus 2026): "hapus aja deh fitur vercel-nya".
> Implementasi Vercel AI SDK di rollback ke custom fetch (sebelum commit
> `53beaf3`) dan dependensi `ai` + `@ai-sdk/openai-compatible` dihapus.
> Alasan: dicurigai jadi pemicu APK blank putih (PLAN-076) karena ikut jalur
> startup di Hermes.

## Deskripsi
Ganti implementasi AI provider dari custom fetch ke Vercel AI SDK (`ai` package).
Tetap gunakan konsep BYOK — API key user yang dipakai.
`@ai-sdk/openai-compatible` bisa dipakai untuk semua provider OpenAI-compatible.

## Referensi
- https://ai-sdk.dev/providers/openai-compatible-providers
- Package: `ai`, `@ai-sdk/openai-compatible`

## Langkah
- [ ] Install `ai` + `@ai-sdk/openai-compatible`
- [ ] Refactor aiProvider.ts: gunakan `generateText` dari AI SDK
- [ ] Update provider preset → gunakan `createOpenAICompatible`
- [ ] Verify tsc + tests
- [ ] Deploy
