# PLAN-081 — Editor Soal: Paging Server-Side (load daftar soal lambat)

## Status
DONE — paging server-side di QuestionEditorScreen

## Hasil pengerjaan
`fetchWords` kini hanya menarik PAGE_SIZE (50) baris per halaman UI via
`.range(from, to)` + `{ count: "exact" }`. Filter kata dikirim sebagai
`.ilike("word", %...%)`, filter tier sebagai `.eq("tier_level", n)`. Total
halaman dihitung dari count server; slicing/filter client-side dihapus.
Refetch otomatis saat page / filter / jump-to-page berubah. Load awal kini
±50 baris, bukan ±10.000.

## Deskripsi (laporan pemilik)
"Load daftar soal kok lama banget, emangnya load ga di paging?"

## Analisis penyebab
Fix bug PostgREST 1000-baris (commit `0ab54de`) membuat `fetchWords` menarik
SELURUH isi tabel vocabulary (±10.000 baris) dengan loop `.range()` ke memori,
baru difilter & dipaging di sisi client. Akibatnya waktu muat awal sangat lama.

## Langkah pengerjaan
- [x] Ubah `fetchWords` menjadi query server-side per halaman:
      `.range(from, to)` sesuai ukuran halaman UI + `.count({ head: true, count: "exact" })`
      untuk total halaman.
- [x] Terjemahkan filter ke query server: filter kata → `.ilike("word", ...)` /
      pencarian umum, filter tier → `.eq("tier_level", n)`.
- [x] Hapus filtering/pagination client-side (`filteredWords`, slice manual)
      yang kini redundan; pertahankan urutan sort konsisten (mis. word ASC).
- [x] Refetch otomatis saat page / filter / jump-to-page berubah.
- [x] Pastikan fitur Tambah Soal & Edit tetap me-refetch halaman aktif.
- [x] Verifikasi: tsc + test + lint, deploy web.
