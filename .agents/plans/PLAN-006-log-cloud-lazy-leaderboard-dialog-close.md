# Log Cloud, Kirim Log, Detail Debug, Fix Statistik, Leaderboard Lazy & Dialog Close

<!-- status: done -->
<!-- dibuat: 2026-08-10 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 006`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [x] **1. Beresin warning lint (12 warning `no-unused-vars`)** — bersihkan semua warning lint yang tersisa (12 `no-unused-vars` di `scripts/vocab/*` dsb.) supaya `bun lint` lulus tanpa output warning. Variabel yang benar-benar tidak terpakai dihapus; kalau sengaja dipertahankan (mis. untuk dokumentasi/debug), beri prefix `_` atau tambahkan comment + eslint-disable satu baris. Verifikasi: `bun lint` → 0 problems.

- [x] **2. Tabel baru di Supabase: `user_log_reports`** — buat tabel baru untuk menyimpan data log yang dikirim user dari Halaman Log. Kolom minimum: `id` (uuid pk default gen_random_uuid()), `user_id` (text — identitas guest/akun, nullable), `device_id` (text), `platform` (text), `app_version` (text), `payload` (jsonb — isi log error/warning), `created_at` (timestamptz default now()). Tambahkan RLS: insert diizinkan semua user (untuk guest juga), select hanya untuk owner/anon service. Simpan sebagai migrasi SQL baru di `supabase/migrations/` (mis. `user-log-reports.sql`) + jalankan via `bun scripts/db/apply-supabase-migrations.mjs`.

- [x] **3. Halaman Log: tombol "Kirim Log ke Server"** — tambah tombol di Halaman Log (di baris aksi atas, dekat Muat Ulang/Salin/Hapus). Yang dikirim **hanya entri level `error` dan `warning`** (bukan info/debug). Kirim ke tabel `user_log_reports` via Supabase insert (pakai client yang sudah ada di `src/data/sources/supabase.ts`). Setelah berhasil → feedback sukses (mis. toast/text "Log terkirim ✅"); gagal → pesan error ramah + log lokal. Konfirmasi singkat sebelum kirim (jumlah entri yang akan dikirim).

- [x] **4. Log: detail lengkap untuk debugging (stacktrace + inner exception), tapi TIDAK ditampilkan di aplikasi** — buat log yang ditulis jadi lebih lengkap & detail agar bisa dipelajari penyebabnya: (a) saat `loggerError`/`loggerWarn` menerima Error, simpan **stack trace penuh** (bukan hanya `.message`); (b) jika ada **inner exception / cause** (`err.cause` atau `err.error`), sertakan juga pesan + stack-nya; (c) sertakan konteks berguna: timestamp ISO, platform, versi app (jika tersedia), dan source. **Tampilan di aplikasi (LogViewerScreen) TETAP memakai format sekarang** — detail lengkap hanya disimpan di storage (kolom `details`) dan ikut terkirim ke server, tidak pernah dirender mentah ke user. Verifikasi: tulis error dengan cause → `getLogs` mengembalikan stack trace lengkap; UI tetap ringkas.

- [x] **5. Fix bug Profile: "Kata Terpecahkan" selalu 0** — di `ProfileScreen.tsx` statistik "Kata Terpecahkan" memakai `useGameStore((s) => s.wordsSolved)` (state sesi game yang hanya terisi saat board aktif). Padahal di halaman "Kata Ditemukan" sudah terhitung 404 kata. Ganti sumber datanya menjadi jumlah kata discovery dari cloud: `wordDiscoveryRepository.countByUser(userId)` (sudah ada) — ditampilkan sebagai jumlah kata yang pernah ditemukan user. Perhatikan: untuk guest anonim, hitung dari cloud juga (user_id = identitas guest). Pastikan loading state saat fetch dan fallback ke 0 jika gagal.

- [x] **6. Leaderboard: lazy-load + paging 25 + posisi user di atas tombol Tutup** — popup leaderboard dibuat lazy-load: saat user scroll/swipe sampai baris paling bawah, ambil data berikutnya (paging 25 per muat). Tidak lagi memuat semua user sekaligus. Dan untuk user yang login, kalau posisinya jauh (mis. posisi 100 — tidak terlihat di 25 baris pertama), tampilkan **baris posisi user sendiri di atas tombol Tutup** (mis. kartu "Posisi kamu: #100 — {nama}") supaya selalu terlihat tanpa harus scroll jauh. Query memakai `userRepository.getLeaderboard` (perlu dukungan offset/limit + total rank user).

- [x] **7. Dialog: hapus semua tombol "Tutup", ganti icon [×] + tutup saat tap di luar** — semua dialog/popup yang punya tombol "Tutup" (leaderboard, daftar tier, kata ajaib, dan lain-lain) diganti: (a) tombol teks "Tutup" → **icon [✕] close** yang cantik di pojok kanan atas (konsisten styling, warna sesuai tema, ukuran tap nyaman ≥ 44px); (b) **tap/klik di luar jendela dialog menutupnya** (untuk web/mobile: TouchableOpacity overlay + onRequestClose pada Modal; pastikan tidak menutup saat tap di dalam konten). Buat komponen reusable kalau memudahkan (mis. `CloseButton` + pola overlay tap-outside) supaya konsisten di semua dialog. Jangan sentuh dialog konfirmasi berbahaya (mis. konfirmasi hapus akun/kata kunci) yang butuh konfirmasi eksplisit — hanya dialog info/leaderboard/tier/kata ajaib.

## Catatan Revisi
- _(isi saat dieksekusi)_
