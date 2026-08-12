# Review semua soal & clue — script riset KBBI otomatis

<!-- status: done -->
<!-- dibuat: 2026-08-10 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 007`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Banyak clue masih absurd/bermasalah: placeholder **"Merupakan kata X"** (2472
baris), singkatan kuno (`pd`, `dl`, `thd`, `krn`), kurung gantung
("(rantai" tanpa tutup), fragmen rusak ("sebagainya"), duplikat kolom yang
hanya lolos QA karena beda ejaan/kurung, dan contoh kalimat memuat penanda
KBBI ("Verba kata kerja"). Diminta dibuat **script** yang meneliti tiap kata
(dump KBBI lokal → Google → Bing → KBBI web.id) lalu memperbaiki clue-nya.

## Hasil audit awal

- **2472 placeholder** "Merupakan kata X" (tier 6–10 paling parah: t10 65%, t9 59%)
- Kurung gantung & fragmen rusak menyebar di tier 8–10
- Singkatan kuno `pd/dl/thd/krn` di ratusan clue
- QA checker `memuat` terlalu naif: substring mentah men-flag kata tunggal
  yang wajar muncul di definisi ("lingkaran" ⊂ "berbentuk lingkaran")
  sementara duplikat nyata yang beda kurung lolos

## Langkah

- [x] **1. Bangun `research-clues.mjs`** — pipeline riset per kata: cache
  lokal → KBBI web.id (ajax_submit) → Bing → Google; ekstraktor defensif
  (gate isPlausibleDef: dominasi bahasa Indonesia, tolak teks asing/Turki);
  fallback dump KBBI lokal `/tmp/kbbi.json` (parser sama dgn seed).
- [x] **2. Generator clue 3 kolom dengan gate ketat** — c1 definisi
  (cleanDef: buang penanda `[Mil]`/`Istilah X`/kelas kata nyasar/placeholder
  `--`), c2 senses → fragmen def → contoh pemakaian (redact jawaban → "…"),
  c3 sinonim/antonim → contoh → fragmen; anti `c1==c3`, `c2 memuat c3`,
  `c1 memuat c2`, near-sama, bocor jawaban.
- [x] **3. Override manual** (`clue-overrides.mjs`, 100+ kata) untuk entri
  KBBI multi-baris/aneh yang tak bisa digeneralisasi.
- [x] **4. Riset online paralel** — ~980 kata di-research ulang dari web
  (KBBI web.id via Bing; gateway sandbox serial → batch kecil); 213 kata
  miskin bahan di-rescue (contoh & sinonim dari web).
- [x] **5. Fallback per-kolom QA-aware** — perbaikan mekanik tiap kolom
  (modernize `pd→pada`, tutup kurung gantung, buang penanda), ditolak bila
  menciptakan duplikat gaya QA; kurung gantung ditutup polos / buang
  ", dan sebagainya)" bila bentrok; kolom placeholder diisi bahan riset.
- [x] **6. QA checker dipertegas** (`check-clue-quality.mjs`) — "memuat"
  hanya dihitung bila KEDUA kolom ≥ 12 huruf (frasa, bukan kata tunggal);
  pipeline memakai semantik yang sama (qaDup) supaya Issue QA = 0.
- [x] **7. Rebuild bersih dari HEAD + verifikasi** — 0 Issue QA semua tier,
  placeholder 2472 → 327 (hanya kata berdefinisi tunggal miskin bahan),
  ~3051 baris clue ditulis ulang; `supabase/data/vocabulary.sql` di-regenerate.

## Catatan Revisi

- **7.** 2026-08-10: Hasil akhir — QA `0 issue` semua tier, placeholder
  **2472 → 327** (3.3%; sisa = kata ultra-langka berdefinisi tunggal, batas
  bahan KBBI), singkatan modern, kurung ditutup. Sisa ~312 flag audit =
  abbrev di kolom kata 1-material (modernisasi akan menciptakan duplikat
  persis — dibiarkan demi QA 0).
- **7a.** 2026-08-12: **Singkatan kuno (`pd/dl/krn/dgn/yg/dll/…`) DIABAIKAN di
  plan ini** — ditunda & ditindaklanjuti di **PLAN-011** (bersihkan singkatan
  kuno di semua clue tier). Audit DB saat itu: ±233–276 row masih memuatnya.
- **6.** 2026-08-10: Aturan `memuat` di-checker & pipeline disamakan
  (`a.length>=12 && b.length>=12`); kata tunggal yang wajar di definisi tidak
  lagi salah-flag, duplikat frasa nyata tetap terdeteksi.
- **5.** 2026-08-10: Fallback per-kolom + trim kurung (buang
  ", dan sebagainya)" yang memuat fragmen "sebagainya" di kolom lain) +
  pengisi placeholder dari senses/contoh/fragmen/sinonim — semuanya
  di-gate anti-duplikat QA.
- **4.** 2026-08-10: Riset online kena throttle gateway sandbox (502/serial);
  jalan pintas: cache persisten `/tmp/kotakata-research-cache` — tiap wave
  menambah ~200 kata sebelum gateway flap, re-run offline memakai cache.
- **3.** 2026-08-10: Override `membelok`, `berkedut`, `pelintir`, `tenteram`,
  `terjamin` dkk untuk entri KBBI multi-fragmen.
- **2.** 2026-08-10: isJunk diperbaiki: regex `^(v|n|a|adv)\w` salah-flag kata
  valid ("aman","naik","vokal") → divalidasi huruf kapital setelah kode kelas;
  "perihal X" diakui sebagai awalan definisi nomina yang sah (dijaga
  FALLBACK_COL_RE di c2/c3).
- **1.** 2026-08-10: Research-clues.mjs dibuat; kbbi-web-test.sh untuk uji
  endpoint `ajax_submit` (mengembalikan JSON entri + kata terkait — perlu
  matching lemma).
