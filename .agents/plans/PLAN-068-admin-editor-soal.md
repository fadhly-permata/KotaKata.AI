# PLAN-068: Admin Editor Soal

**Status:** pending

## Deskripsi Revisi

User tertentu dengan akun Google bernama **"Fadhly Permata"** (email: `fadhly.permata@gmail.com`) adalah **admin**. Untuk admin, tambahkan fitur **Editor Soal**.

### Fitur yang diminta:

1. **Sistem Admin**
   - Deteksi user login: jika `display_name === "Fadhly Permata"` DAN `email === "fadhly.permata@gmail.com"` → admin
   - Hanya admin yang melihat tombol "Editor Soal" di Halaman Utama

2. **Halaman Utama (admin-only)**
   - Tombol baru "Editor Soal" — hanya terlihat oleh admin

3. **Halaman Editor Soal**
   - **Daftar soal**: tampilkan seluruh kosakata dari database (10.000 kata), dengan fitur **search/filter**
   - **Form editor**: ketika salah satu soal diklik → buka form edit (word, clue_1, clue_2, clue_3, tier)
   - **Tombol "Revisi Via AI"**: AI membantu merevisi clue yang dipilih, user cukup review hasilnya
   - **Tema**: halaman ini mendukung penggantian tema sesuai pilihan user (ikuti tema app yang aktif)

### Catatan Teknis:
- Data kosakata diambil dari tabel `vocabulary` di Supabase
- Admin check dilakukan di sisi klien berdasarkan user profile dari Supabase Auth
- AI revision: gunakan provider AI yang sudah dikonfigurasi user (sama seperti Mode AI)
- Halaman baru di bawah `/src/features/` atau `/src/presentation/`
