# PLAN-074: Implementasi Vercel AI SDK (BYOK)

## Status: PENDING

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
