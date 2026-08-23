# PLAN-087 — B.AI: dukungan model deepseek-v4-flash (default model + parameter per-model)

## Status
PENDING

## Deskripsi (laporan pemilik)
"gua pake model deepseek-v4-flash" (konteks: lanjutan PLAN-086, response
kosong pada provider B.AI)

## Catatan
- Pemilik memakai model **deepseek-v4-flash** di provider B.AI — bukan
  default `gpt-5.2` yang saya set.
- Implikasi teknis yang perlu dicek saat pengerjaan:
  1. Fix PLAN-086 mengirim `max_completion_tokens` untuk SEMUA request ke
     preset `bai` (berdasar provider). Model DeepSeek-style kemungkinan besar
     tetap memakai parameter standar OpenAI `max_tokens` — jadi deteksi
     parameter sebaiknya berbasis NAMA MODEL (gpt-5*/o-series =
     `max_completion_tokens`; lainnya = `max_tokens`), bukan berbasis preset.
  2. Pertimbangkan ganti default model preset B.AI menjadi
     `deepseek-v4-flash` (model yang benar-benar dipakai pemilik), atau
     minimal pastikan model ini lolos tanpa perlakukan khusus.
  3. Jika masih kosong: raw respons deepseek bisa punya field berbeda —
     parser `extractContent` sudah multi-format, cukup verifikasi.

## Langkah pengerjaan
- [ ] Ubah deteksi parameter token menjadi berbasis nama model
      (`max_completion_tokens` hanya untuk gpt-5*/o-series; deepseek-v4-flash
      & lainnya pakai `max_tokens`).
- [ ] Evaluasi default model preset B.AI (pertimbangkan deepseek-v4-flash).
- [ ] Test unit untuk kasus model non-reasoning di preset bai.
- [ ] Verifikasi: tsc + test + lint, deploy web.
