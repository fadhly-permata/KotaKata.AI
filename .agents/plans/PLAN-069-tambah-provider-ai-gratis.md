# PLAN-069 — Tambah Provider AI Gratis + Redesign UI Pemilihan Provider

## Status: done

## Deskripsi Revisi

### Masalah
1. Provider AI yang ada (OpenRouter, HuggingFace, Ollama, LM Studio, Custom) tidak banyak yang
   punya **free tier** — user harus bayar/daftar card dulu.
2. Tombol-tombol provider di UI jadi berantakan kalau banyak provider (saat ini 5, akan lebih).

### Solusi
1. **Tambah provider AI dengan free tier:**
   - **Google Gemini** — free tier murah hati (Gemini 2.0 Flash gratis 15 RPM)
   - **Mistral AI** — free tier ada (Mistral Small)
   - **OpenAI** — GPT-4o-mini murah (bukan free, tapi sangat populer)

2. **Redesign UI pemilihan provider:**
   - Ganti tombol-tombol jadi **dropdown/picker** yang bisa di-scroll dengan grouping
   - Tampilkan: nama provider + badge "✨ Free" kalau ada free tier
   - Group per kategori: "☁️ Cloud (GRATIS)" → "☁️ Cloud (API Key)" → "🖥️ Lokal"

## Provider yang ditambah

| Provider | Free Tier | Base URL | Default Model |
|----------|-----------|----------|---------------|
| **Google Gemini** | ✅ 15 RPM gratis | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| **Mistral AI** | ✅ free tier | `https://api.mistral.ai/v1` | `mistral-small-latest` |
| **OpenAI** | ❌ (murah) | `https://api.openai.com/v1` | `gpt-4o-mini` |

## Langkah Implementasi — Semua Selesai

- [x] 1. Hapus provider Ollama dari `src/utils/aiProvider.ts`
- [x] 2. Hapus Ollama dari `src/features/ai/AiProviderScreen.tsx`
- [x] 3. Tambah preset provider baru (gemini, mistral, openai) di `aiProvider.ts`
- [x] 4. Redesign UI dropdown/picker dengan grouping + badge Free di `AiProviderScreen.tsx`
- [x] 5. Update test unit `aiProvider.test.ts` (7 test baru untuk semua preset)
- [x] 6. Update README.md (provider info + log commands)
- [x] 7. Verifikasi: `bun tsc -b --noEmit` ✅ + `bun test` ✅ (57 pass)
