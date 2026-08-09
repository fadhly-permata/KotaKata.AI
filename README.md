# 📖 KotaKata.AI

**Teka-Teki Silang Puitis — Dynamic Crossword Game (Cross-Platform)**

KotaKata.AI adalah game Teka-Teki Silang (TTS) modern dengan sistem peringkat puitis 10 tier. Papan permainan digenerate secara prosedural dari kosakata Bahasa Indonesia yang telah dikurasi, dan setiap permainan selalu berbeda. Satu basis kode untuk Android, iOS, Windows, Linux, dan Web.

## ✨ Fitur

| Fitur | Deskripsi |
| --- | --- |
| 🎮 **Papan Prosedural** | Setiap board digenerate client-side dari kosakata terkurasi; grid fleksibel dengan minimal 10 soal per papan |
| 📴 **Offline-First** | Progress board + log tersimpan lokal (AsyncStorage + sql.js), sinkron ke cloud saat online |
| ☁️ **Cloud Sync** | Supabase Auth + PostgreSQL + RLS; riwayat kata, XP, dan board tersimpan per user |
| 🏆 **10 Tier Puitis** | Dari *Eja Awal* hingga *Keabadian Seloka* — progres XP naik lewat menyelesaikan kata |
| 👤 **Identitas Guest** | Guest anonim memakai UUID perangkat sebagai jangkar identitas (tanpa permission MAC/IMEI) |
| ✨ **Kata Ajaib** | Popup kata acak + clue (otomatis mengecualikan clue sinonim/antonim) |
| 🔍 **Kata Ditemukan** | Riwayat kata yang pernah ditemukan, lazy-load per 25 data |
| 🕹️ **Sejarah Permainan** | Daftar papan yang sudah diselesaikan + viewer papan read-only bergaya crossword |
| 🌗 **Tema Terang/Gelap** | Transisi halus, konsisten di semua layar |
| ⌨️ **Keyboard & Touch** | Mobile touch + desktop arrow keys, keyboard virtual in-game |
| ✨ **Animasi** | Parallax + orb floating di main menu, transisi halaman & popup beranimasi |

## 🏆 Sistem Peringkat

| Tier | Nama | Tier | Nama |
| :--- | :--- | :--- | :--- |
| 1 | **Eja Awal** | 6 | **Raut Metafora** |
| 2 | **Desau Saujana** | 7 | **Bait Hening** |
| 3 | **Rima Gerimis** | 8 | **Madah Sanubari** |
| 4 | **Untai Aksara** | 9 | **Risalah Langit** |
| 5 | **Gema Diksi** | 10 | **Keabadian Seloka** |

## 🎮 Cara Main

1. **Mulai Bermain** — papan TTS digenerate prosedural dari ±10.000 kosakata terkurasi (1000 kata × 10 tier, 3 clue per kata). Setiap permainan selalu berbeda.
2. **Isi sel** — ketuk sel untuk memilih kata, ketuk lagi untuk ganti arah (mendatar/menurun). Ketik huruf via keyboard virtual (mobile) atau keyboard fisik (desktop/web: huruf + panah ⬅➡⬆⬇, ⏎ ganti arah, ⌫ hapus).
3. **Selesaikan kata** — kata yang terisi penuh divalidasi otomatis: benar → terkunci + bunyi kemenangan + XP; salah → dengung peringatan, boleh dikoreksi.
4. **Naikkan tier** — setiap kata benar memberi XP (`25 + (panjang kata − 3) × 5`, dikali pengali tier 1×–5×). Saat XP cukup, tier naik (notifikasi + overlay perayaan); tingkat kesulitan soal ikut menyesuaikan.

### 💡 Sistem Clue & Hint

Setiap kata punya 3 clue yang selalu berbeda dan tidak pernah memuat jawaban:

