# Responsif UI + Orb Login + Fix In-Game + Dialog Seragam + Konfeti + Dialog Tier Baru

<!-- status: done -->
<!-- dibuat: 2026-08-12 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 009`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

8 revisi UI/UX lintas halaman yang saling berkaitan — mayoritas menyangkut
responsivitas (resolusi layar berbeda: HP kecil, tablet, jendela web sempit/lebar)
dan konsistensi dialog. Ringkasan hasil investigasi awal:

- **Responsivitas**: banyak layar memakai `Dimensions.get("window")` di scope
  modul (AuthScreen, GameScreen, HistoryScreen, BoardViewerScreen, CrosswordGrid)
  dan ukuran keras (orb 180/220px, card 180/84px, actionBar satu baris
  fixed-width) — rusak/overlap di layar pendek/sempit.
- **Orb login**: `AuthScreen` sudah punya animasi float (orb1Anim/orb2Anim),
  tapi jauh lebih redup daripada main menu (7 orb + parallax + bounce). Perlu
  dicek kenapa terasa statis (kemungkinan besar `useNativeDriver` + timing 12s
  terlalu pelan) → dibuat jelas bergerak, konsisten dengan main menu.
- **Clue terpotong**: `GameScreen` `clueMain` `numberOfLines={2}` di pill
  fixed — teks clue panjang kepotong.
- **Panel zoom/tindakan tidak responsif**: `actionBar` satu baris dengan item
  fixed 40px (zoom 3 tombol + divider + label + 3 reveal + spacer + reset +
  keyboard) — komponen saling overlap/terpotong di layar sempit.
- **Close [x] tidak seragam**: icon ✕ sudah ada di Kata Ajaib / Daftar Tier /
  Leaderboard / error AI (styling `modalCloseBtn` masing-masing ditulis ulang),
  tapi ConfirmDialog (dipakai luas) tidak punya [x] dan posisi/tombol tidak
  konsisten antar modal → perlu komponen modal bersama.
- **Konfeti**: `CompletionOverlay` (dialog permainan selesai) belum ada konfeti.
  Tidak ada lib konfeti terpasang; `react-native-svg` sudah ada — implementasi
  konfeti ringan memakai Animated (partikel warna) biar jalan di semua platform
  termasuk web, tanpa dependency baru.
- **Tier naik/turun**: `TierChangeToast` muncul di Main Menu & layar Game
  (toast 3 detik); `CompletionOverlay` juga menampilkan "TIER UP!". Semua
  notifikasi tier akan dihapus → diganti SATU popup dialog yang HANYA muncul di
  halaman main menu (konfeti saat naik, efek murung saat turun). Deteksi
  perubahan tier sudah ada di `MainMenuScreen` (useFocusEffect + prevTierRef).

## Langkah

- [x] **1. Basis responsivitas lintas halaman** — audit & perbaiki layar utama
  agar nyaman di berbagai resolusi (HP kecil s/d tablet & web desktop):
  (a) ganti `Dimensions.get("window")` di scope modul → `useWindowDimensions()`
  (reactive) di `AuthScreen`, `GameScreen`, `HistoryScreen`,
  `BoardViewerScreen`, `CrosswordGrid`; (b) ukuran "keras" jadi proporsional:
  orb login ikut `min(w,h)` (skala ~0.5), kartu bento main menu pakai tinggi
  relatif/min-height responsif, padding & font menyesuaikan layar pendek
  (`useWindowDimensions` + `Platform`); (c) pastikan tidak ada konten terpotong
  di layar kecil (scroll aman, `flexShrink`, `minWidth: 0`); (d) verifikasi
  visual di web dengan window lebar/sempit.

- [x] **2. Orb halaman login benar-benar animated** — di `AuthScreen`:
  (a) cek kenapa float 12–15s terasa statis (kemungkinan besar terlalu pelan +
  hanya 2 orb) → percepat & perbanyak fase; (b) tiru pola main menu: 3–4 orb
  dengan animasi idle bounce (Easing.inOut, durasi/fase berbeda) + parallax saat
  scroll (ScrollView `onScroll` + `Animated.event`); (c) tetap pakai
  `useNativeDriver: true` (web: JS fallback otomatis) dan pastikan orbs tidak
  menghalangi interaksi (`pointerEvents="none"`).

- [x] **3. Fix clue terpotong (In-Game)** — `GameScreen`: (a) hapus
  `numberOfLines={2}` pada `clueMain` atau naikkan jadi `numberOfLines={4}` +
  tinggi pill dinamis (`flexShrink`, tidak fixed); (b) pastikan pill clue tetap
  dalam batas layar pendek (teks scrollable bila > 4 baris: `ScrollView`
  horizontal teks atau pill max-height + scroll); (c) cek bottom panels tidak
  overlap dengan grid — grid area sisa diberi `flexShrink: 1` + `minHeight`.

- [x] **4. Fix panel zoom & action bar responsif (In-Game)** — `GameScreen`:
  (a) `actionBar` boleh `flexWrap: "wrap"` dengan `rowGap`, item pakai
  `flexBasis` proporsional; (b) pada layar sempit, kelompok zoom/reveal/reset
  keyboard turun ke baris berikutnya alih-alih overlap; (c) item aksi pakai
  ukuran berbasis `useWindowDimensions` (mis. min 36–44px tapi tidak melebihi
  lebar panel); (d) verifikasi tidak ada tombol terpotong/overlap di layar
  sempit & pendek.

- [x] **5. Komponen modal bersama + close [x] seragam** — buat komponen
  `AppModal` (atau `ModalDialog`) di `src/presentation/components/common/`:
  (a) satu pola: `Modal` transparent + backdrop + kartu, header row dengan judul
  & tombol [✕] konsisten (ukuran/hitSlop/warna sama), tap di luar kartu menutup
  (kecuali `dismissable={false}` untuk dialog wajib), animasi spring masuk yang
  sama; (b) refactor semua modal yang ada ke komponen ini: Kata Ajaib, Daftar
  Tier, Leaderboard, error/loading AI (MainMenu), dan popup dialog tier baru
  (langkah 8); (c) `ConfirmDialog` — tambahkan tombol [✕] opsional (default
  tampil) & backdrop tap-outside, PERTAHANKAN tombol Batal/Lanjutkan untuk
  aksi berbahaya (keluar/reset/reveal) sesuai keputusan PLAN-006.

- [x] **6. Konfeti pada dialog Permainan Selesai** — `CompletionOverlay`:
  (a) buat komponen `Confetti` ringan (Animated + partikel warna, tanpa dep
  baru — `react-native-svg` sudah ada, atau `Animated.View` kotak kecil);
  (b) nyalakan saat dialog terbuka (sekali, durasi ~2–3s, jatuh + rotasi);
  (c) tampil di belakang kartu/tepi dialog; (d) juga dipakai ulang di popup tier
  naik (langkah 8) — taruh di `src/presentation/components/common/Confetti.tsx`.

- [x] **7. Hapus notifikasi tier di semua halaman** — (a) hapus pemakaian
  `TierChangeToast` di `GameScreen` (hapus state `tierToast`/effect deteksi);
  (b) di `MainMenuScreen` ganti `TierChangeToast` dengan popup dialog (langkah
  8); (c) `CompletionOverlay`: hapus blok "TIER UP!" (`result.tierChanged`),
  judul tetap "Papan Selesai!" — info naik tier pindah ke popup main menu;
  (d) hapus/arsipkan `TierChangeToast.tsx` bila tidak dipakai lagi (atau
  biarkan dipakai popup baru bila dimanfaatkan — prefer buat komponen dialog
  baru yang lebih lengkap).

- [x] **8. Popup dialog perubahan tier (hanya main menu)** — `MainMenuScreen`:
  (a) ganti `tierToast` (toast) → state `tierDialog: { tier, up } | null`;
  (b) deteksi tetap via `useFocusEffect` + `prevTierRef` (tier berubah saat
  kembali dari layar Game); (c) popup modal (pakai `AppModal` langkah 5):
  naik → judul "TIER UP! 🎉" + nama tier + filosofi + **konfeti** (langkah 6);
  turun → judul "Tier Turun" + ikon murung (🌧️/😔) + animasi redup/lembab
  (partikel hujan/abu-abu) — sesuaikan teks "XP kamu berkurang, level turun";
  (d) tombol [✕] / tap luar untuk menutup; (e) jangan tampil saat pertama kali
  menu di-fokus (baseline seed tanpa toast — pertahankan guard `prev != null`).

- [x] **9. Verifikasi menyeluruh** — `bun tsc -b --noEmit`, `bun test`,
  `bun lint` lolos; QA visual web (window sempit & lebar): login (orb bergerak),
  main menu (semua modal seragam + dialog tier naik/turun), in-game (clue
  terbaca penuh, action bar tidak overlap, zoom tetap jalan), popup selesai
  (konfeti); pastikan alur tier naik: main → selesai board → kembali ke menu →
  popup muncul (hanya di menu, tidak di layar Game).

## Catatan Revisi
- **9.** 2026-08-12: tsc bersih, bun test 43/43 pass, bun lint 0 problem
- **8.** 2026-08-12: MainMenu: dialog tier baru (AppModal) hanya di main menu — naik: judul TIER UP! + konfeti; turun: hujan murung (Confetti sad) + tier name/filosofi; deteksi useFocusEffect + prevTierRef (seed pertama tanpa dialog)
- **7.** 2026-08-12: TierChangeToast dihapus dari GameScreen & MainMenu, blok 'TIER UP!' dihapus dari CompletionOverlay (judul tetap Papan Selesai!), file TierChangeToast.tsx dihapus
- **6.** 2026-08-12: Komponen Confetti (Animated, tanpa dep baru, web-safe, prop sad) ditampilkan di CompletionOverlay & popup tier naik
- **5.** 2026-08-12: Komponen baru AppModal (header + tombol ✕ seragam 30px bulat + tap luar tutup + spring masuk) dipakai Kata Ajaib, Daftar Tier, Leaderboard, error AI, dialog tier; ConfirmDialog tetap tombol Batal/Lanjutkan untuk aksi berbahaya
- **4.** 2026-08-12: actionBar flexWrap rowGap 10 (inline JSX) + mode compactBar (winW<400): divider & label Petunjuk disembunyikan, revealGroup flexGrow space-between
- **3.** 2026-08-12: GameScreen clueMain dihapus numberOfLines={2} — teks clue selalu utuh, tinggi pill mengikuti teks (panel tetap dalam scroll)
- **2.** 2026-08-12: AuthScreen: 4 orb dengan idle bounce (Easing.inOut, fase/durasi berbeda, setTimeout stagger) + parallax scrollY via Animated.event + onScroll; ukuran orb proporsional orbSize()
- **1.** 2026-08-12: useWindowDimensions menggantikan Dimensions.get module-scope di AuthScreen/HistoryScreen (board viewer & crossword sudah pakai); bento main menu + orb login & padding scroll AuthScreen responsif (winH <700)

- (belum ada)
