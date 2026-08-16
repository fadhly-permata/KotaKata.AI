# Semua tombol dapat efek neumorphism (pertahankan warna)

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 039`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Pas pake tema neumorphic kok kayaknya banyak tombol yang gak ada efek
> neumorphism ya? Pastikan semua tombol punya efek yang sama, tapi pertahankan
> warnanya"

**Masalah:** di PLAN-038/037 efek neumorphic (`neumorphicShadow`) hanya dipasang
di sebagian permukaan — kartu/panel/halaman tertentu. Banyak TOMBOL masih
tanpa efek: tombol berwarna (primary/secondary/error/accent) dan tombol
sekunder (`secondaryContainer`) di ConfirmDialog, CompletionOverlay, Settings,
Profile, AiProvider, LogViewer, SavedBoardList, GameScreen (retry), Markdown,
TopBar, TooltipButton, MainMenu (play/bento/magic/aiError), Store
(activate/preview), GameTopBar (back/themeToggle), dsb.

**Tujuan:** SEMUA tombol di semua halaman mendapat efek neumorphism yang sama
saat tema Neumorfik aktif — **tanpa mengubah warna tombol** (primary tetap
primary, secondaryContainer tetap secondaryContainer, dst).

**Pendekatan (draf):**
1. Tambah helper ringan di `skin.ts`: `buttonShadow(theme)` → `neumorphicShadow(theme.shadow)`
   (kembali `{}` untuk tema tanpa shadow, jadi aman dipakai di semua tombol).
2. Sapu SEMUA tombol (TouchableOpacity dengan backgroundColor) di semua file:
   tambahkan `buttonShadow(theme)` di style array — warna tombol TIDAK diubah.
3. Catatan teknis: bayangan spec neumorfik (terang kiri-atas + gelap
   kanan-bawah) dipakai juga di tombol berwarna — efek "soft plastic 3D"
   sesuai permintaan; `neumorphicShadow` otomatis menetralkan shadow* legacy.
4. Verifikasi: tsc + tes + lint, cek visual web (tema Neumorfik), commit +
   push + deploy web (aturan #6).

## Langkah

- [x] **1. Helper `buttonShadow(theme)` di `skin.ts`** — `neumorphicShadow(theme.shadow)`, no-op untuk tema tanpa shadow
- [x] **2. Sapuan tombol halaman** — MainMenu (play/bento/magic/aiError), Store (preview/aktifkan)
- [x] **3. Sapuan tombol komponen bersama** — ConfirmDialog, CompletionOverlay, TopBar, TooltipButton trigger (otomatis mencakup GameTopBar back/themeToggle, CluePill arrows, GameActionBar)
- [x] **4. Sapuan tombol halaman lain** — Settings, Profile (hapus akun), AiProvider (preset/aksi), LogViewer (log/filter/pager), SavedBoardList (resume), GameScreen retry, Markdown retry
- [x] **5. Verifikasi tsc + tes + lint + commit + push + deploy web**

## Catatan Revisi

- **2.** 2026-08-16: Dikerjakan tuntas: helper buttonShadow + sapuan semua tombol (commit c7927af)
