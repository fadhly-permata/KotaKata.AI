# 🎮 Panduan Pemain — KotaKata.AI

**Teka-Teki Silang Puitis** — isi papan TTS dengan kata-kata Bahasa Indonesia, kumpulkan XP, dan naiki 10 tier puitis dari *Eja Awal* hingga *Keabadian Seloka*.

---

## 📖 Daftar Isi

1. [Memulai](#-memulai)
2. [Halaman Utama](#-halaman-utama)
3. [Cara Bermain](#-cara-bermain)
4. [Kontrol & Navigasi](#-kontrol--navigasi)
5. [Sistem Clue & Hint](#-sistem-clue--hint)
6. [XP & Sistem Tier](#-xp--sistem-tier)
7. [Mode AI (Main Mode AI)](#-mode-ai-main-mode-ai)
8. [Fitur Pendukung](#-fitur-pendukung)
9. [Akun & Data](#-akun--data)
10. [Pengaturan](#-pengaturan)
11. [FAQ](#-faq)
12. [Tips & Strategi](#-tips--strategi)

---

## 🚀 Memulai

1. Buka aplikasi → layar **Masuk**.
2. **Login Google** — game hanya bisa dimainkan oleh user yang login Google (sinkron ke cloud Supabase).
3. Dari layar masuk, tekan **Mulai Bermain** — papan TTS baru langsung digenerate.

---

## 🏠 Halaman Utama

| Tombol / Area | Fungsi |
| :--- | :--- |
| **Mulai Bermain** | Generate papan TTS baru. Jika ada board tersimpan yang belum selesai, ditawarkan untuk dilanjutkan. |
| **Main Mode AI** | Main dengan soal buatan AI dari provider pilihanmu (lihat [Mode AI](#-mode-ai-main-mode-ai)). |
| **Kata Ditemukan** | Riwayat semua kata yang pernah kamu jawab benar (lazy-load per 25). |
| **Sejarah Permainan** | Daftar papan yang sudah kamu selesaikan + viewer papan read-only. |
| **Kata Ajaib** | Popup kata acak + satu clue dari seluruh tier (clue Antonim/Sinonim otomatis disaring). |
| **Profil** | XP, tier, statistik, kelola akun (lihat [Akun & Data](#-akun--data)). |
| **Pengaturan** | Tema, suara, provider AI, log aplikasi (lihat [Pengaturan](#-pengaturan)). |
| **Daftar Tier** | Modal 10 tier dengan highlight tier kamu saat ini + tag "Kamu di sini". |
| **Leaderboard** | Posisimu di antara semua pemain (lihat [Fitur Pendukung](#-fitur-pendukung)). |

Di atas tombol-tombol ada **kartu status** yang menampilkan tier saat ini, progres XP, dan teks seperti *"Dapatkan {X} XP lagi untuk naik ke level"*.

---

## 🎯 Cara Bermain

### Konsep dasar

- Setiap papan berisi minimal 10 kata, tersusun **mendatar** dan **menurun**, saling bersilangan seperti TTS sungguhan.
- Setiap kata punya **3 clue** dengan tingkat kejelasan berbeda (lihat [Sistem Clue & Hint](#-sistem-clue--hint)).
- Kata-kata diambil dari **±10.000 kosakata terkurasi** (1000 kata × 10 tier, bersumber dari KBBI). Papan digenerate prosedural — **tidak ada dua permainan yang sama**.

### Alur satu putaran

1. **Pilih kata** — ketuk salah satu selnya. Panel soal di bawah papan menampilkan nomor, arah (Mendatar/Menurun), dan clue-nya.
2. **Isi huruf** — ketik huruf di sel aktif. Kursor otomatis maju ke sel berikutnya yang masih kosong di kata yang sama.
3. **Selesaikan kata** — begitu semua sel terisi, kata divalidasi otomatis:
   - ✅ **Benar** → huruf terkunci (tidak bisa diubah lagi), bunyi kemenangan, dan kamu dapat **XP**.
   - ❌ **Salah** → bunyi peringatan; kamu bebas menghapus dan mengoreksi.
4. **Selesaikan papan** — semua kata terjawab → overlay hasil: total kata, XP neto sesi (bisa minus kalau penalti hint besar), waktu bermain, dan perubahan tier (naik atau turun).

> 💡 Kata yang **semua hurufnya dibuka lewat Reveal** tetap dihitung selesai (papan tidak macet) tetapi **tidak memberi XP**.

### Reset papan

Di layar permainan, tombol **reset** ada di bar aksi (di samping tombol hide/show keyboard). Reset mengosongkan semua huruf dan menghapus pemakaian hint pada papan itu (XP sesi ikut dikembalikan ke 0).

---

## ⌨️ Kontrol & Navigasi

### Layar sentuh (mobile)

| Aksi | Hasil |
| :--- | :--- |
| Ketuk sel | Pilih kata yang melewati sel itu |
| Ketuk sel yang sama lagi | Pindah ke kata lain di sel itu (mendatar ↔ menurun) |
| Ketuk sel **persimpangan** | Langsung ganti arah (mendatar → menurun atau sebaliknya) |
| Geser (drag) di papan | Kursor mengikuti jari, kata tetap dipilih selama masih di kata yang sama |
| Ketuk tombol **◀ / ▶** di panel soal | Lompat ke kata sebelumnya / berikutnya (kata yang sudah solved dilewati; kata terisi penuh tapi belum benar **tetap bisa difokus**) |
| Keyboard virtual in-game | Ketik huruf; tombol hapus untuk menghapus |

### Keyboard fisik (desktop / web)

| Tombol | Aksi |
| :--- | :--- |
| `A`–`Z` | Masukkan huruf |
| `←` `→` `↑` `↓` | Pindah sel (sel terkunci/blocked otomatis dilewati) |
| `Enter` / `Return` | Ganti arah kata (mendatar ↔ menurun) |
| `Backspace` | Hapus huruf di sel aktif; jika kosong, lompat ke sel sebelumnya |
| `Esc` | Keluar / kembali |

> Navigasi panah tidak akan "nyangkut": sel yang terkunci (dari reveal atau kata solved yang menyilang) dan sel hitam (blocked) dilewati otomatis.

---

## 💡 Sistem Clue & Hint

Setiap kata punya 3 clue yang **selalu berbeda** dan **tidak pernah memuat jawaban** (dijamin oleh pipeline QA clue):

| Hint | Isi | Biaya XP | Catatan |
| :--- | :--- | :--- | :--- |
| **Clue 1** | Definisi utama (tampil default di panel soal) | Gratis | Kadang diawali penanda asal bahasa, mis. *"Kata serapan dari bahasa Belanda: …"* |
| **Clue 2** | Petunjuk tambahan yang lebih jelas | **−50 XP** | Dipotong **hanya saat pertama kali dibuka**; buka ulang gratis |
| **Clue 3** | Petunjuk terjelas (sinonim / deskripsi lengkap) | **−100 XP** | Dipotong hanya saat pertama dibuka |
| **Reveal Letter** | Membuka **1 huruf acak** dan menguncinya | **−75 XP** | Huruf yang di-reveal tidak bisa diedit |

- Semua hint berbayar memerlukan **konfirmasi** sebelum dipakai.
- **Penalti hint bersifat permanen**: XP neto sesi (XP kata − penalti, bisa negatif) dihitung saat papan selesai dan mengurangi total XP akun (di-clamp ≥ 0). Pakai hint berlebihan bisa **menurunkan tier**.
- Kata yang **full-reveal** (semua huruf dibuka via Reveal) tidak memberi XP.

---

## 🏆 XP & Sistem Tier

### Cara mendapatkan XP

Setiap kata benar memberi XP dengan rumus:

```
XP = (25 + (panjang kata − 3) × 5) × pengali tier
```

- **Bonus panjang**: kata 3 huruf = 25 XP dasar; setiap huruf tambahan +5 XP.
- **Pengali tier** makin tinggi seiring naiknya tier kamu (soal di tier tinggi memberi XP lebih besar).

| Tier | Pengali XP |
| :--- | :--- |
| 1 | ×1.0 |
| 2 | ×1.2 |
| 3 | ×1.5 |
| 4 | ×1.8 |
| 5 | ×2.0 |
| 6 | ×2.5 |
| 7 | ×3.0 |
| 8 | ×3.5 |
| 9 | ×4.0 |
| 10 | ×5.0 |

### 10 Tier Puitis

| Tier | Nama | XP Kumulatif Dibutuhkan | Filosofi |
| :--- | :--- | :--- | :--- |
| 1 | **Eja Awal** | 0 | Langkah paling mula; jemari belajar meraba bentuk huruf |
| 2 | **Desau Saujana** | 6.500 | Kata-kata terdengar seperti angin sepoi di kejauhan |
| 3 | **Rima Gerimis** | 16.500 | Ketukan huruf berirama, seperti rintik hujan |
| 4 | **Untai Aksara** | 31.500 | Huruf terberai menjadi jalinan kata yang bernyawa |
| 5 | **Gema Diksi** | 54.000 | Pilihan kata yang tidak lagi biasa |
| 6 | **Raut Metafora** | 88.000 | Memahami kiasan & analogi tersembunyi di balik teks |
| 7 | **Bait Hening** | 139.000 | Kontemplasi mendalam; kesunyian melahirkan kalimat |
| 8 | **Madah Sanubari** | 215.000 | Ungkapan yang mengalir dari kedalaman rasa |
| 9 | **Risalah Langit** | 329.000 | Pemikiran tingkat tinggi dalam merumuskan sandi bahasa |
| 10 | **Keabadian Seloka** | 500.000 | Puncak kebahasaan; menjadi bagian dari karya sastra luhur |

### Naik & turun tier

- **Naik tier** terjadi saat XP kumulatif melewati ambang berikutnya → muncul **notifikasi** (toast) + **overlay perayaan**.
- **Turun tier** bisa terjadi setelah board selesai jika perhitungan XP berubah → notifikasi toast juga muncul.
- Notifikasi tier tampil di **halaman utama** dan **layar permainan**.
- Setelah naik tier, soal-soal papan berikutnya otomatis mengambil kosakata tier yang lebih tinggi (lebih menantang).

> ⚠️ **Mode AI tidak menghitung XP sama sekali** — lihat bagian Mode AI.

---

## 🤖 Mode AI (Main Mode AI)

Main dengan soal yang **dibuat oleh provider AI pilihanmu** (Bring Your Own Key).

### Setup (sekali saja)

1. Buka **Pengaturan → "Tambahkan Provider AI"**.
2. Pilih preset: **OpenRouter**, **HuggingFace**, atau **URL kustom**.
3. Isi **API key** dan **nama model**.
4. Tekan **Tes Koneksi** untuk memastikan key & model valid.
5. Tekan **Simpan**.

> 🔑 **Privasi**: key milikmu (BYOK). Disimpan di perangkat dan di-sync ke profil akunmu (dilindungi RLS — hanya kamu yang bisa membacanya), supaya akun yang sama di perangkat lain **tetap bisa Main Mode AI tanpa set ulang**. Key tidak pernah dikirim ke pihak lain selain provider yang kamu pilih.

### Cara main

1. Tekan **Main Mode AI** di halaman utama.
2. Aplikasi meminta daftar kata + clue ke provider, lalu **divalidasi ketat**:
   - kata hanya huruf a–z, panjang 3–10 huruf;
   - clue **tidak boleh memuat jawaban**;
   - tanpa duplikat.
3. Soal yang lolos digenerate menjadi papan seperti biasa. **Tingkat kesulitan menyesuaikan tier kamu** (prompt memberi panduan kosakata per tier).
4. Jika provider belum diatur → dialog ramah dengan tombol **Atur Sekarang** / **Batal**.

### Aturan khusus Mode AI

| Aturan | Keterangan |
| :--- | :--- |
| 🚫 **Tanpa XP** | Tidak ada XP yang ditambah saat selesai kata, dan tidak ada XP yang dikurangi saat memakai clue/reveal — **semua hint gratis**. |
| 🏷 **Badge "Mode AI"** | Muncul di top bar layar permainan + info eksplisit di layar selesai. |
| 💾 **Perkaya database** | Kata AI yang belum ada di database otomatis disimpan (deduplikasi) → bank kosakata KotaKata terus bertambah untuk semua pemain. |
| 🛟 **Error handling** | Jika provider gagal / respons tidak valid → dialog ramah dengan opsi **Coba Lagi** atau **Main Mode Normal**. Mode normal tidak pernah terpengaruh. |
| 💾 **Progres tersimpan** | Board AI yang belum selesai ikut tersimpan (bertanda mode AI) dan bisa dilanjutkan. |

---

## 🧩 Fitur Pendukung

### 🔍 Kata Ditemukan
Riwayat semua kata yang pernah kamu jawab benar, urut kronologis (lazy-load per 25). Ketuk satu kata untuk melihat 3 clue-nya. Kata yang pernah ditemukan tidak dipakai lagi sebagai jawaban papan berikutnya (agar kamu selalu belajar kata baru).

### 🕹️ Sejarah Permainan
Daftar papan yang sudah selesai (tier, ukuran grid, tanggal selesai). Ketuk satu papan untuk melihat **viewer read-only**: grid persis seperti saat dimainkan — sel hitam, nomor clue selaras, dan daftar soal dikelompokkan **Mendatar** / **Menurun**.

### 🏆 Leaderboard
Lihat posisimu di antara semua pemain:
- Urut berdasarkan **total XP** (terbesar), lalu **waktu kenaikan** terakhir.
- Baris milikmu di-highlight.
- 3 teratas mendapat **medali** 🥇🥈🥉.

### 🎲 Kata Ajaib
Tombol di halaman utama → popup kata acak + satu clue dari seluruh tier. Cocok untuk iseng sambil menunggu, atau menambah kosakata. Clue Antonim/Sinonim otomatis disaring supaya tidak membingungkan.

### 🎧 Efek Suara
Tap tombol, pop huruf, "ding-ding" kata benar, dengung kata salah, fanfare menang, whoosh popup, dan kilau hint — semuanya disintesis & bisa dimatikan di Pengaturan.

---

## 👤 Akun & Data

| Aksi | Lokasi | Cara |
| :--- | :--- | :--- |
| **Keluar Akun** | Profil | Konfirmasi → keluar ke layar Masuk. |
| **Hapus Akun (Permanen)** | Profil | ⚠️ Konfirmasi 2 level: (1) peringatan data hilang permanen → (2) ketik **kode acak 10 huruf** yang ditampilkan. Tombol aktif hanya jika kode cocok (case-insensitive). Menghapus seluruh data cloud (riwayat, board, profil, akun) + data lokal perangkat. |

### Login & sinkronisasi

- **Login Google**: game hanya bisa dimainkan oleh user yang login Google (mulai PLAN-030 mode tamu dihapus). Data tersimpan per akun — bisa diakses dari perangkat mana pun.
- **Offline-first**: progres board dan log tetap jalan saat offline; sinkron otomatis saat online kembali.
- **Auto-save**: progres board disimpan otomatis (500 ms setelah perubahan + saat menutup/refresh/menutup tab). Board yang belum selesai bisa dilanjutkan dari tombol "Mulai Bermain".

---

## ⚙️ Pengaturan

| Panel | Isi |
| :--- | :--- |
| **Tampilan** | Mode Gelap / Terang, Efek Suara on/off. |
| **Provider AI** | Status provider tersimpan (aktif/belum) + tombol "Tambahkan Provider AI". |
| **Log Aplikasi** | Tombol "Lihat Log Aplikasi" → layar log: filter level, tombol **Muat Ulang / Salin / Hapus** di atas, **paging** dengan jumlah baris per halaman custom (25/50/100/200). |
| **Tentang** | Informasi aplikasi & versi. |

---

## ❓ FAQ

**Q: Kenapa kata yang sudah terisi penuh tapi salah tidak dianggap selesai?**
A: Validasi otomatis hanya mengunci kata yang **benar**. Kata salah bebas dikoreksi; tombol navigasi ◀▶ tetap bisa memfokus kata itu supaya mudah diperbaiki.

**Q: Apakah total XP bisa berkurang karena pakai clue?**
A: Ya — penalti clue/reveal itu **nyata**. Neto sesi (XP kata dikurangi penalti) dihitung saat papan selesai dan memotong total XP akun (di-clamp ≥ 0). Hint berlebihan bisa menurunkan tier, jadi pakai sesuai kebutuhan.

**Q: Kenapa ada kata yang clue-nya diawali "Kata serapan dari bahasa …"?**
A: Itu penanda **asal bahasa** — kata serapan asing (Belanda, Inggris, Arab, Sanskerta, dll.) atau kata dari bahasa daerah Nusantara (Jawa, Sunda, Minangkabau, dll.) yang terverifikasi dari KBBI. Menambah wawasan etimologi sambil bermain.

**Q: Mode AI tidak memberi XP — kenapa?**
A: Ini keputusan desain: Mode AI adalah mode eksplorasi/latihan dengan soal tak terbatas dari AI. Agar tidak disalahgunakan untuk "mencuci XP", mode ini **tidak menghitung XP sama sekali** — naik tier hanya dari Mode Normal.

**Q: Kenapa soal di papan baru terasa lebih sulit?**
A: Kemungkinan kamu baru **naik tier**. Papan mengambil kosakata sesuai tier aktifmu (lihat tabel tier). Turun sementara ke tier di bawah jika ingin lebih santai — tapi ingat, XP menyesuaikan.

**Q: Kenapa harus login Google untuk bermain?**
A: Sejak versi terbaru, game hanya bisa dimainkan oleh user yang **login Google** (mode tamu dihapus). Login dibutuhkan supaya progres (XP, tier, riwayat kata, board) tersimpan di akun dan bisa dilanjutkan dari perangkat mana pun.

**Q: Bagaimana cara melaporkan bug?**
A: Buka **Pengaturan → Log Aplikasi → Salin**, lalu kirim isinya bersama deskripsi masalah. Log memudahkan pengembang menemukan akar masalah.

---

## 💡 Tips & Strategi

1. **Mulai dari kata terpanjang** — lebih banyak huruf terkunci membantu menebak kata yang menyilang.
2. **Manfaatkan persimpangan** — satu huruf benar dari kata mendatar sering memberi petunjuk besar untuk kata menurun.
3. **Gunakan hint secara hemat** — Clue 2 (−50) dan Clue 3 (−100) dipotong sekali; simpan untuk kata yang benar-benar mentok. Reveal Letter (−75) paling berguna di 1–2 huruf terakhir.
4. **Jangan korbankan XP demi hint** — di tier tinggi pengali XP besar; satu kata salah koreksi tetap bernilai lebih baik daripada 3 clue.
5. **Mode AI untuk latihan** — mau nambah kosakata tanpa risiko XP? Main Mode AI bebas hint.
6. **Perhatikan penanda asal bahasa** — clue "Kata serapan dari bahasa Inggris" biasanya menjawab kata yang familier dari bahasa Inggris (mis. *kamera*, *komputer*).
7. **Selesaikan board, jangan quit** — XP baru diakumulasi penuh saat board selesai; reset papan mengembalikan hint tapi membuang progres sesi.

---

## 🔗 Referensi

- [README.md](README.md) — ringkasan proyek, tech stack, cara menjalankan
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — riwayat rilis & progres semua plan
