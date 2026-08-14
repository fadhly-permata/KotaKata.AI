# Backsound suara latar per tema (URL online)

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 019`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [x] **1. `AmbientSoundSpec` di registry tema** — tiap tema aplikasi (Puitis/Samudra/Senja/Hutan) dapat `ambient: { label, url, volume? }`; URL MP3 online yang sudah diverifikasi (HTTP 200 audio/mpeg): rintik hujan lembut (Puitis), ombak laut (Samudra), jangkrik malam (Senja), hujan di hutan (Hutan).
- [x] **2. Pemutar backsound di `sound.ts`** — `setAmbientSound(spec)`: loop pelan (volume default 0.3), native via expo-audio (`createAudioPlayer` + `loop`), web via `HTMLAudioElement` dengan retry saat gestur pertama (autoplay policy browser); ikut pause saat suara dimatikan (`setSoundEnabled`).
- [x] **3. Wire `ThemeProvider`** — backsound berganti otomatis mengikuti tema aplikasi aktif (di samping `setSoundTheme` yang sudah ada).
- [x] **4. Seed DB** — generator `gen-themes-sql.mjs` membawa `ambient` di dalam jsonb palet (light & dark); `supabase/data/themes.sql` di-regenerate & di-push (terverifikasi: 4 tema app punya backsound).
- [x] **5. Halaman Pasar** — kartu tema aplikasi menampilkan chip "🎵 Backsound: <label>" (dari katalog DB maupun fallback registry lokal).
- [x] **6. Verifikasi** — tsc ✅ · 43 tes ✅ · lint 0 error ✅.

## Catatan Revisi

- Backsound = URL MP3 online dari Mixkit CDN (`assets.mixkit.co/active_storage/sfx/...`, loop siap pakai, lisensi bebas royalti). Ganti URL cukup di `themeData.ts` lalu regenerate seed (`bun scripts/db/gen-themes-sql.mjs`) + push.
- Kebutuhan jaringan: saat offline backsound tidak berbunyi (diam-diam) — game tetap jalan normal, tidak ada error.
