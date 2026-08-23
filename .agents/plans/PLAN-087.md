# PLAN-087 — B.AI: dukungan model deepseek-v4-flash (default model + parameter per-model)

## Status
DONE — parameter token berbasis nama model + default model deepseek-v4-flash

## Hasil pengerjaan
- Deteksi parameter kini **berbasis nama model** (regex
  `gpt-5*`/`o1|o3|o4`, termasuk prefiks vendor `vendor/model`) — bukan lagi
  berdasarkan preset provider. Akibatnya `deepseek-v4-flash` di B.AI dikirim
  dengan parameter standar OpenAI (`max_tokens`), sementara `gpt-5.x`/
  o-series tetap memakai `max_completion_tokens` + batas diperbesar.
- Default model preset B.AI diganti menjadi **deepseek-v4-flash**
  (mengikuti pemakaian pemilik).
- Test unit baru: model non-reasoning di preset bai tetap pakai `max_tokens`
  (75 test pass).

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
- [x] Ubah deteksi parameter token menjadi berbasis nama model
      (`max_completion_tokens` hanya untuk gpt-5*/o-series; deepseek-v4-flash
      & lainnya pakai `max_tokens`).
- [x] Evaluasi default model preset B.AI (pertimbangkan deepseek-v4-flash).
- [x] Test unit untuk kasus model non-reasoning di preset bai.
- [x] Verifikasi: tsc + test + lint, deploy web.
