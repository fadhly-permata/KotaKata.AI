-- ============================================================
-- KotaKata AI — Multi-provider AI config migration
-- ============================================================
-- Format lama: ai_provider_config = { provider, apiKey, model, baseUrl }
-- Format baru: ai_provider_config = { providers: { openrouter: {...}, gemini: {...} }, activeProvider: "openrouter" }
--
-- Migrasi data yang sudah ada: convert single config ke multi format.
-- Aplikasi sudah handle backward compat di kode (read), tapi ini memastikan
-- data di cloud konsisten dengan format baru sejak awal.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/migrations/ai-provider-multi.sql
-- ============================================================

-- Migrate rows yang masih punya format lama (single config object)
-- ke format baru (providers map + activeProvider)
update public.users
set ai_provider_config = jsonb_build_object(
  'providers', jsonb_build_object(
    ai_provider_config->>'provider', ai_provider_config
  ),
  'activeProvider', ai_provider_config->>'provider'
)
where ai_provider_config is not null
  and ai_provider_config ? 'provider'
  and ai_provider_config ? 'apiKey'
  and not (ai_provider_config ? 'providers');