| Hint | Efek | Biaya XP |
| :--- | :--- | :--- |
| **Clue 1** | Tampil default di panel soal | Gratis |
| **Clue 2** | Petunjuk tambahan lebih jelas | −50 XP |
| **Clue 3** | Petunjuk terjelas (sinonim/deskriptif) | −100 XP |
| **Reveal Letter** | Membuka 1 huruf acak (sel terkunci) | −75 XP |

> Clue 2/3/Reveal memerlukan konfirmasi sebelum dipakai. Kata serapan asing & kata daerah diberi penanda asal bahasa (mis. "Kata serapan dari bahasa Belanda") di clue pertama.

### 🏆 Fitur Pendukung

- **Daftar Tier** — tombol di halaman utama: 10 tier dengan highlight tier kamu saat ini.
- **Leaderboard** — lihat posisimu antar pemain (urut total XP, lalu waktu kenaikan); 3 teratas dapat medali.
- **Kata Ditemukan** — riwayat kata yang pernah kamu selesaikan (lazy-load per 25).
- **Sejarah Permainan** — daftar papan selesai + viewer read-only (sel hitam, nomor clue, grup Mendatar/Menurun).
- **Kata Ajaib** — popup kata acak + clue dari seluruh tier (clue Antonim/Sinonim dikecualikan).
- **Auto-save** — progres board tersimpan otomatis (500 ms setelah perubahan + saat menutup/refresh); board belum selesai bisa dilanjutkan dari "Mulai Bermain".
- **Guest & Akun** — main tanpa akun (identitas per perangkat) atau login Google/email; progres tersinkronisasi cloud. "Hubungkan Akun" (Profil) menyatukan data guest ke akun permanen.

## 🤖 Mode AI (Main Mode AI)

Main dengan soal yang dibuat AI dari provider pilihanmu (**Bring Your Own Key**):

1. **Atur provider** — Pengaturan → "Tambahkan Provider AI". Pilih preset **OpenRouter**, **HuggingFace**, atau **URL kustom**, isi API key + nama model, lalu **Tes Koneksi** dan **Simpan**.
2. **Main** — tombol "Main Mode AI" meminta soal ke provider, divalidasi ketat (kata 3–10 huruf, clue tidak memuat jawaban, tanpa duplikat), lalu digenerate menjadi papan seperti biasa. Tingkat kesulitan soal menyesuaikan tier kamu.
3. **Tanpa XP** — Mode AI tidak menghitung XP sama sekali: tidak menambah XP saat selesai kata, dan tidak mengurangi XP saat memakai clue/reveal (semua gratis). Ada badge "Mode AI" + info di layar selesai.
4. **Perkaya database** — kata AI yang belum ada di database otomatis disimpan (deduplikasi) supaya bank kosakata terus bertambah.
5. **Gagal?** — kalau provider error / respons tidak valid, muncul dialog ramah dengan opsi **Coba Lagi** atau **Main Mode Normal** (mode biasa tidak terpengaruh).

> 🔑 **Privasi** — API key milikmu (BYOK) disimpan di perangkat dan di-sync ke profil akunmu (RLS, hanya kamu yang bisa membaca) supaya akun yang sama di perangkat lain tetap bisa Main Mode AI tanpa set ulang. Key tidak pernah dikirim ke pihak lain.

## 🛠 Tech Stack

- **Framework:** React Native + Expo (TypeScript)
- **Backend & Auth:** Supabase (PostgreSQL + RLS + Auth)
- **State Management:** Zustand
- **Navigation:** React Navigation (native-stack)
- **Local Storage:** AsyncStorage (progress, session, identitas guest) + sql.js (log lokal)
- **Web:** react-native-web (satu kode untuk mobile & web)

## 📁 Project Structure

