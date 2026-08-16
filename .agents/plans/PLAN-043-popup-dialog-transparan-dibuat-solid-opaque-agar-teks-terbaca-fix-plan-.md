# Popup dialog transparan dibuat solid/opaque agar teks terbaca (fix PLAN-040)

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 043`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi:
> - revisi plan 40: pada revisi tersebut kan ada popup dialog yang transparan
>   tuh. kayaknya jangan dibuat transparan deh. Karna jangan overlap (tumpang
>   tindih) dengan objek dibelakangnya., sehingga tulisan yang ada di dalamnya
>   jadi sulit kebaca."

**Masalah:** tema PLAN-040 yang bergaya glass (Glassmorphism, Frost UI) memakai
permukaan `surface` ber-`rgba` transparan. `AppModal` (dan dialog lain yang
memakai `surfaceStyle`) jadi **tembus pandang** — objek/latar di belakang dialog
terlihat menembus sehingga teks sulit dibaca.

**Tujuan:** kartu DIALOG/POPUP harus **solid/opaque** (tidak transparan) di
semua tema, supaya tidak tumpang tindih visual dengan objek di belakangnya dan
teks selalu terbaca. Efek glass/frost tetap dipertahankan di elemen NON-dialog
(kartu halaman, panel, dll.).

## Langkah

- [x] **1. Identifikasi semua permukaan dialog** — `AppModal` (card), `ConfirmDialog`
  (card), `CompletionOverlay`, modal History/GameHistory/Profile (sheet), modal
  preview Pasar, dialog konfirmasi hint in-game — cari yang memakai `surfaceStyle`
  / `theme.colors.surface` / warna `rgba` transparan sebagai latar kartu.
- [x] **2. Helper skin: warna surface SOLID** — di `skin.ts` tambahkan helper
  (mis. `solidSurface(theme)` / `surfaceColorOpaque(theme)`): kalau warna surface
  berformat `rgba(...)`, blend di atas warna `background` tema → warna hex solid;
  kalau sudah solid, kembalikan apa adanya. (Modal overlay/backdrop tetap gelap
  semi-transparan — hanya KARTU yang disolidkan.)
- [x] **3. Terapkan ke dialog** — kartu `AppModal` + `ConfirmDialog` + dialog lain
  memakai warna solid tersebut (radius/bayangan/skin tetap). Pastikan teks di
  dalamnya kontras (dark glass → teks gelap di atas kartu solid terang; jangan
  sampai teks putih di kartu putih).
- [x] **4. Verifikasi** — tsc + tes + lint; cek visual web tiap tema glass/frost:
  buka Kata Ajaib/Daftar Tier/Leaderboard/Preview — kartu dialog solid, teks
  terbaca, elemen di belakang tidak menembus; tema lain tidak berubah.

## Catatan Revisi

- **4.** 2026-08-16: Dikerjakan: skin.ts tambah solidSurfaceColor (blend rgba surface di atas background) + surfaceStyleOpaque; diterapkan ke kartu AppModal (semua dialog), ConfirmDialog, CompletionOverlay, sheet HistoryScreen, modal hapus akun ProfileScreen, aiCard MainMenu; tsc + 43 tes + lint lolos
