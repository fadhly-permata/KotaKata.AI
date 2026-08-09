# Keluar akun pindah ke Profil + Hapus Akun Permanen

<!-- status: done -->
<!-- dibuat: 2026-08-09 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 004`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [x] **1. Hapus panel "Keluar Akun" dari Pengaturan** — di `SettingsScreen.tsx`, panel "Akun" (yang berisi tombol Keluar Akun + dialog konfirmasinya) dihapus. Panel "Tampilan" (Mode Gelap + Efek Suara), "Log Aplikasi", dan "Tentang" tetap.
- [x] **2. Pindahkan "Keluar Akun" ke halaman Profile** — di `ProfileScreen.tsx` tambah tombol "Keluar Akun" (dengan ConfirmDialog seperti yang dulu ada di Settings): konfirmasi → `signOut()` → reset store game → kembali ke layar Auth. Hanya tampil untuk user yang login (bukan guest anonim? — putuskan: guest juga boleh keluar, atau sembunyikan; default: tampil untuk semua, karena guest bisa logout juga).
- [x] **3. Hapus panel "Data" dari Pengaturan** — panel yang berisi tombol "Hapus Data Lokal" dihapus seluruhnya (tombol itu memang belum berfungsi).
- [x] **4. Fitur "Hapus Akun (Permanen)" di Profile** — tombol baru (gaya danger). Alur: tap → **Konfirmasi level 1** (peringatan data akan hilang permanen) → **Konfirmasi level 2**: aplikasi generate **10 huruf acak** (mis. "H-X-K-Q-P-M-B-A-Z-L"), user harus mengetikkannya, hasil di-komparasi (case-insensitive). Kalau tidak cocok → tombol hapus nonaktif + hint. Kalau cocok → jalankan penghapusan.
- [x] **5. Penghapusan data user (backend Supabase)** — karena klien anon tidak boleh menghapus `auth.users`, buat **RPC `delete_user_data()`** (security definer, di `supabase/`): hapus `word_discoveries`, `saved_boards`, `users` milik `auth.uid()`, lalu hapus user di `auth.users`. App memanggil RPC → `signOut()` → reset store → bersihkan data lokal (AsyncStorage: session, progres, identitas device) → navigasi ke Auth.
- [x] **6. Validasi** — `bun tsc --noEmit` bersih; SQL RPC idempotent & aman (user lain tidak terpengaruh); alur di-preview: keluar akun dari Profil, hapus akun dengan kode acak (salah & benar).

## Catatan Revisi
- **5.** 2026-08-09: RPC delete_user_data() (security definer) dihapus word_discoveries+saved_boards+users (user_id TEXT) lalu auth.users (UUID) milik auth.uid(); anon di-revoke eksplisit, hanya authenticated yang boleh execute. App: RPC → clearDeviceId (guest berikutnya mulai nol) → signOut (error diabaikan) → reset store → navigasi Auth. SQL sudah di-apply ke Supabase (HTTP 201, ACL terverifikasi).

- **4.** 2026-08-09: Konfirmasi 2 level: level 1 ConfirmDialog peringatan, level 2 modal dengan kode 10 huruf acak (tanpa I/O biar tidak ambigu), input auto-uppercase maxLength 10, tombol hapus aktif hanya jika cocok case-insensitive. Kode baru digenerate setiap dialog dibuka.
