# PLAN-079: Editor Soal — Form Filter Collapsible (Kata + Tier)

## Status: DONE

## Deskripsi (dari pemilik)
Editor soal: tambahkan fitur form filter (**collapsible**) yang digunakan
untuk memfilter kata atau tier.

## Langkah
- [x] Buat section collapsible/expandable untuk filter
      (bar "⚙️ Filter" di bawah search bar, toggle buka/tutup + badge jumlah
      filter aktif + tombol reset)
- [x] Field: search by word (text input)
- [x] Field: filter by tier (chips Semua/T1..T10)
- [x] Filter diterapkan pada daftar soal (gabungan dengan search umum,
      halaman otomatis reset ke 1 saat filter berubah)
- [x] Verifikasi: tsc --noEmit ✅ · bun test 69 pass ✅
