# 📝 Release Notes — KotaKata.AI

Ringkasan progres lengkap seluruh pengembangan & revisi KotaKata.AI.
Update dokumen ini setiap kali ada plan revisi selesai (lihat `.agents/plans/`).

---

## 🗂 Ringkasan Semua Plan

| Plan | Status | Judul | Ringkasan |
| :--- | :--- | :--- | :--- |
| **PLAN-001** | ✅ done | Revisi Halaman Utama & Navigasi | 22 langkah: UI menu seragam, orb parallax, Kata Ajaib, Sejarah Permainan + viewer board, navigasi soal, redesign log & detail, README akurat |
| **PLAN-002** | ✅ done | Main Mode AI (BYOK) | Mode main soal dari provider AI (OpenRouter / HuggingFace / URL kustom), halaman pengaturan provider, fallback error |
| **PLAN-003** | ✅ done | Perbaiki Kualitas Clue Tier 5–6 | Audit & regenerasi clue tier 1–10: **0 issue / 0 bocor / 0 duplikat**, placeholder 2331→1996, sync ulang ke Supabase |
| **PLAN-004** | ✅ done | Keluar Akun → Profil + Hapus Akun Permanen | Keluar akun pindah ke Profil, hapus akun 2-level konfirmasi (kode acak 10 huruf) via RPC `delete_user_data()` |
| **PLAN-005** | ✅ done | Revisi Mode AI, Log, Leaderboard & Notifikasi Tier | 10 langkah: tanpa XP di Mode AI, simpan soal AI ke DB, tier-aware, paging log, Daftar Tier, Leaderboard, notifikasi naik/turun tier, tag asal bahasa |
| **PLAN-006** | ✅ done | Log Cloud, Kirim Log, Detail Debug, Fix Statistik, Leaderboard Lazy & Dialog Close | 7 langkah: lint 0 warning, tabel `user_log_reports` + kirim log error/warning ke Supabase, stacktrace & inner exception tersimpan (UI tetap ringkas), fix "Kata Terpecahkan" (cloud count), leaderboard lazy-load 25/halaman + posisi user, tombol Tutup → icon [x] + tap di luar |
| **PLAN-007** | ✅ done | Review Semua Clue via Script Riset KBBI | 7 langkah: script `research-clues.mjs` (dump KBBI lokal → KBBI web.id → Bing → Google), generator 3 kolom anti-leak/anti-duplikat, override manual, riset online ~980 kata (213 di-rescue), fallback per-kolom QA-aware, QA checker "memuat" dipertegas, rebuild bersih: **0 issue QA semua tier**, placeholder **2472 → 327**; **penutup 7.b**: sisa 327 placeholder "Merupakan kata X" di tier 6–10 dihapus tuntas via `fill-remaining.mjs` + map kurasi `remaining/*.mjs` (c2/c3 dari pengetahuan umum, c1 truncated ikut diperbaiki) → **placeholder 0**, QA 0 issue, SQL di-regenerate |
| **PLAN-008** | ✅ done | Sejarah Permainan Lazy-Load (paging saat scroll) | 3 langkah: `boardRepository.getFinished` dukung paging `{limit, offset}` via `range()` (default 25) + `countFinished()` untuk label total; `GameHistoryScreen` refactor ScrollView → **FlatList lazy-load** (paging 25, `onEndReached` + `onScroll` fallback, guard refs + token anti-basi, footer spinner / tombol manual / "— Akhir riwayat —", header total, empty/error + tombol Coba lagi) — pola sama dengan halaman Kata Ditemukan; verifikasi tsc + 43 tes + lint lolos |

**Progres fase inti (checkpoint):** 19/19 phase `completed` — lihat `.agents/checkpoint.json`.

---

## 📦 Rilis per Plan

### v0.1.0 — Fondasi & Revisi Halaman Utama (PLAN-001)

**Fondasi (sebelum plan):**
- Aplikasi Expo + React Native (TypeScript strict), Clean Architecture (features / data / domain / presentation / utils)
- Supabase: auth (anon, Google, email) + RLS + tabel `users`, `word_discoveries`, `saved_boards`
- Generator papan crossword backtracking, grid responsif, XP engine + 10 tier puitis, sistem hint (clue 1–3, reveal letter)
- Auto-save board, sinkronisasi cloud, identitas guest berbasis device (UUID + `restore_guest_identity`)
- Riwayat kata "Kata Ditemukan" (lazy-load), viewer papan selesai read-only, tema terang/gelap, animasi transisi

