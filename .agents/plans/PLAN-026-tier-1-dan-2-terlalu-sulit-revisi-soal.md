# Tier 1 & 2 terlalu sulit — cek ulang soal

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 026`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "semua user gua menyatakan permainan pada tier 1 dan 2 sulit banget. Coba cek ulang soal2 nya"

**Status: DONE — selesai dikerjakan (2026-08-16).** Semua tier 1-10 diverifikasi ulang: kata tugas/abstrak/obskur di tier1-2 diganti kata konkret mudah, seluruh clue dicek ulang (0 bocor), SQL di-regenerate 10.000 kata (1000/tier) dan di-push ke Supabase.

## Analisis awal (read-only, 2026-08-16)

**Sumber soal:** `src/data/vocabulary/tier1.ts` … `tier10.ts` (1000 kata/tier, format `[kata, clue_1, clue_2, clue_3]`), di-push ke tabel `vocabulary` di Supabase. Papan dibangun dari pool tier aktif (`selectWordPool` → `getByTierFromCloud`), sampel acak 80 kata → `generateBoard` (urut panjang, kata terpanjang diprioritaskan). **Tidak ada filter kemudahan di dalam tier** — semua kata tier ikut pool.

**Temuan utama — tier 1 & 2 di-seed berdasarkan FREKUENSI kata KBBI, bukan kemudahan ditebak:**
- Komentar di `tier1.ts`: "100 soal TERKURASI + 900 auto dari KBBI, urut berdasarkan frekuensi". Kata paling sering dipakai bahasa Indonesia = **kata tugas (function words)** — dan, bisa, ada, akan, tak, kan, para, per, lah, nak, mau, pada, juga, lagi, saja… Ini **jawaban TTS yang paling sulit**: abstrak, tidak punya gambaran konkret, dan tidak bisa "ditebak" dari definisi.
- Ada banyak entri **pendek/aneh/obskur** di tier 1 yang susah ditebak: tau (huruf Yunani), jim (huruf Arab), dad (huruf Arab), kim (permainan), mark, man, jung, bong, kang, ken, jun, long, los, sok, wang, are, mil, leo, mars, sun, ali, roma, adam, cina, mei, bis, sen, per, lah, tak, kan, nak, para… (sebagian malah nama diri/proper noun yang tidak ideal sebagai soal TTS).
- **Kata 2–4 huruf tanpa bank huruf** sangat sulit: tidak ada redundansi, satu huruf salah = gagal total; tidak ada petunjuk pola huruf yang ditampilkan.
- **Kata ambigu / multi-sinonim**: "bisa" (mampu/sanggup), "tahu" (verba vs makanan), "paus" (hewan vs pemimpin gereja), "bom" (senjata vs kayu penarik pedati), "mars" (baris-berbaris vs planet) — pemain ragu mana yang diminta.
- Tier 2 kemungkinan pola sama (frekuensi), belum dibaca penuh — perlu dicek saat dikerjakan.

**Akibatnya:** bukan clue-nya yang salah/bocor (QA PLAN-003/007/011 sudah 0 issue), tapi **pemilihan kata tier 1–2 yang tidak cocok sebagai soal tebak-tebakan** + tidak ada penyaring kemudahan.

## Rencana perbaikan (usulan, belum disetujui — untuk dikerjakan saat diminta)

1. **Audit & re-seed tier 1 & 2**: ganti kata tugas/obskur dengan kata konkret yang mudah ditebak (benda/aksi/sifat sehari-hari, 4–8 huruf). Bisa dipertahankan sebagian kata frekuensi yang MUDAH (rumah, ikan, air, api, makan, tidur…).
2. **Filter kemudahan di pipeline** (opsional, lebih dalam): tambahkan skor "tebak-ability" (panjang ≥ 4, bukan kata tugas, clue tunggal makna) di `selectWordPool`/generator, atau eksplisitkan daftar kata yang boleh masuk tier 1–2.
3. **Re-generate + re-push SQL** (`scripts/vocab/gen-vocab-sql.mjs` → `scripts/db/push-vocab.mjs`) supaya Supabase sinkron.
4. **QA**: jalankan `check-clue-quality` (0 issue/bocor/duplikat) + uji manual beberapa papan tier 1–2.

## Yang dikerjakan (fase 1 & 2)

1. **Tier 1 di-kurasi ulang total**: 606 kata kurasi + 394 kata mudah tambahan (`tier1-part1.ts`) = 1000 kata konkret sehari-hari (hewan, makanan, benda, kerja dasar, sifat dasar). Tanpa kata tugas, tanpa nama diri, tanpa akronim, tanpa kata asing.
2. **Tier 2-10: swap kata bermasalah** (23+ kata tugas/proper noun/obskur diganti hewan/makanan umum) lewat `fix-plan026.mjs` + `plan026-data.mjs` + `plan026-swap-fix.mjs`.
3. **Fase 2 (`plan026-phase2.mjs`)**: ganti sisa kata tugas abstrak tier2 (tidak, harus, sudah, hanya, semua, … 31 kata) + resolve 371 bentrok antar tier (kata yang sama di tier1 kurasi & tier lama) dengan kata dari pool bebas — tiap tier kembali 1000 kata unik, dedup SQL tidak memangkas tier lain.
4. **QA**: `audit-vocab.mjs` 0 issue semua kategori, `check-clue-quality` 0 issue semua file, `tsc` lolos.
5. **SQL di-regenerate**: 10.000 kata (1000/tier), di-push ke Supabase.

## Langkah

- [x] Audit & re-seed tier 1-2 (ganti kata tugas/obskur dengan kata konkret mudah)
- [x] Perbaiki clue yang tidak nyambung / bocor di semua tier
- [x] Re-generate + re-push SQL ke Supabase (10.000 kata, 1000/tier)
- [x] QA: audit-vocab + check-clue-quality + tsc 0 issue
