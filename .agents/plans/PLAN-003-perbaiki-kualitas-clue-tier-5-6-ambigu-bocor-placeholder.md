# Perbaiki kualitas clue tier 5-6 (ambigu, bocor, placeholder)

<!-- status: done -->
<!-- dibuat: 2026-08-09 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 003`
> (lihat `bun .agents/plans/plan.mjs help`)

## Hasil audit awal (scripts/check/check-clue-quality.mjs)

**Tier 6** — bermasalah serius (837 issue / 1000 baris):
- **"Contoh:" yang memuat kata jawabannya sendiri** (leak langsung) — mis. `seseorang` → "Contoh: tadi ada seseorang menelepon Anda"; `kehidupan`, `terlambat`, `bergabung`, `mempunyai`, `menderita`, `perbedaan`, `terhormat` dan puluhan lainnya. Tidak konsisten: kadang memakai kata utuh, kadang "--".
- **Sisa penanda KBBI bocor ke clue** — mis. `meninggal`: c1 = "[hor] mati; berpulang" (register/etiket KBBI tidak dibersihkan).
- **Label kelas kata nyasar ke tengah definisi** — mis. `ketakutan`: c1 = "…keadaan takut **kata benda keseganan**…", c2 = "kata benda keseganan"; `kelaparan`: "perihal lapar **kata kerja menderita lapar…**"; `kesakitan`: c2 = "kata benda perasaan sakit".
- **Sinonim asal / salah** — mis. `kerusakan`: c3 = "Sinonim: kebejatan" (tidak tepat); `kesakitan`: c3 = "terasa sakit" persis c1 (duplikat).
- **c1 sudah memuat kata sinonim c3** (leak lembut) — mis. `mencintai`: c1 = "…; menyukai" lalu c3 = "Sinonim: menyukai".
- **Placeholder "Merupakan kata X" 17%** (170 baris) — clue lemah/membingungkan.

**Tier 5** — mayoritas rapi, 3 kasus leak lembut (c1/c2 sudah memuat kata sinonim c3, mis. `terlibat` c1 berisi "tersangkut" = c3, `keliling` c1 berisi turunan c3).

## Langkah

- [x] **1. Bangun generator perbaikan tier 5-6 (regenerasi dari KBBI)** — perbaiki `fix-tier6-10.mjs` agar: contoh kalimat yang memuat jawaban dibuang/diganti fragmen deskriptif; penanda KBBI & label kelas kata nyasar dibersihkan; pasangan c2/c3 asli yang valid dipertahankan (merge-safe), hanya yang bermasalah yang diregenerasi.
- [x] **2. Ganti sinonim asal & duplikat** — c2/c3 hanya dipakai kalau benar-benar kata/frasa lain yang setara dan tidak saling memuat; pasangan yang bocor/duplikat ditolak pipeline dan diganti fragmen definisi.
- [x] **3. Kurangi placeholder "Merupakan kata X"** — placeholder diisi contoh pemakaian KBBI (exMatch toleran tag tanpa `</i>`), pemotongan c1 di "; "/", "/" dan "" supaya menyisakan bahan c2/c3; override manual 104 kata miskin bahan (manual-tier6-c2c3.mjs). Tier 6: 36.9% → 24.0%.
- [x] **4. Perbaiki leak lembut tier 1-5** — `fix-tier1-5.mjs` memperbaiki 44 kata (c1/c2 memuat sinonim c3, c1==c3, bocor); tersisa 1 ("memerah") diperbaiki manual.
- [x] **5. Verifikasi kualitas menyeluruh** — SELURUH tier 1-10: **0 issue, 0 bocor jawaban, 0 duplikat**; idempotent (hash sama setelah run ulang); placeholder total turun 2331 → 1996; tsc bersih; jumlah kata per tier tetap 1000 (tier 4 & 5 terpecah part-file tetap total 1000).
- [x] **6. Push ulang ke Supabase** — regenerate `supabase/data/vocabulary.sql` (10000 kata) + upsert via `push-vocab.mjs`; DB terverifikasi: 949 serapan asing + 15 kata daerah = 964 penanda asal bahasa; riwayat word_discoveries aman (UPSERT, bukan TRUNCATE).

## Catatan Revisi

- **6.** 2026-08-09: vocabulary.sql regenerated + di-push (HTTP 201). DB total 10002 = 10000 seed + 2 kata AI (pinta, airan — fitur simpan soal AI, bukan data sisa).
- **5.** 2026-08-09: Semua tier 1-10 lolos 0 issue/0 bocor/0 duplikat. Penanda "Kata serapan dari bahasa" yang sempat hilang saat rewrite tier 6-10 (149 kata) dipulihkan via add-language-origin.mjs → total 949.
- **4.** 2026-08-09: fix-tier1-5.mjs baru (44 kata diperbaiki presisi).
- **3.** 2026-08-09: Placeholder tier 6 turun 36.9%→24.0% via contoh KBBI + pemotongan c1 + 104 override manual. Tier 8-10 tetap tinggi (86%/71%/58%) karena kata ultra-langka berdefinisi tunggal — sudah batas maksimal bahan KBBI.
- **2.** 2026-08-09: Sisa 94 issue "c2 memuat c3" (pasangan placeholder nested) dihilangkan dengan jaring pengaman anti-nested + merge c2/c3 asli yang valid.
- **1.** 2026-08-09: fix-tier6-10.mjs diperkuat: merge-safe (pertahankan c2/c3 asli valid), exMatch toleran missing `</i>`, pemotongan c1 multi-fragment, blok takAda dibersihkan, jaring akhir anti c1==c3 / c2 memuat c3 / c2==c3.