**Revisi halaman utama & navigasi (22 langkah):**
- 🧹 Hapus folder `.freebuff` (sqlite lokal tak terpakai) + sistem plan revisi `.agents/plans/`
- 🎛 Menu grid seragam (lebar & tinggi konsisten, `flexBasis 47%`); label progress jadi **"Dapatkan {X} XP lagi untuk naik ke level"**
- ✨ 7 orb parallax dengan animasi idle "mantul" halus (kecepatan di-tune)
- 🎲 **Kata Ajaib** berfungsi: popup kata acak + clue (otomatis mengecualikan clue Antonim/Sinonim)
- 🔍 Tombol "Kata Ditemukan" (ex-"Sejarah"); 🏁 tombol baru **"Sejarah Permainan"** → `GameHistoryScreen` + `BoardViewerScreen` (grid read-only bergaya crossword)
- 👤 Profil: "Hubungkan Akun" hanya untuk guest, hapus "Tentang Aplikasi"
- 📋 Log dipindah ke `LogViewerScreen` (filter, salin, hapus, polling saat terbuka)
- 🎮 Ingame: hapus panel level (reset pindah ke action bar), progress bar garis 3px di tepi pill clue, ikon keyboard tanpa efek disable, navigasi ◀▶ bisa fokus kata belum benar walau terisi penuh
- 🧩 **Viewer papan & detail sejarah dibenahi total**: cellSize dihitung mundur (grid tidak meluber), sel hitam + nomor clue selaras, soal dikelompokkan Mendatar/Menurun bernomor bulat, tanggal format id-ID
- 🎧 Efek suara sintesis (tap, huruf, kata benar/salah, fanfare, popup) — expo-audio, toggle di Pengaturan

### v0.2.0 — Main Mode AI · BYOK (PLAN-002)

- 🎮 Tombol "Misi Harian" → **"Main Mode AI"**; popup ramah jika provider belum diatur
- ⚙️ Halaman **"Pengaturan Provider AI"**: preset **OpenRouter / HuggingFace / URL kustom**, API key + model, tombol **Tes Koneksi** & **Simpan** — key tersimpan lokal AsyncStorage (**BYOK**, tidak pernah dikirim ke cloud KotaKata)
- 🧠 Alur: prompt JSON → validasi ketat kata (a-z, 3–10 huruf, clue tidak memuat jawaban, dedup) → generate board lewat generator yang sama → dimainkan normal
- 🛟 Gagal/response tidak valid → dialog error ramah + opsi **Coba Lagi** / **Main Mode Normal**
- 🔧 Tombol "Tambahkan Provider AI" di Pengaturan + status provider tersimpan

### v0.3.0 — Akun: Keluar Akun & Hapus Permanen (PLAN-004)

- 🚪 Panel "Keluar Akun" pindah dari Pengaturan ke **Profil** (konfirmasi → signOut → reset store → Auth)
- 🗑 **Hapus Akun (Permanen)** dengan konfirmasi 2 level: peringatan data hilang → ketik **kode acak 10 huruf** (tanpa I/O agar tidak ambigu), tombol aktif hanya jika cocok case-insensitive
- 🗄 RPC `delete_user_data()` (security definer): hapus `word_discoveries` + `saved_boards` + `users` + `auth.users` milik `auth.uid()`, anon di-revoke eksplisit
- 🧹 Setelah hapus: `clearDeviceId()` (guest berikutnya mulai nol) → signOut → reset store → bersihkan AsyncStorage → Auth
- 🐛 **Fix auto-save progres**: debounce 500ms + flush `pagehide`/`beforeunload`/`AppState`/unmount — refresh/close tab tidak lagi kehilangan progres board yang belum selesai

### v0.4.0 — Mode AI Tanpa XP · Log Paging · Leaderboard · Notifikasi Tier (PLAN-005)

