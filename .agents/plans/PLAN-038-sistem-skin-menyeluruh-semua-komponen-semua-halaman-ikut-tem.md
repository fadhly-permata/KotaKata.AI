# Sistem skin menyeluruh: semua komponen semua halaman ikut tema (Winamp-like)

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 038`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "kok kayak gak merata ke apply ke semua komponen di aplikasi ya. Efek tema
> harus di terapkan ke semua komponen di semua halaman dong. Kedepannya gua
> akan bikin tema-tema lain dengan efek efek seperti ini, sehingga ada baiknya
> lu siapin agar semua komponen bisa diganti ganti temanya. Sebagai ilustrasi,
> gua pengen interface bisa berubah total kayak skin aplikasi winamp gitu"

**Tujuan:** menjadikan tema sebagai **SISTEM SKIN MENYELURUH** (mirip skin
Winamp) — setiap komponen di setiap halaman ikut berganti tema, bukan hanya
beberapa permukaan. Sekaligus menyiapkan fondasi agar tema-tema baru (dengan
efek berbeda) tinggal mendefinisikan token — tanpa mengubah komponen satu per
satu.

**Temuan audit (2026-08-16):** 28 file komponen memakai ±994 warna hex
hardcoded di luar registry tema (terbanyak: ThemePreviewModal 47, AuthScreen
34, MainMenuScreen 25, GameTopBar 5, dsb.) — inilah penyebab efek tema (mis.
bayangan neumorphic PLAN-037) terasa tidak merata: hanya permukaan yang sudah
dipasangi shadow yang ikut tema, sisanya tetap warna mati.

## Langkah

- [ ] **1. Perluas token tema (fondasi skin)** — tambahkan token generik di
  tipe `Theme`: `radius` (skala radius permukaan, opsional), `shadow`
  (sudah ada, PLAN-037), plus pastikan SEMUA warna UI punya token (mis.
  `surfaceRaised`, `controlBackground`, `controlText`, `inputBackground`,
  `overlay`, `chipBackground`, `badgeBackground`…). Registry tema lama mengisi
  nilai default; tema baru cukup definisikan token yang mau diubah.
- [ ] **2. Helper skin di `useTheme`** — sediakan helper terpusat, mis.
  `surfaceStyle(tone?)` / `controlStyle(variant)` / `neumorphicShadow` yang
  menggabungkan warna + radius + shadow sesuai tema — komponen tinggal
  memanggil, tidak lagi merakit manual.
- [ ] **3. Sapu bersih warna hardcoded di semua halaman & komponen** — ganti
  hex mati dengan token tema: AuthScreen, MainMenuScreen, SettingsScreen,
  ProfileScreen, AiProviderScreen, LogViewerScreen, ThemePreviewModal,
  CompletionOverlay, AppModal, ConfirmDialog, GameTopBar, SavedBoardList,
  TooltipButton, ErrorBoundary(opsional), dsb. Ikon/emoji/contoh warna tetap
  (mis. tombol "Mode AI", konfeti) boleh dikecualikan dengan catatan.
- [ ] **4. Terapkan efek skin (shadow/radius) ke semua permukaan** — kartu,
  panel, tombol, input, chip, modal/dialog, list item, keyboard, grid —
  konsisten di semua halaman (bukan hanya yang sudah terpasang).
- [ ] **5. Verifikasi & rilis** — tsc + tes + lint, cek visual semua halaman di
  web (light/dark, beberapa tema), regenerate seed SQL + push, commit, deploy.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 038 <no> "teks"`)_
