# PLAN-081 — Editor Soal: Paging Server-Side (load daftar soal lambat)

## Status
PENDING

## Deskripsi (laporan pemilik)
"Load daftar soal kok lama banget, emangnya load ga di paging?"

## Analisis penyebab
Fix bug PostgREST 1000-baris (commit `0ab54de`) membuat `fetchWords` menarik
SELURUH isi tabel vocabulary (±10.000 baris) dengan loop `.range()` ke memori,
baru difilter & dipaging di sisi client. Akibatnya waktu muat awal sangat lama.

## Langkah pengerjaan
- [ ] Ubah `fetchWords` menjadi query server-side per halaman:
      `.range(from, to)` sesuai ukuran halaman UI + `.count({ head: true, count: "exact" })`
      untuk total halaman.
- [ ] Terjemahkan filter ke query server: filter kata → `.ilike("word", ...)` /
      pencarian umum, filter tier → `.eq("tier_level", n)`.
- [ ] Hapus filtering/pagination client-side (`filteredWords`, slice manual)
      yang kini redundan; pertahankan urutan sort konsisten (mis. word ASC).
- [ ] Refetch otomatis saat page / filter / jump-to-page berubah.
- [ ] Pastikan fitur Tambah Soal & Edit tetap me-refetch halaman aktif.
- [ ] Verifikasi: tsc + test + lint, deploy web.
