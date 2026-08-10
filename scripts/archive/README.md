# 🗄 Arsip Script — Sekali Pakai (Sudah Dieksekusi)

Folder ini berisi script tooling yang **sudah selesai dieksekusi** dan tidak
lagi dibutuhkan dalam alur kerja rutin. Dipertahankan sebagai referensi &
jejak audit — bisa dipindah kembali ke folder aktif kalau diperlukan.

> Sebelum dipakai ulang, periksa dependensi relatifnya: beberapa file
> memakai import `./...` yang hanya valid jika dipindah bersama-sama.

## Daftar per folder

### `check/` — Verifikasi QA sekali jalan
| File | Tujuan (saat dipakai) |
| :--- | :--- |
| `check-completion.mjs` | Verifikasi board selalu bisa selesai di urutan isi apa pun |
| `check-consistency.mjs` | Cek huruf grid vs `word` di BoardWord hasil generate |
| `check-nav-lock.mjs` | Verifikasi navigasi panah saat ada sel locked/blocked |
| `check-resume-lock.mjs` | Reproduksi bug resume board (serialize → deserialize) |
| `check-tier-order.mjs` | Bandingkan kata tier versi asli vs sekarang |
| `check-variety.mjs` | Ukur variasi kata antar papan (5 papan tier 1) |
| `verify-all.mjs` | QA penuh: unik/duplikat, clue bocor, clue pendek |
| `verify-clues.mjs` | Spot-check kata yang dikeluhkan user di cloud |
| `verify-tier1.mjs` | Spot-check kata tier 1 terkurasi di cloud |
| `verify-full.mjs` | Verifikasi hasil rebuild: 1000/tier, 0 duplikat, tanpa "…" |

### `kbbi/` — Diagnostik data KBBI (sumber `/tmp/kbbi.json`)
| File | Tujuan |
| :--- | :--- |
| `analyze-kbbi.mjs` / `analyze-tier.mjs` | Analisis umum data KBBI / kualitas clue tier |
| `check-examples.mjs` | Hitung entri KBBI dengan contoh & sinonim |
| `check-substring-tmp.mjs` | Leak check ketat (jawaban muncul di token clue) |
| `debug-entry.mjs` | Debug parse satu entri KBBI |
| `diag-kbbi.mjs` / `diag2-4-kbbi.mjs` | Diagnosa filter drop, kegagalan parse, format arti |
| `inspect-kbbi.mjs` | Inspeksi entri KBBI tertentu |

### `vocab/` — Pembangun & perbaiki seed sekali jalan
| File | Tujuan |
| :--- | :--- |
| `build-kbbi-seed.mjs` | Bangun seed vocab awal dari KBBI |
| `build-tier1-curated.mjs` + `tier1-data.mjs` | Seed tier 1 terkurasi (pasangan: pindah bersama) |
| `fix-clues.mjs` / `fix-senses.mjs` | Patch generator clue lama / perbaikan senses |
| `find-bad-clues.mjs` / `dump-leaks.mjs` | Audit clue bermasalah / leak jawaban |
| `count-vocab.mjs` / `clue-stats.mjs` | Statistik jumlah kata / statistik clue |
| `scan-vocab-quality.mjs` | Scan kualitas vocab menyeluruh |
| `fill-placeholders.mjs` / `analyze-placeholders.mjs` | Isi placeholder "Merupakan kata X" (pra-PLAN-007, superseded oleh research-clues.mjs) |
| `list-remaining.mjs` | Daftar kata yang masih bermasalah (pra-PLAN-007) |
| `_debug-*.mjs` / `_audit-*.mjs` / `_analyze-skips.mjs` / `_categorize*.mjs` / `_merge-backup.mjs` / `_probe-placeholders.mjs` / `_scan-quality.mjs` / `_show-weak.mjs` / `_target-count.mjs` / `_bing-test.mjs` | Diagnostik & audit sekali pakai saat membangun research-clues.mjs (PLAN-007) |

## Script aktif saat ini

Lihat `scripts/check/` (check-clue-quality, qa-logic, detect-regional,
verify-origin-prefixes), `scripts/db/`, `scripts/vocab/` (gen-vocab-sql,
add-language-origin, add-regional-origin, fix-tier6-10, manual-tier6-c2c3,
etymology-data), dan `scripts/assets/generate-sfx.mjs`.