- 🚫 **Mode AI tanpa XP total**: badge "Mode AI" di top bar, hint gratis, gate `aiMode` di gameStore (tidak menambah XP saat selesai kata, tidak mengurangi XP saat clue/reveal), info eksplisit di CompletionOverlay
- 🐛 **Fix board AI "nyangkut"**: auto-save re-check boardResult saat timer fire + cancel timer saat board tamat → papan selesai tidak muncul lagi di "Mulai Bermain"
- 💾 **Simpan soal AI ke database**: RPC `insert_ai_vocabulary` + `saveAiWords` (fire-and-forget, dedup) — vocabulary DB terus bertambah
- 🎯 **Soal AI sesuai tier pemain**: `requestAiWords(playerTier)` — prompt berisi panduan kesulitan per tier
- 📜 **Halaman Log**: tombol Muat Ulang / Salin / Hapus pindah ke atas; **paging** dengan jumlah baris custom (25/50/100/200)
- 🏆 **Main Menu — Daftar Tier**: modal 10 tier, highlight tier pemain (warna + tag "Kamu di sini")
- 🥇 **Main Menu — Leaderboard**: RPC `get_leaderboard`, urut `total_xp desc` + `updated_at asc`, highlight baris sendiri, medal top 3
- 🔔 **Notifikasi naik/turun tier**: `TierChangeToast` di Main Menu & layar Game

### v0.5.0 — Kualitas Clue 1–10 Tuntas + Tag Asal Bahasa (PLAN-003 + PLAN-005 #1)

- 🔍 **Audit awal**: tier 6 bermasalah serius (837 issue/1000 baris) — contoh memuat jawaban sendiri (leak), sisa penanda KBBI (`[hor]`, `<i>`), label kelas kata nyasar, sinonim asal/duplikat, placeholder 17%
- 🛠 **Generator diperkuat** (`fix-tier6-10.mjs`): merge-safe (pertahankan c2/c3 asli valid), contoh KBBI toleran tag tanpa `</i>`, pemotongan c1 multi-fragment (`; `, `, `, " dan "), override manual 104 kata (`manual-tier6-c2c3.mjs`), jaring akhir anti `c1==c3` / `c2 memuat c3` / `c2==c3`
- 🩹 **Fix presisi tier 1–5** (`fix-tier1-5.mjs`): 44 kata (leak lembut c1/c2 memuat sinonim c3, c1==c3, bocor)
- ✅ **Hasil akhir**: SELURUH tier 1–10 = **0 issue, 0 bocor, 0 duplikat**; idempotent; placeholder total **2331 → 1996** (tier 6: 36.9% → 24.0%); jumlah kata per tier tetap 1000
- 🏷 **Tag asal bahasa** di clue_1: **949 kata serapan asing** ("Kata serapan dari bahasa X" — Belanda 348, Inggris 154, Arab 135, Sanskerta 66, Portugis 45, Yunani 22, Persia 12, Tionghoa 7, Jepang 5, Tamil 5, Hindi 2) + **15 kata bahasa daerah Nusantara** ("Kata dari bahasa X" — Jawa 12, Sunda 1, Minangkabau 2; hanya yang penanda bahasa daerahnya ada di definisi utama KBBI dan maknanya sesuai soal)
- 📚 **Sync database**: `supabase/data/vocabulary.sql` regenerated (10000 kata) + di-push via `push-vocab.mjs` (UPSERT, riwayat `word_discoveries` aman). DB total 10002 = 10000 seed + 2 kata AI. 149 prefix yang sempat hilang saat rewrite dipulihkan

### v0.6.0 — QA Logic & Sync Provider AI Lintas Device

- 🛡 **QA logic fixes**: pengecekan alur game end-to-end (validator board, kata, XP engine, word pool)
- 🔑 **Config provider AI di-sync ke cloud**: kolom `users.ai_provider_config` (jsonb) via RLS pemilik + migrasi `ai-provider-sync.sql` — akun yang sama di device berbeda tetap bisa Main Mode AI (tanpa harus set ulang key)
- 🧹 `restore_guest_identity` ikut menyalin config provider saat guest di-link ke akun permanen
- 📦 Koreksi clue tier 6–10 ikut di-commit dalam rilis ini

### v0.7.0 — Unit Test Otomatis + QA & Bersih-bersih Arsip

