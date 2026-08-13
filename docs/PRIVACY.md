# Kebijakan Privasi KotaKata.AI

_Terakhir diperbarui: 13 Agustus 2026_

Kebijakan Privasi ini menjelaskan data apa saja yang dikumpulkan aplikasi **KotaKata.AI**, bagaimana data digunakan, dan hak Anda atas data tersebut.

## 1. Data yang Kami Kumpulkan

### Data akun
- **Guest (anonim):** kami membuat **UUID perangkat** yang disimpan lokal di perangkat Anda sebagai jangkar identitas. UUID ini tidak memuat informasi pribadi (bukan MAC/IMEI) dan tidak meminta permission apa pun.
- **Login Google/email:** nama tampilan, alamat email, dan foto profil (jika diizinkan oleh penyedia login Anda) yang dikembalikan oleh Google.

### Data permainan
- Total XP, tier saat ini, dan riwayat perubahan tier.
- **Kata Ditemukan:** daftar kata yang pernah Anda jawab benar (untuk menampilkan riwayat dan menghindari soal berulang).
- **Sejarah Permainan:** papan yang sudah Anda selesaikan (grid, jawaban, waktu, tier).
- **Papan tersimpan:** progres papan yang belum selesai (auto-save).
- **Laporan log:** entri log level *error/warning* yang Anda kirimkan secara manual lewat halaman **Pengaturan → Log Aplikasi → Kirim Log**, termasuk platform, versi aplikasi, dan pesan error (untuk debugging).

### Data Mode AI
- Konfigurasi penyedia AI (nama penyedia, nama model, dan **API key milik Anda**) — hanya digunakan untuk memanggil penyedia AI yang Anda pilih.
- Kata yang dihasilkan AI dan belum ada di database ikut disimpan (tanpa informasi pribadi) untuk memperkaya bank kosakata.

## 2. Bagaimana Data Digunakan

- Menjalankan dan menyinkronkan progres game lintas perangkat.
- Menampilkan leaderboard (XP publik antar pemain — ditampilkan dengan nama tampilan Anda).
- Memperbaiki bug dan meningkatkan kualitas konten (via laporan log dan kurasi kosakata).
- Menyediakan fitur Mode AI sesuai konfigurasi Anda.

Kami **tidak** menjual data pribadi Anda kepada pihak mana pun.

## 3. Tempat Data Disimpan

- **Cloud:** data akun & permainan disimpan di **Supabase** (PostgreSQL + Auth) dengan keamanan baris (RLS) — hanya Anda (dan akun Anda) yang bisa membaca/mengubah data Anda.
- **Lokal:** identitas perangkat, sesi, dan log disimpan di perangkat Anda (AsyncStorage / sql.js).

## 4. Laporan Log & Retensi

- Laporan log hanya berisi level *error/warning* dan dikirim **secara manual** oleh Anda.
- Laporan log otomatis dihapus setelah **30 hari** (job pembersihan berkala).
- Mengirim laporan memerlukan sesi login; akun yang dihapus ikut menghapus seluruh laporan log miliknya.

## 5. Pihak Ketiga

- **Google** — login OAuth (data yang Anda pilih untuk dibagikan saat login).
- **Supabase** — autentikasi, database, dan hosting data.
- **Penyedia AI** (OpenRouter, HuggingFace, atau URL kustom) — hanya menerima permintaan soal yang Anda aktifkan; API key Anda dikirim langsung ke penyedia tersebut, tidak melalui pihak lain.

## 6. Hak Anda

- **Akses data:** halaman Profil menampilkan data akun Anda (XP, tier, riwayat).
- **Hapus akun permanen:** halaman **Profil → Hapus Akun (Permanen)** menghapus seluruh data cloud (profil, riwayat kata, papan tersimpan, laporan log) dan akun Anda. Data lokal perangkat juga dibersihkan.
- **Keluar:** halaman **Profil → Keluar Akun** mengakhiri sesi tanpa menghapus data.

## 7. Keamanan

Kami menggunakan autentikasi Supabase, RLS (Row Level Security) di database, dan praktik penyimpanan kredensial yang aman. Tidak ada sistem yang 100% aman; mohon gunakan kata sandi/login yang kuat dan jangan bagikan akun Anda.

## 8. Perubahan Kebijakan

Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan signifikan akan diumumkan melalui aplikasi. Tanggal pembaruan terakhir selalu ditampilkan di bagian atas dokumen ini.

## 9. Kontak

Pertanyaan terkait privasi dapat disampaikan melalui halaman **Pengaturan → Log Aplikasi** (laporan teknis) atau kanal kontak resmi KotaKata.AI.
