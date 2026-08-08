# Revisi Halaman Utama & Navigasi

<!-- status: done -->
<!-- dibuat: 2026-08-08 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 001`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [x] **1. Bersihkan folder `.freebuff`** — Hasil investigasi: berisi `desktop-v2.db` + `-shm` + `-wal` (SQLite ~10MB) yang **ter-track di git** (commit "manual commit" 3f611df) tapi **tidak dirujuk satu pun kode** (grep `freebuff|desktop-v2` di `src/`, `scripts/`, `supabase/` kosong; log lokal memakai sql.js in-memory + AsyncStorage, bukan file ini). Tindakan: hapus folder (git rm), tambahkan `.freebuff/` ke `.gitignore`, commit.

- [x] **2. Samakan lebar tombol menu halaman utama** — Di `src/features/game/MainMenuScreen.tsx`: baris "actionGrid" (Misi Harian + Sejarah) pakai `flex: 1` (lebar 50%-an), sedangkan baris "bento" (Profil besar 48%, Kata Ajaib + Pengaturan 48% kecil) memakai `width: 48%` — hasilnya lebar tombol tidak konsisten antar baris. Tindakan: buat satu sistem grid seragam (mis. semua kartu `flex: 1` dengan tinggi konsisten atau satu konstanta lebar), sehingga Misi Harian, Sejarah/Kata Ditemukan, Profil, Kata Ajaib, Pengaturan, dan tombol baru Sejarah Permainan (lihat #8) terlihat rapi sejajar.

- [x] **3. Bulatan parallax mantul-mantul halus** — Di `MainMenuScreen.tsx` sudah ada 3 "floatingOrb" yang bergerak mengikuti scroll (parallax). Tindakan: tambahkan animasi idle per orb (Animated.loop, easing in-out, durasi lambat ~4–6 dtk, amplitudo kecil ±8–14px, fase berbeda tiap orb, `useNativeDriver: true`) supaya bulatan bergerak naik-turun halus "mantul-mantul" sebagai pemanis — tidak cepat, tidak mengganggu parallax scroll.

- [x] **4. Ganti label progress peringkat** — Di `MainMenuScreen.tsx` teks: `Lengkapi {xpToNext} kata lagi untuk level berikutnya!` → jadi `Dapatkan {remainingXp} XP lagi untuk naik ke level`. `xpToNext` saat ini menghitung estimasi *jumlah kata*; ganti hitungannya menjadi sisa XP mentah (`nextThreshold - totalXp`) dari `TIER_THRESHOLDS`, tampilkan langsung sebagai angka XP. Catatan: pilih teks yang pas saat sudah di level maksimal (sisa XP = 0).

- [x] **5. Tombol "Kata Ajaib" berfungsi (popup kata acak + clue)** — Saat ini `onPress={() => {}}` di `MainMenuScreen.tsx`. Tindakan: (a) buat method repository baru di `src/data/repositories/vocabularyRepository.ts` (mis. `getRandomWord()` via `getByTierRange(1,10)` lalu pilih acak, atau query `order('random()')` — pilih yang paling sederhana & andal dengan Supabase/PostgREST); (b) buat komponen modal popup (pakai pola `ConfirmDialog` di `src/presentation/components/common/` sebagai referensi) yang menampilkan kata + satu clue acak; (c) **jangan tampilkan clue antonim/sinonim** — filter clue_1/2/3 yang diawali teks "Antonim:" / "Sinonim:" (data vocabulary ternyata menyimpan pola seperti `Antonim: berat`, `Sinonim: penglihatan`), pilih clue acak hanya dari yang bukan pola tersebut.

- [x] **6. Tukar posisi tombol "Sejarah" ↔ "Kata Ajaib"** — Di `MainMenuScreen.tsx`, "Sejarah" ada di baris actionGrid, "Kata Ajaib" ada di bento. Tindakan: pindahkan posisi visual keduanya (Sejarah ke tempat Kata Ajaib, Kata Ajaib ke tempat Sejarah) sesuai permintaan. Pastikan navigasi masing-masing tetap benar (History → `navigation.navigate("History")`).

- [x] **7. Rename tombol "Sejarah" → "Kata Ditemukan"** — Ganti label teks tombol di `MainMenuScreen.tsx` dari "Sejarah" menjadi "Kata Ditemukan" (ikon boleh disesuaikan, mis. 🎓 → 🔍). Layar tujuannya tetap `HistoryScreen` (title header layar History bisa ikut disesuaikan jika perlu).

- [x] **8. Tombol baru "Sejarah Permainan" + viewer board selesai** — Tambah tombol baru di halaman utama (perhatikan konsistensi lebar dari #2). Tindakan: (a) tambah method di `src/data/repositories/boardRepository.ts` (mis. `getFinished(userId)` — filter `is_finished = true` dari `saved_boards`); (b) buat layar baru (mis. `src/features/history/GameHistoryScreen.tsx`) berisi daftar permainan selesai user (tier, grid size, tanggal via `updated_at`); (c) saat item di-tap, tampilkan papan yang sudah diselesaikan — render `layout_data` (JSON board) read-only, tidak bisa diketik (reuse `CrosswordGrid` tanpa interaksi ketik atau mode view-only); (d) daftarkan layar baru di `src/presentation/navigation/RootNavigator.tsx` + `RootStackParamList`, dan navigasi dari tombol baru.

- [x] **9. Hapus "Hubungkan Akun" untuk user non-guest di Profile** — Di `src/features/profile/ProfileScreen.tsx` baris "Hubungkan Akun" selalu tampil tanpa syarat. Tindakan: tampilkan baris tersebut **hanya untuk user guest/anonim** (cek `user.isAnonymous` / `is_anonymous` dari `useAuth`); untuk user login (Google/email) ganti dengan info status akun (mis. "Masuk sebagai {email}") atau sembunyikan baris hubungkan.

- [x] **10. Hapus "Tentang Aplikasi" di Profile** — Di `ProfileScreen.tsx` hapus baris action "Tentang Aplikasi" (v1.0.0) beserta divider-nya. (Informasi versi masih ada di halaman Pengaturan.)

- [x] **11. Log di Pengaturan: tampil lewat tombol, bukan langsung** — Di `src/features/settings/SettingsScreen.tsx`, seksi "Log Aplikasi" sekarang langsung merender stats, filter, dan daftar log. Tindakan: ganti dengan tombol ringkas (mis. "Lihat Log Aplikasi" + ringkasan jumlah error/warn saja), dan saat tombol diklik baru tampilkan detail log (bisa modal atau layar terpisah `LogViewerScreen` yang memuat `getLogs`/filter/salin/hapus dari `src/utils/logDb`). Hentikan polling 3 detik di halaman Pengaturan (pindahkan ke viewer saat terbuka).

- [x] **12. Main Menu: susun ulang posisi & tinggi tombol bento** — Di `src/features/game/MainMenuScreen.tsx`: (a) tombol "Sejarah Permainan" pindah ke posisi **di bawah "Kata Ditemukan"** (kolom kanan bawah); (b) tombol "Pengaturan" pindah ke posisi **di bawah "Profil"** (kolom kiri bawah); (c) tinggi "Sejarah Permainan" dibuat **sama dengan "Profil"** (pakai `bentoLargeCard` 180px, bukan `bentoSmallCard` 84px). Urutan JSX dalam `bentoGrid` (flexWrap): Profil (large) → Kata Ditemukan (small) → Pengaturan (small) → Sejarah Permainan (large).

## Catatan Revisi
- **12.** 2026-08-08: Sejarah Permainan pindah ke bawah Kata Ditemukan (kolom kanan bawah) dan dipromosikan ke bentoLargeCard (180px, sama dgn Profil); Pengaturan pindah ke bawah Profil (kolom kiri bawah). Urutan bento: Profil, Kata Ditemukan, Pengaturan, Sejarah Permainan
- **2.** 2026-08-08: KOREKSI: tinggi tombol dikembalikan ke desain asli (actionCard tinggi konten, bentoLarge 180px, bentoSmall 84px) — yang disamakan hanya LEBAR via width 48% konsisten di actionGrid & bentoGrid. Layout: actionGrid = Misi Harian + Kata Ajaib; bento = Profil (besar) + Kata Ditemukan + Sejarah Permainan + Pengaturan (kecil)
- **11.** 2026-08-08: Settings: seksi log diganti tombol 'Lihat Log Aplikasi' → LogViewerScreen (detail log, filter, salin, hapus, polling 3s) — halaman Settings tidak lagi render log langsung
- **10.** 2026-08-08: baris 'Tentang Aplikasi' dihapus dari Profile
- **9.** 2026-08-08: Profile: 'Hubungkan Akun' hanya tampil untuk user anonim; non-guest lihat '✓ Akun Terhubung' + email
- **8.** 2026-08-08: tombol baru 'Sejarah Permainan' → GameHistoryScreen (daftar saved_boards is_finished=true) + BoardViewerScreen (grid read-only dari layout_data) + route baru di RootNavigator; boardRepository.getFinished()
- **7.** 2026-08-08: label tombol diubah jadi 'Kata Ditemukan' dengan ikon 🔍, tetap navigasi ke History
- **6.** 2026-08-08: Sejarah (actionGrid) tukar dengan Kata Ajaib (bento) — kini Kata Ajaib di baris atas, Kata Ditemukan di baris kedua
- **5.** 2026-08-08: Kata Ajaib: vocabularyRepository.getRandomWords(limit=10) (count + offset acak) + popup Modal menampilkan kata, tier, clue acak yang BUKAN pola Antonim/Sinonim, tombol Kata Lain
- **4.** 2026-08-08: label jadi 'Dapatkan {remainingXp} XP lagi untuk naik ke level' — hitung sisa XP murni dari TIER_THRESHOLDS; tier max tampil teks khusus
- **3.** 2026-08-08: orb parallax dapat animasi idle Animated.loop (easing inOut quad, durasi 2.6-3.6s, amplitudo 10-14px, fase 900ms) digabung dengan translateY parallax scroll
- **2.** 2026-08-08: menuGrid seragam: semua tombol (Misi Harian, Kata Ajaib, Profil, Kata Ditemukan, Sejarah Permainan, Pengaturan) flex 1 + flexBasis 47% + minHeight 108 + gap 12 — lebar & tinggi konsisten

- **1.** 2026-08-08: folder .freebuff dihapus (git rm) + .gitignore ditambah .freebuff/, commit d84778f sudah di-push