- 🧪 **Unit test domain logic** (`bun test`, 43 tes): `xpEngine` (XP, tier, progress, penalti), `wordValidator`, `boardValidator`, `crosswordGenerator` — runner Bun bawaan, preload `tests/setup.ts` (mock logger + `__DEV__`)
- 🐛 **Fix bug orphan detection di `boardValidator`**: logika lama hanya mendeteksi persilangan di sel pertama kata lawan sehingga semua board hasil generator dilaporkan "Orphan words" (validator tidak dipakai di app, tapi sekarang benar)
- 🔧 `tsconfig.json`: mapping `bun:test` → `bun-types`; `package.json`: script `test` + devDep `@types/bun`
- 🧹 **Arsip plan lama dikonsolidasi**: `archive/CHECKPOINT.md`, `DESIGN_PLAN.md`, `development-plan.md` (superseded) → satu `archive/README.md` penunjuk sumber resmi
- ✅ **QA penuh**: qa-logic ALL PASS, verify-all 8500 unik / 0 duplikat, clue quality 0 issue semua tier (script sekali pakai diarsipkan ke `scripts/archive/check/`)

### v0.8.0 — Log Cloud, Kirim Log, Detail Debug, Leaderboard Lazy & Dialog Close (PLAN-006)

- 🧹 **Lint bersih total**: 12 warning `no-unused-vars` dibereskan (import tak terpakai di `qa-logic.mjs`, `catch (err)` → `catch {}`, helper mati di `fix-tier6-10.mjs`) + `scripts/archive/**` di-exclude dari ESLint (tool sekali pakai) → `bun lint` kini **0 errors 0 warnings**
- ☁️ **Tabel `user_log_reports`** (migrasi SQL + RLS): menyimpan laporan log yang dikirim user (payload jsonb, device_id, platform, app_version, created_at); `delete_user_data` ikut membersihkannya saat hapus akun
- 📤 **Tombol "Kirim Log"** di Halaman Log: kirim HANYA level error/warning ke Supabase (konfirmasi jumlah entri, feedback sukses/gagal, butuh login)
- 🐛 **Detail log untuk debugging**: stacktrace penuh + inner exception (`err.cause`) kini tersimpan di kolom `stack` — **UI aplikasi tetap format ringkas sekarang** (detail hanya muncul saat disalin/dikirim)
- 🔧 **Fix "Kata Terpecahkan" selalu 0** di Profil: sumber data diganti dari state sesi game (`wordsSolved`) ke `wordDiscoveryRepository.countByUser()` cloud (cocok dengan angka di halaman Kata Ditemukan)
- 🏅 **Leaderboard lazy-load**: paging 25 baris/request + auto-load saat scroll ke bawah; posisi pemain yang login (rank + baris) selalu tampil di atas tombol Tutup tanpa perlu scroll jauh (RPC baru `get_leaderboard_paged` + `get_leaderboard_rank`)
- ✕ **Dialog tanpa tombol "Tutup"**: popup Leaderboard, Daftar Tier, Kata Ajaib & error Mode AI kini pakai icon [✕] di pojok kanan atas + **tap di luar jendela otomatis menutup** (dialog konfirmasi berbahaya tetap pakai tombol Batal/Lanjutkan)
- 🧹 **Auto-purge log report**: job pg_cron `purge-user-log-reports` menghapus row `user_log_reports` berumur > **30 hari** setiap hari 03.00 UTC (migrasi `user-log-reports-purge.sql`, idempotent — ubah interval lalu jalankan ulang untuk ganti retensi)

### v0.9.0 — Review Semua Clue via Script Riset KBBI (PLAN-007)

