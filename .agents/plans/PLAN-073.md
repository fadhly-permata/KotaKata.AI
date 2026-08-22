# PLAN-073: Pagination Atas di Editor Soal + Jump ke Halaman

## Status: DONE

> Verifikasi 22 Agustus 2026: fitur SUDAH terimplementasi di commit `53beaf3`
> (pagination atas Prev/jump-input/Next sebelum daftar kata, sinkron dengan
> pagination bawah via state `page` yang sama).

## Deskripsi
Halaman QuestionEditorScreen punya pagination di BAWAH (page navigation).
Tambahkan juga pagination di ATAS halaman supaya admin bisa navigate tanpa
scroll ke bawah.
Tambahkan fitur "jump to page" — input angka untuk langsung ke halaman tertentu.

## Langkah
- [x] Tambah pagination controls di atas halaman (sebelum daftar kata)
- [x] Tambah input/jump-to-page functionality
- [x] Pastikan pagination atas & bawah sinkron
