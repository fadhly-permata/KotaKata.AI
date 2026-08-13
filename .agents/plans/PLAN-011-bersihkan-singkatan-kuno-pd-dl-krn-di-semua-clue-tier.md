# Bersihkan Singkatan Kuno (pd/dl/krn) di Semua Clue Tier

<!-- status: done -->
<!-- dibuat: 2026-08-12 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 011`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

PLAN-007 selesai dengan sisa yang sengaja ditunda: singkatan kuno
(`pd`, `dl`, `krn`, `dgn`, `yg`, `sbg`, `dr`, `tt`, `kpd`, `tsb`, `spt`,
`ud`, `msl`, `sdh`, `dll`, `dsb`, `thd`, `utk`) masih tersisa di sebagian
clue. Audit langsung ke Supabase (2026-08-12):

- **233 row** memuat `pd`/`dl` di salah satu kolom clue (audit lebih luas
  dgn pola `pd|dl|krn|dgn|yg|sbg|dr|tt|kpd|tsb|spt|ud|msl|sdh|dll|dsb|thd|utk`
  sebelumnya mencatat ±276–312 flag).
- Contoh nyata yang masih terlihat di DB:
  - `betatron` c1: "peranti pemercepat elektron **dl** rongga berbentuk cincin…"
  - `bikonkaf` c3: "cekung **pd** kedua sisinya…"
  - `biomassa` c1: "jumlah keseluruhan benda hidup **dl** suatu perairan"
  - `biometri` c1: "pengukuran yang dilakukan **pd** proses biologis"
- Alasan dulu dibiarkan (catatan PLAN-007): modernisasi `pd→pada` / `dl→dalam`
  pada kolom yang bahan definisinya tipis bisa menciptakan duplikat persis
  antar kolom (bentrok QA "memuat"). Karena itu penanganan butuh riset
  pengganti, bukan sekadar find-replace mekanik.

Sasaran plan ini: **semua singkatan kuno di clue 1/2/3 hilang** (diganti kata
baku / frasa pengganti), tetap dengan QA 0 issue / 0 bocor / 0 duplikat —
mengikuti pipeline riset KBBI yang sudah dibangun di PLAN-007.

## Langkah

- [x] **1. Audit lengkap & daftar target** — query semua row yang clue 1/2/3
  memuat salah satu singkatan kuno (regex kata utuh), klasifikasikan per tier
  dan per kolom; simpan daftar target + contoh clue saat ini ke file report.
  Hitung ulang angka pastinya (bukan hanya `pd`/`dl`).

- [x] **2. Bangun skrip modernisasi bertahap** — perluas/reuse pipeline
  `research-clues.mjs` (PLAN-007): untuk tiap row target, (a) ganti mekanik
  aman: `pd→pada`, `dl→dalam`, `krn→karena`, `dgn→dengan`, `yg→yang`,
  `sbg→sebagai`, `dr→dari`, `tt→tentang`, `kpd→kepada`, `tsb→tersebut`,
  `spt→seperti`, `ud→sudah`, `msl→misalnya`, `sdh→sudah`, `dll/dsb`,
  `thd→terhadap`, `utk→untuk`; (b) bila hasil modernisasi **menciptakan
  duplikat persis / substring** dengan kolom lain (bentrok QA) → riset
  pengganti via KBBI/dump lokal (sumber yang sama dgn PLAN-007) untuk kolom
  tersebut; (c) bila kata ultra-langka tanpa bahan pengganti → fallback
  perbaikan manual `clue-overrides.mjs` (tambahkan entri).

- [x] **3. Jalankan, verify QA, regenerate SQL** — jalankan skrip terhadap
  semua tier, pastikan `check-clue-quality.mjs` tetap **0 issue / 0 bocor /
  0 duplikat**, regenerate `supabase/data/vocabulary.sql`.

- [x] **4. Push ke Supabase + verifikasi final** — `node scripts/db/push-vocab.mjs`
  (UPSERT — riwayat `word_discoveries` aman), lalu query ulang: singkatan
  kuno = **0**, pola "Merupakan kata X" tetap 0, total row tetap 10.003+.

## Catatan Revisi

- (belum ada)