- 🤖 **Script riset otomatis** (`scripts/vocab/research-clues.mjs`): tiap kata di-teliti dari dump KBBI lokal → **KBBI web.id** (ajax_submit) → **Bing** → **Google**, dengan ekstraktor defensif (gate isPlausibleDef: dominasi bahasa Indonesia, tolak teks asing); cache persisten `/tmp/kotakata-research-cache` (tahan throttle gateway)
- 🧠 **Generator clue 3 kolom ketat**: c1 definisi bersih (penanda `[Mil]`/`Istilah X`/kelas kata nyasar/placeholder `--` dibuang), c2 senses → fragmen def → contoh pemakaian (jawaban di-redact "…"), c3 sinonim/antonim → contoh → fragmen; anti `c1==c3`, `c2 memuat c3`, near-sama, bocor jawaban
- 📝 **Override manual** `clue-overrides.mjs` (100+ kata) untuk entri KBBI multi-baris yang tak bisa digeneralisasi
- 🌐 **Riset online**: ~980 kata di-research ulang dari web, **213 kata miskin bahan di-rescue** (contoh & sinonim KBBI web.id)
- 🛠 **Fallback per-kolom QA-aware**: modernisasi singkatan `pd/dl/thd` → `pada/dalam/terhadap`, kurung gantung ditutup, penanda dibuang — ditolak bila menciptakan duplikat; placeholder diisi bahan riset (senses/contoh/fragmen/sinonim)
- 🎯 **QA checker dipertegas** (`check-clue-quality.mjs`): aturan "memuat" hanya dihitung bila kedua kolom ≥ 12 huruf (frasa) — kata tunggal yang wajar di definisi tidak lagi salah-flag, duplikat frasa nyata tetap terdeteksi; pipeline memakai semantik yang sama
- ✅ **Hasil akhir**: **0 issue QA semua tier**, placeholder **2472 → 327** (sisa = kata ultra-langka berdefinisi tunggal — batas maksimal bahan KBBI), singkatan modern, kurung gantung ditutup, ~3051 baris clue ditulis ulang; `supabase/data/vocabulary.sql` di-regenerate

### v0.10.0 — Sejarah Permainan Lazy-Load (PLAN-008)

- 📜 **Halaman "Sejarah Permainan" kini lazy-load**: `GameHistoryScreen` refactor dari `ScrollView` (muat semua board sekaligus, cap 100) ke **FlatList berpaging** — 25 riwayat per request, auto-load saat scroll ke bawah (`onEndReached` + fallback `onScroll` jarak < 600px), tombol "Muat lebih banyak" sebagai jaring pengaman, label "— Akhir riwayat —" saat habis
- 🔢 **Header total**: label "{n} permainan selesai" dari `countFinished()` (gagal menghitung tidak menggagalkan list)
- 🛡 **Guard anti-tumpuk & anti-basi**: refs `loadingMore/hasMore` cegah request ganda; token reset membuang response lama saat focus ulang/ganti user; error state + tombol **Coba lagi**; pola identik dengan halaman Kata Ditemukan
- 🗄 `boardRepository.getFinished(userId, { limit, offset })` memakai `range()` (default 25) — pemanggil lain aman

---

## 🔧 Tooling Pendukung (scripts/)

| Area | Script | Fungsi |
| :--- | :--- | :--- |
| Vocab | `fix-tier6-10.mjs` | Regenerasi clue tier 6–10 dari KBBI (merge-safe, anti-leak) |
| Vocab | `fix-tier1-5.mjs` | Fix presisi leak tier 1–5 |
| Vocab | `manual-tier6-c2c3.mjs` | Override manual c2/c3 untuk kata miskin bahan |
| Vocab | `add-language-origin.mjs` + `etymology-data.mjs` | Tag "Kata serapan dari bahasa X" (peta terkurasi) |
| Vocab | `add-regional-origin.mjs` | Tag "Kata dari bahasa X" (bahasa daerah Nusantara) |
| Vocab | `gen-vocab-sql.mjs` | Generate `supabase/data/vocabulary.sql` dari seed |
| Vocab | `research-clues.mjs` + `clue-overrides.mjs` | Riset & perbaiki clue otomatis (dump KBBI + KBBI web.id + Bing + Google), override manual kata aneh |
| Vocab | `kbbi-web-test.sh` | Uji endpoint `ajax_submit` KBBI web.id (JSON entri + kata terkait) |
| Check | `check-clue-quality.mjs` | Audit quality clue (leak, duplikat, placeholder, issue) |
| Check | `qa-logic.mjs` | Validasi logic game end-to-end |
| Check | `detect-regional.mjs` / `verify-origin-prefixes.mjs` | Verifikasi penanda asal bahasa |
| DB | `push-vocab.mjs` / `supabase-run.mjs` | Push vocabulary & query ad-hoc ke Supabase |
