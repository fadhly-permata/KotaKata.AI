# Konfeti Layar Penuh + ESC Tutup Popup + Panel Profile Kata Ditemukan/Sejarah

<!-- status: done -->
<!-- dibuat: 2026-08-12 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 010`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

3 revisi kecil yang saling lepas (UI/UX + input web):

1. **Konfeti & hujan sekarang terkurung di dalam kartu dialog** — komponen
   `Confetti` (dan `Confetti sad` untuk turun tier) dirender sebagai anak dari
   kartu `AppModal`/`CompletionOverlay`, sehingga partikel jatuh hanya di dalam
   jendela popup dan terpotong oleh batas kartu. Seharusnya efek meriah/murung
   menutupi SELURUH layar (absolute fill di belakang backdrop, `pointerEvents:
   none`), layaknya perayaan game modern.
2. **Popup tidak menutup dengan tombol ESC (web/desktop)** — semua dialog
   (Kata Ajaib, Daftar Tier, Leaderboard, tier naik/turun, konfirmasi keluar,
   dll.) hanya punya tombol [✕] + tap luar. Belum ada listener tombol ESC.
   Kebutuhan: ESC menutup SEMUA popup; khusus popup "Papan Selesai!" ESC
   kembali ke halaman game (bukan menutup app / bukan keluar game) supaya
   pemain bisa me-review soal & jawaban.
3. **Panel Profil membingungkan** — label statistik "Kata Terpecahkan" tidak
   jelas (dan nilainya dahulu selalu 0 karena salah sumber data; sekarang sudah
   diambil dari `word_discoveries` = 404). Label diganti **"Kata Ditemukan"**
   dan ditambah panel **"Sejarah Permainan"** (jumlah papan selesai). Kedua
   panel jadi tombol yang menavigasi ke halamannya masing-masing ("Kata
   Ditemukan" → halaman Kata Ditemukan; "Sejarah Permainan" → halaman Sejarah).

Catatan investigasi awal:
- `Confetti` ada di `src/presentation/components/common/Confetti.tsx` (prop
  `sad`), dipakai di `CompletionOverlay` (selalu) dan dialog tier MainMenu
  (`tierDialog.up ? <Confetti/> : <Confetti sad/>`).
- `AppModal` (`src/presentation/components/common/AppModal.tsx`) adalah komponen
  modal bersama — tempat paling tepat menambah listener ESC (satu tempat untuk
  semua popup yang memakainya). `ConfirmDialog` juga perlu ESC bila dipakai di
  web.
- `CompletionOverlay` (`src/presentation/components/game/CompletionOverlay.tsx`)
  bukan `AppModal` — perlu penanganan ESC khusus ("kembali ke game").
- Profile: `src/features/profile/ProfileScreen.tsx` baris ~174 label stat
  "Kata Terpecahkan"; navigasi ke "Kata Ditemukan" & "Sejarah" sudah ada di
  navigator (cek nama route: `WordsFound` / `History`).

## Langkah

- [x] **1. Konfeti & hujan seluruh layar** — ubah pemakaian `Confetti` di
  `CompletionOverlay` dan dialog tier `MainMenuScreen`: partikel dirender
  sebagai **absolute fill penuh layar** (di belakang backdrop dialog, bukan di
  dalam kartu), `pointerEvents="none"`, ukuran partikel & area jatuh
  mengikuti `useWindowDimensions` (lebar penuh layar, tinggi penuh), tidak
  terpotong oleh kartu/batas modal. Pastikan tetap jalan di web + mobile dan
  tidak menghalangi tap tombol dialog. Bila `Confetti` masih menerima prop
  posisi (mis. `left/top`), sesuaikan agar default = seluruh layar.

- [x] **2. Tombol ESC menutup semua popup** — buat hook kecil
  (`useEscapeClose(active, onClose)`) atau pasang listener `keydown`
  (`Escape`) di `AppModal` (dipasang saat `visible`, dilepas saat tidak —
  cleanup benar, tidak ada listener ganda saat beberapa modal terbuka; gunakan
  `visible` + latest `onClose` via ref). Berlaku untuk: Kata Ajaib, Daftar
  Tier, Leaderboard, error/loading AI, dialog tier naik/turun. Tambahkan juga
  ke `ConfirmDialog` (keluar game / reset papan / reveal) bila memungkinkan.
  **Khusus popup "Papan Selesai!"** (`CompletionOverlay`): ESC TIDAK menutup
  begitu saja — dipetakan ke aksi **"Lihat Papan"** (kembali ke halaman game /
  review soal & jawaban), sesuai `onViewBoard`. Pastikan tidak konflik dengan
  listener ESC lain (board viewer, halaman game).

- [x] **3. Profil: panel "Kata Ditemukan" + "Sejarah Permainan"** —
  `ProfileScreen.tsx`: (a) ganti label statistik "Kata Terpecahkan" →
  **"Kata Ditemukan"** (nilai tetap dari `word_discoveries`); (b) tambah panel
  baru **"Sejarah Permainan"** dengan jumlah papan selesai (dari
  `boardRepository.countFinished()` atau sumber yang sudah dipakai halaman
  History); (c) kedua panel jadi `TouchableOpacity` yang menavigasi ke halaman
  masing-masing (route Kata Ditemukan & route Sejarah — pastikan nama route
  cocok dengan navigator); (d) verifikasi tampilan kedua panel responsif &
  konsisten dengan tema.

- [x] **4. Verifikasi menyeluruh** — `bun tsc -b --noEmit`, `bun test`,
  `bun lint` lolos; QA web: konfeti/hujan memenuhi layar di popup tier &
  Papan Selesai; ESC menutup semua popup, ESC di "Papan Selesai" membuka
  review board; Profil menampilkan "Kata Ditemukan" + "Sejarah Permainan" dan
  keduanya navigasi benar.

## Catatan Revisi
- **4.** 2026-08-12: tsc bersih, bun test 43/43 pass, bun lint 0 problem; esbuild parse semua file berubah OK
- **3.** 2026-08-12: ProfileScreen — label "Kata Terpecahkan" → "Kata Ditemukan" (nilai tetap dari word_discoveries), panel baru "Sejarah Permainan" (boardRepository.countFinished dari saved_boards), keduanya jadi TouchableOpacity → navigate History / GameHistory; grid 3 kolom (font & padding disesuaikan)
- **2.** 2026-08-12: Hook baru useEscapeClose (web-only, ref callback) dipakai AppModal (ESC=close, ikut dismissable), ConfirmDialog (ESC=Batal), CompletionOverlay (ESC=kembali ke game / review board via onViewBoard)
- **1.** 2026-08-12: Konfeti & hujan SELURUH LAYAR — AppModal dapat prop confetti="celebrate"|"sad" (dirender paling atas Modal, pointerEvents none); MainMenu dialog tier pakai prop itu (bukan anak kartu); CompletionOverlay Confetti dipindah ke lapisan teratas (di atas backdrop)
