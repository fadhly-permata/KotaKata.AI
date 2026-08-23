# PLAN-082 — Editor Soal: Hapus Textbox Global Search (duplikat filter collapsible)

## Status
DONE — search bar global dihapus

## Hasil pengerjaan
Textbox "Cari soal..." global, state `search`, cabang filternya di useMemo,
serta styles `searchWrap`/`searchInput` dihapus. Satu-satunya jalur
pencarian sekarang adalah form filter collapsible (PLAN-079) yang filternya
dikerjakan di server (PLAN-081).

## Deskripsi (laporan pemilik)
"Kenapa textbox global search gak dihapus aja, kan kita udah punya form
search (collapsible)?"

## Analisis
Halaman editor punya dua jalur pencarian yang tumpang-tindih:
1. Textbox global "Cari soal..." di bawah header (state `search`) — mencari
   kata/clue/tier di seluruh hasil.
2. Form filter collapsible (PLAN-079): input filter kata + chips tier.

Yang diminta pemilik: pertahankan #2, hapus #1.

## Langkah pengerjaan
- [x] Hapus UI search bar global (searchWrap/searchInput + tombol clear ×).
- [x] Hapus state `search` dan cabang filternya dari `useMemo` filteredWords
      (menyesuaikan juga hasil refactor PLAN-081).
- [x] Rapikan styles yang tidak terpakai (searchWrap, searchInput).
- [x] Pastikan satu-satunya jalur pencarian = form filter collapsible.
- [x] Verifikasi: tsc + test + lint, deploy web.