```
src/
├── features/        # Layar per fitur (game, history, auth, profile, settings)
├── data/            # Data layer (repositories, models, sources)
│   ├── sources/     # Supabase client
│   ├── repositories/# Repository (user, board, vocabulary, wordDiscovery)
│   ├── vocabulary/  # Seed kosakata terkurasi per tier (1–10)
│   └── models/      # Schemas & types
├── domain/          # Business logic
│   ├── entities/    # Domain types (Board, BoardCell, dst.)
│   └── usecases/    # Generator crossword, validator, XP engine, filter word pool
├── presentation/    # UI layer
│   ├── components/  # Komponen reusable (common/, icons/, game/, providers/)
│   ├── stores/      # Zustand stores (gameStore)
│   └── navigation/  # React Navigation setup
└── utils/           # Helper (log DB, device identity, board progress, dsb.)

scripts/             # Tooling pengembangan, dikelompokkan per peruntukan
├── db/              # Operasi database (migrasi, push, query Supabase)
├── vocab/           # Bangun & perbaiki kosakata (seed KBBI, generate SQL, fix clue)
├── check/           # Verifikasi & uji kualitas (check-*, verify-*)
├── kbbi/            # Diagnostik & analisis data KBBI
└── assets/          # Generator aset (efek suara)

supabase/
├── migrations/      # SQL migrasi (tabel, RLS, fungsi)
└── data/            # Data besar (vocabulary.sql)

assets/
├── images/          # Ikon, splash, favicon
└── sfx/             # Efek suara
```

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Start development (web)
bunx expo start --web

# Type check
bun tsc --noEmit

# Lint
bun lint
```

## 🔑 Environment Variables

Buat `.env.local` (atau isi lewat tab Keys di Freebuff):

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |

## 🗄 Database (Supabase)

Migrasi SQL ada di folder `supabase/migrations/` (tabel, RLS, fungsi); data besar di `supabase/data/`. Jalankan via script:

```bash
bun scripts/db/apply-supabase-migrations.mjs
bun scripts/db/supabase-run.mjs "SELECT ..."   # jalankan query ad-hoc
```

Kosakata di-push dari seed lokal (`src/data/vocabulary/`) ke tabel `vocabulary`:

```bash
bun scripts/vocab/gen-vocab-sql.mjs   # generate SQL dari seed
bun scripts/db/push-vocab.mjs          # push kosakata ke Supabase
```

## 📝 Revisi & Planning

**📄 [Release Notes lengkap](RELEASE_NOTES.md)** — ringkasan progres semua plan
(PLAN-001 s/d PLAN-005, semuanya ✅ done) + detail tiap rilis.

Daftar revisi produk dikelola di `.agents/plans/` (contoh: `PLAN-001-revisi-halaman-utama.md`)
dengan CLI plan:

```bash
bun .agents/plans/plan.mjs list    # lihat item & status
bun .agents/plans/plan.mjs start 001
bun .agents/plans/plan.mjs check 001 <nomor>
bun .agents/plans/plan.mjs note 001 <nomor> "catatan"
bun .agents/plans/plan.mjs help    # semua perintah
```

## 📦 Build & Deploy

```bash
# Build untuk produksi (output: dist/)
bunx expo export --platform web
```

## 🗺️ Development Status

Progress pembangunan project dilacak di `.agents/checkpoint.json`.

**Status plan revisi** (detail di [RELEASE_NOTES.md](RELEASE_NOTES.md)):

| Plan | Status | Isi |
| :--- | :--- | :--- |
| PLAN-001 | ✅ done | Revisi halaman utama & navigasi (22 langkah) |
| PLAN-002 | ✅ done | Main Mode AI — soal dari provider (BYOK) |
| PLAN-003 | ✅ done | Kualitas clue tier 1–10: 0 issue / 0 bocor / 0 duplikat |
| PLAN-004 | ✅ done | Keluar akun ke Profil + hapus akun permanen |
| PLAN-005 | ✅ done | Mode AI tanpa XP, paging log, leaderboard, notifikasi tier, tag asal bahasa |

## 📄 Lisensi

MIT — built with ❤️ by Fadhly Permata
