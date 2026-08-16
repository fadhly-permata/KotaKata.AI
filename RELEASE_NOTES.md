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
| **PLAN-009** | ✅ done | Responsif UI + Orb Login + In-Game + Dialog Seragam + Konfeti + Dialog Tier | 9 langkah: responsivitas lintas resolusi (`useWindowDimensions` di Auth/History/Game/MainMenu; orb, bento, padding proporsional), **orb login animated** (4 orb bounce + parallax scroll), **clue in-game terbaca penuh** (tanpa `numberOfLines`), **action bar responsif** (flexWrap + mode compact <400px), komponen **`AppModal`** seragam (header + tombol ✕ + tap di luar tutup) dipakai semua popup, **konfeti ringan** (Animated, web-safe) di dialog permainan selesai, **hapus semua notifikasi tier** (toast + "TIER UP!"), **dialog perubahan tier baru HANYA di main menu** (naik = konfeti 🎉, turun = hujan murung 🌧️); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-010** | ✅ done | Konfeti Layar Penuh + ESC Tutup Popup + Panel Profile Kata Ditemukan/Sejarah | 4 langkah: **konfeti & hujan seluruh layar** (`AppModal` prop `confetti="celebrate"/"sad"` — dirender paling atas Modal, pointerEvents none; `CompletionOverlay` konfeti ke lapisan teratas), **tombol ESC tutup semua popup** (hook `useEscapeClose` web-only: `AppModal` ESC=close ikut `dismissable`, `ConfirmDialog` ESC=Batal, `CompletionOverlay` ESC=kembali ke halaman game untuk review soal & jawaban), **Profil**: label "Kata Terpecahkan" → "Kata Ditemukan" + panel baru "Sejarah Permainan" (`boardRepository.countFinished`), keduanya tappable → navigate History / GameHistory; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-011** | ✅ done | Bersihkan Singkatan Kuno (pd/dl/krn) di Semua Clue Tier | 4 langkah: **audit lengkap** (308 baris tier 6–10 memuat singkatan kuno), **script `modernize-clues.mjs`** — penggantian kata baku dengan word-boundary + auto-resolve konflik QA dari cache riset PLAN-007 + override kurasi manual `modernize-overrides.mjs` (210 kata), **jalankan + QA + SQL**: 308 baris dimodernisasi, `check-clue-quality` 0 issue / 0 bocor / 0 duplikat semua tier, `vocabulary.sql` di-regenerate, **push ke Supabase + verifikasi final**: singkatan kuno = **0**, placeholder "Merupakan kata" tetap 0, total row 10.003 |
| **PLAN-012** | ✅ done | Reveal XP Fair + Progress Ring & Theme Toggle di Header In-Game | 5 langkah: **reveal letter/word tidak lagi memotong XP saat tidak ada sel yang berubah** (sel kosong → diisi, sel salah → diganti benar; kalau semua huruf sudah benar/terkunci reveal batal total — tombol ikut dinonaktifkan), **animasi zoom-out** pada huruf yang baru di-reveal/diganti (`revealedPulse` transien + `RevealPulseLetter`), **progress bar garis dihapus** dari pill clue (posisinya offset), **progress ring persentase pindah ke header** di samping label XP (hanya tampil di dalam game), **tombol switch cepat tema terang/gelap** di header; verifikasi tsc + 43 tes lolos |
| **PLAN-013** | ✅ done | Halaman Pasar (Store), Perbaikan Fullscreen & Refactor Kode | 7 langkah: **semua halaman tidak lagi tampak fullscreen** (safe-area inset status bar di `TopBar` — History/GameHistory/BoardViewer/Profile/Settings/LogViewer/AiProvider — plus Main Menu & Login; Game sudah dibereskan di rilis sebelumnya), **refactor maintainability**: helper papan `gameStore` dipisah ke `gameBoardHelpers.ts`, `GameScreen` (±1.570 → 1.213 baris) dipecah ke komponen `GameTopBar`/`CluePill`/`GameActionBar`, orb dekoratif jadi komponen bersama `FloatingOrbs` (dipakai Main Menu & Login), **tombol "Pasar" memanjang di paling bawah Main Menu** → halaman Store, **halaman Store** dengan katalog tema (`themeCatalog.ts`) — 1 tema bawaan "Puitis" (mendukung terang/gelap) dipilih sebagai default, struktur siap dikembangkan jadi tema berbayar; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-014** | ✅ done | Multi-Tema: Pasar dengan Katalog dari Database + Tema Papan & Keyboard | 6 langkah: **registry tema** (`themeData.ts` — 4 tema aplikasi Puitis/Samudra/Senja/Hutan, 3 tema papan Puitis/Tinta/Neon, 3 tema keyboard Puitis/Pastel/Klasik, semua light & dark), **store pilihan + ThemeProvider** (`themeSelectionStore` zustand + AsyncStorage: `appThemeId`/`boardThemeId`/`keyboardThemeId`; provider me-resolve palet global/papan/keyboard), **komponen game memakai tema spesifik** (CrosswordGrid/CluePill/GameActionBar → tema papan; InGameKeyboard → tema keyboard), **database `themes`** (migrasi + RLS read-publik, PK komposit `(id, kind)`, generator `gen-themes-sql.mjs` → `supabase/data/themes.sql`, `push-themes.mjs`, `themeRepository` fetch katalog cloud), **halaman Pasar 3 seksi** (Tema Aplikasi / Papan / Keyboard — ambil dari DB dengan fallback registry lokal, kartu bisa langsung diaktifkan, `themeCatalog.ts` lama dihapus); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-015** | ✅ done | Tombol Preview Tema di Pasar | 3 langkah: **modal preview** (`ThemePreviewModal`) dengan mockup sesuai jenis tema — aplikasi (halaman utama), papan (grid + clue pill + panel hint), keyboard (baris tombol + nav) — diwarnai palet tema yang di-preview + toggle terang/gelap; **kartu Pasar** dapat tombol "👁 Preview" di samping "Aktifkan" (model kartu diperluas dengan palet lengkap light/dark dari DB/registry lokal); preview murni state UI, tidak mengubah pilihan sebelum aktivasi; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-016** | ✅ done | Aturan Release GitHub, Script Build EAS & Fix Clue Auto-Height | 4 langkah: **aturan release di AGENTS.md** (rilis GitHub WAJIB atas nama Fadhly Permata — `gh` di workspace memakai kredensial GitHub App platform sehingga release dari sini tercatat atas nama app, bukan pemilik; karena itu release selalu dipersiapkan di sini lalu dipublish pemilik dari akunnya sendiri), **script build EAS** (`scripts/expo-build.mjs` — baca `EXPO_TOKEN` dari env/.env.local/.env, default android+preview, dukung `ios`/`all production`/`--list`, plus npm script `build:eas`), **fix clue auto-height di HP** (`CluePill` & panel bawah diberi `flexShrink: 0` agar pill tidak pernah disusutkan Yoga saat keyboard virtual tampil di layar ponsel — tinggi pill selalu mengikuti teks); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-017** | ✅ done | Background Image & Gradien untuk Semua Tema | 6 langkah: **BackgroundSpec** (`color`, `gradient`, `direction`, `imageUrl`, `overlay`) dipasang di palet app/papan/keyboard — 4 tema aplikasi + 3 tema papan + 2 tema keyboard diberi gradien, **komponen `ThemedBackground`** (solid → gradien react-native-svg → gambar `ImageBackground` → overlay kontras, tanpa modul native baru), **`ThemeProvider`** expose `background`/`boardBackground`/`keyboardBackground`, **`ScreenFade` otomatis merender latar tema aplikasi** di belakang semua halaman, **GameScreen pakai latar tema papan** & **InGameKeyboard pakai latar tema keyboard** (MarkdownScreen dibuat transparan), **Pasar**: mockup preview merender gradien + objek `background` diloloskan dari DB/registry (seed SQL regenerated & di-push); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-018** | ✅ done | Keseragaman Tema, Tema Suara & Gambar Latar, Orb Semua Halaman, Dialog Keluar, Deploy Web | 7 langkah: **keseragaman tema** — tiap tema aplikasi (Puitis/Samudra/Senja/Hutan) kini punya versi **papan & keyboard dengan nama sama** (palet diturunkan dari palet app; total katalog 4 app · 6 papan · 6 keyboard), **tema gambar background** — `imageUrl` dipasang di tema aplikasi **Samudra** & **Senja** (foto latar + overlay kontras, gradien tetap fallback), **tema suara** — tiap tema aplikasi punya `SoundSpec` (rate + volume, tanpa aset audio baru) yang diterapkan ke semua efek suara via `playbackRate`/`volume` (Puitis=Klasik, Samudra=Tenang, Senja=Hangat, Hutan=Segar), **orb di semua halaman** — komponen reusable `AmbientOrbs` (24 orb random, warna palet tema, fase gerak berbeda, satu native driver) dirender otomatis oleh `ScreenFade` (Main Menu & Login matikan karena sudah punya FloatingOrbs), **dialog keluar** — `ConfirmDialog` dapat ikon di tombol (`confirmIcon`/`cancelIcon`) + tata letak responsif (vertikal di layar sempit, horizontal di layar lebar), **deploy web EAS** — `scripts/expo-deploy-web.mjs` + npm `deploy:web` (export web → `eas deploy` EAS Hosting) → web live di expo.dev; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-019** | ✅ done | Backsound Suara Latar per Tema (URL Online) | 6 langkah: **`AmbientSoundSpec`** di registry tema — tiap tema aplikasi (Puitis/Samudra/Senja/Hutan) punya `ambient: { label, url, volume? }` dengan **URL MP3 online terverifikasi** (rintik hujan lembut, ombak laut, jangkrik malam, hujan di hutan — Mixkit CDN, loop siap pakai), **pemutar backsound di `sound.ts`** — `setAmbientSound(spec)` loop pelan (default 0.3) via expo-audio (native) & HTMLAudioElement (web, dengan retry saat gestur pertama karena autoplay policy browser), ikut pause saat suara dimatikan, **wire `ThemeProvider`** — backsound berganti otomatis saat tema aplikasi berubah, **seed DB** — generator membawa `ambient` dalam jsonb palet (light & dark), regenerated & di-push (4 tema app terverifikasi punya backsound), **halaman Pasar** — kartu tema aplikasi menampilkan chip "🎵 Backsound: <label>"; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-020** | ✅ done | Switch on/off Backsound di Pengaturan | 2 langkah: **preferensi `kotakata.ambientEnabled`** (default nyala, tersimpan AsyncStorage) **terpisah dari efek suara** — `isAmbientEnabled`/`loadAmbientPrefs`/`setAmbientEnabled` di `sound.ts`, backsound hanya diputar kalau efek suara DAN backsound sama-sama nyala, web ikut memuat preferensi; **baris "Backsound Tema" + Switch** di halaman Pengaturan (bawah "Efek Suara", dengan hint suara latar tema), seksi di-rename "Tampilan & Suara"; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-021** | ✅ done | Backsound Langsung Aktif Saat App Start | 2 langkah: **fix race preferensi** — `sound.ts` expose `whenSoundPrefsReady()` (selesai saat efek suara & backsound dibaca dari AsyncStorage; `loadSoundPrefs`/`loadAmbientPrefs` menandai di `finally`), `ThemeProvider` menunggu sebelum `setAmbientSound` pertama → backsound tidak sempat berbunyi walau setting suara mati; **hint web autoplay** — `subscribeAmbientStatus` + komponen `AmbientSoundHint` (pill "🔊 Ketuk layar untuk memutar suara latar", hilang sendiri 6 dtk) dirender di `ScreenFade` (semua halaman, native tidak dirender); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-022** | ✅ done | Hapus Login Email di Halaman Login | 4 langkah: **AuthScreen** — mode email, form, link "Atau masuk dengan email", state/handler, style mati dihapus (login = Google + Guest saja); **useAuth** — `signInWithEmail`/`signUpWithEmail`/`linkEmail` dihapus (tidak dipakai di tempat lain); **dokumen** README/GUIDE/TERMS/PRIVACY disinkronkan ("login Google/email" → "login Google"); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-023** | ✅ done | Force Close Random (Android 12–15) | Ditangguhkan dulu (keputusan pemilik) → **dikerjakan batch 2026-08-16**: mitigasi force close — animasi orb/bounce hanya berjalan saat layar fokus (AmbientOrbs/MainMenu/Auth), backsound crossfade; verifikasi device Android disarankan |
| **PLAN-024** | ✅ done | Force Close Scroll Main Menu (Android 9) | Ditangguhkan dulu (keputusan pemilik) → **dikerjakan batch 2026-08-16**: mitigasi force close saat scroll — animasi orb/bounce hanya saat layar fokus; verifikasi device Android 9 disarankan |
| **PLAN-025** | ✅ done | Hapus react-native-svg dari ThemedBackground | 3 langkah: **gradien non-SVG** — `ThemedBackground.tsx` ditulis ulang dengan lapisan `View` berwarna bertumpuk (10 band, `interpolateHex`/`buildBands`, arah vertical/horizontal/diagonal via rotate+scale dalam wadah overflow hidden), warna solid dasar + `ImageBackground` (gambar URL) + overlay tetap; **komentar `themeData.ts`** disesuaikan; `react-native-svg` TIDAK dihapus dari package.json (masih dipakai `ProgressRing` & 5 ikon — keputusan terpisah); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-026** | ✅ done | Tier 1 & 2 terlalu sulit — cek ulang soal | 6 langkah: kurasi ulang **semua tier** (1–10, 1000 kata/tier, total 10.000) — tier 1 kata konkret mudah, tier 2 buang kata tugas abstrak, bentrok antar tier di-resolve, clue tidak nyambung/absurd dibuang ("Airan", "Airnya", dll), SQL di-regenerate & di-push ke Supabase + script verifikasi (HTTP 201, 1000 kata/tier) |
| **PLAN-027** | ✅ done | Bug force close Android saat scroll main menu (dugaan resolusi tinggi) | 3 langkah: **mitigasi** — orb & bounce loop hanya beranimasi saat layar fokus (tidak menumpuk native-driver loop antar halaman di stack); parallax scroll tetap jalan; verifikasi di 3 device Android (14/15) disarankan |
| **PLAN-028** | ✅ done | Suara efek hilang di beberapa tema + autoplay backsound web | 3 langkah: **web** — backsound di-autoplay saat masuk game (`ensureAmbientPlaying` di GameScreen) + retry gestur lebih agresif; **efek suara web** tidak hilang saat init belum selesai (pending play di-flush setelah init) + `playbackRate` diset defensif; URL backsound 4 tema diverifikasi hidup (HTTP 200) |
| **PLAN-029** | ✅ done | Transisi looping suara latar lebih halus | 3 langkah: loop backsound memakai **crossfade dua slot** (fade 2 dtk, maks 20% durasi) — slot kedua mulai dari awal saat slot pertama hampir habis, perpindahan tidak terasa putus; properti `loop` tetap jadi jaring pengaman |
| **PLAN-030** | ✅ done | Hapus login tamu — wajib login Google | 3 langkah: tombol & handler guest dihapus (AuthScreen/useAuth), **session anonim dikeluarkan otomatis** (RootNavigator — termasuk yang tersisa dari build lama), Profil tidak lagi menampilkan "Hubungkan Akun", dokumen (README/GUIDE/TERMS/PRIVACY) disinkronkan |
| **PLAN-031** | ✅ done | Title HTML web "KotaKata AI" | 3 langkah: `public/index.html` (title dasar) + **title per rute** "KotaKata AI - <Halaman>" (mis. "KotaKata AI - Beranda") via `onStateChange` di RootNavigator |
| **PLAN-032** | ✅ done | Sejarah & kata ditemukan jadi card masonry ukuran acak | 3 langkah: **card masonry** di HistoryScreen (kata ditemukan) & GameHistoryScreen (sejarah permainan) — bukan list baris lagi: tinggi card acak tapi **deterministik** (util `src/utils/masonry.ts`, hash FNV-1a dari id item: normal 132–204px, lebar 156–216px), ~18% card memenuhi satu baris penuh (variasi width), pasangan 2 kolom flex; **lazy load tetap** (FlatList + paging 25 + onEndReached/onScroll + footer); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-033** | ✅ done | Hapus tema papan & keyboard dari pasar | 3 langkah: Pasar hanya menjual **Tema Aplikasi** (seksi papan/keyboard dihapus dari StoreScreen, teks hero diperbarui); **papan & keyboard selalu mengikuti tema aplikasi** — ThemeProvider me-resolve `getBoardThemeById(appThemeId)` / `getKeyboardThemeById(appThemeId)`; registry data tetap ada untuk rencana desain ulang; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-034** | ✅ done | Toolbar In-Game responsif (fix Android 9) | 3 langkah: `GameActionBar` radius pill 999 → **22** (panel membungkus 2 baris di layar sempit — pill 999 tampak kapsul raksasa/offset di Android 9); `GameTopBar` responsif (padding/gap mengecil saat compact, divider disembunyikan, ProgressRing 30px, XP pill flexShrink, `maxFontSizeMultiplier` 1.2); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-035** | ✅ done | Panel hint in-game ringkas: swipe kanan-kiri + panah navigasi | 3 langkah: `GameActionBar` dirombak jadi **pager horizontal 3 halaman** (Zoom / Petunjuk / Alat Reset+Keyboard) — ScrollView pagingEnabled snap halus, **panah ◀ ▶** (NextIcon) di kanan-kiri seperti CluePill, opacity panah mengikuti scroll (interpolate Animated), indikator titik halaman; panel kini setinggi 1 baris (hemat ruang); verifikasi tsc + 43 tes + lint lolos |
| **PLAN-036** | ✅ done | Tema Neumorfik (neumorphism) + backsound & sound efek | 3 langkah: tema aplikasi **Neumorfik** (soft-UI abu lembut + aksen biru baja, light & dark) + **board/keyboard theme id sama** (ikut PLAN-033) + **SoundSpec "Lembut"** (rate 0.85, volume 0.75) + **ambient "Kicau burung pagi"** (mixkit 2472, URL diverifikasi HTTP 200); seed `themes.sql` diregenerate (19 tema) & **di-push ke Supabase**; verifikasi tsc + 43 tes + lint lolos |
| **PLAN-037** | ✅ done | Rombak tema Neumorfik jadi gaya neumorphism.io | 3 langkah: palet dirombak — **surface = warna latar** (`#e0e5ec` light / `#1f2429` dark), aksen biru `#3d5afe`, border halus; spec baru **`NeumorphicShadowSpec`** + util `neumorphicShadow()` (prop `boxShadow` dua bayangan: terang kiri-atas + gelap kanan-bawah, nilai klasik 9/16 — jalan di RN native & web); bayangan timbul diterapkan ke kartu Pasar, TopBar, panel hint + tombol, keyboard keys, kartu riwayat; board/keyboard ikut senada; seed di-push ke Supabase; tsc + 43 tes + lint lolos |
| **PLAN-039** | ✅ done | Semua tombol dapat efek neumorphism (warna dipertahankan) | 1 langkah besar: helper `buttonShadow(theme)` di `skin.ts` (no-op untuk tema tanpa shadow) + sapuan SEMUA tombol di semua halaman — MainMenu (play/bento/magic/aiError), Store (preview/aktifkan), ConfirmDialog, CompletionOverlay, TopBar, **TooltipButton jadi titik pusat otomatis** (mencakup back/themeToggle GameTopBar, panah clue, tools panel), Settings, Profile (hapus akun), AiProvider (preset/aksi), LogViewer (log/filter/pager), SavedBoardList (resume), GameScreen & Markdown (retry); tombol outline (border-only) sengaja tanpa emboss; tsc + 43 tes + lint lolos |
| **PLAN-038** | ✅ done | Sistem skin menyeluruh (Winamp-like) | 5 tahap: **(T1)** fondasi skin — token `radius` + warna generik (overlay/chip/input/textOnPrimary) di tipe `Theme` + helper `skin.ts` (surfaceStyle/chipStyle/inputStyle/overlayColor/textOnPrimary/contrastText) + nilai Neumorfik; **(T2)** AuthScreen & MainMenu ikut tema (palet AUTH_LIGHT/DARK dihapus, orb/hero/bento/XP pill pakai token tema); **(T3)** Settings/Profile/AiProvider/LogViewer (warna mati → error/success/border/overlay/textOnPrimary); **(T4)** komponen bersama & in-game (AppModal/ConfirmDialog/CompletionOverlay/GameTopBar/SavedBoardList/Store — overlay & kartu surfaceStyle, badge & pill token); **(T5)** sapuan akhir (HistoryScreen/BoardViewer/Markdown/GameScreen/CrosswordGrid). Efek skin (bayangan neumorfik + radius) kini merata ke semua permukaan; tsc + 43 tes + lint lolos, tiap tahap di-commit & di-push |

**Progres fase inti (checkpoint):** 19/19 phase `completed` — lihat `.agents/checkpoint.json`.

---

## 📦 Rilis per Plan

### v1.3.2 — Mitigasi Force Close, Audio Halus, Login Google Wajib & Title Web (PLAN-023/024/027–031)

- 🛡 **Mitigasi force close Android saat scroll (PLAN-023/024/027)** — semua animasi orb & bounce (komponen bersama `AmbientOrbs` di semua halaman + orb Main Menu/Login) kini **hanya berjalan saat layar mendapat fokus**. Sebelumnya setiap halaman yang pernah dibuka menjalankan native-driver loop 24 orb selamanya walau tertutup layar lain — beban animasi menumpuk di perangkat kelas menengah. Sekarang hanya layar yang terlihat yang beranimasi. (Verifikasi di device Android tetap disarankan.)
- 🔊 **Backsound autoplay di web saat masuk game (PLAN-028)** — `ensureAmbientPlaying()` dipanggil saat layar Game dibuka (dalam konteks gestur user, jadi browser lebih mungkin menyetujui autoplay); retry gestur (ketuk/keyboard/touch) juga lebih agresif — dicoba lagi kapan pun backsound belum terdengar.
- 🎵 **Efek suara web tidak "hilang" (PLAN-028)** — suara yang diminta sebelum inisialisasi efek selesai (tap sangat cepat di awal) kini diputar ulang begitu siap; `playbackRate` diset defensif sehingga tidak pernah memblokir `play()`. URL backsound 4 tema diverifikasi hidup (HTTP 200).
- 🔄 **Looping suara latar mulus (PLAN-029)** — backsound kini memakai **crossfade dua slot**: ~2 detik sebelum akhir, slot kedua mulai dari awal dengan volume naik sementara slot pertama turun — perulangan tidak lagi terasa "putus". Properti `loop` tetap sebagai jaring pengaman.
- 🔐 **Login Google wajib (PLAN-030)** — tombol "Lanjut sebagai Tamu" dihapus; game hanya bisa dimainkan user yang login Google. Session anonim yang tersisa (dari build lama) otomatis dikeluarkan saat app dibuka. Profil tidak lagi menampilkan "Hubungkan Akun"; dokumen (README/GUIDE/TERMS/PRIVACY) disinkronkan.
- 🌐 **Title tab web (PLAN-031)** — title HTML kini "KotaKata AI" dan berganti per halaman: "KotaKata AI - Beranda", "KotaKata AI - Bermain", dst.

### v1.3.5 — Neumorfik Gaya Neumorphism.io (PLAN-037)

- 🎨 **Tema Neumorfik dirombak jadi gaya neumorphism.io** — latar abu lembut `#e0e5ec` (light) / `#1f2429` (dark) dengan **permukaan memakai warna SAMA dengan latar**, sehingga elemen tampak "timbul" lewat **bayangan ganda**: terang di kiri-atas + gelap di kanan-bawah (nilai klasik neumorphism.io). Aksen biru `#3d5afe` (light) / `#7d9bff` (dark).
- ✨ Bayangan timbul diterapkan ke elemen kunci: **kartu di Pasar, header (TopBar & header in-game), panel hint + tombol, tombol keyboard, kartu riwayat** — otomatis hanya aktif saat tema Neumorfik dipilih (tema lain tidak berubah).

### v1.3.7 — Semua Tombol Dapat Efek Neumorphism (PLAN-039)

- 🔘 **Semua tombol kini dapat efek neumorphism yang sama** saat tema Neumorfik aktif — **warna tombol tetap dipertahankan** (primary/secondary/error/accent/container apa adanya), hanya bayangan timbul yang ditambahkan secara konsisten.
- 🧰 Helper baru `buttonShadow(theme)` di `skin.ts` — satu baris yang disapu ke semua tombol semua halaman; `TooltipButton` (tombol ikon: kembali, toggle tema, panah clue, tools panel hint) otomatis kena efek dari satu titik pusat.
- 📋 Tombol yang ikut kena efek: play & kartu bento & popup di Main Menu, Pasar (Preview/Aktifkan), ConfirmDialog, layar selesai (Main Lagi/Lihat Papan/Beranda), TopBar, Pengaturan, Profil (Hapus Akun), Provider AI, Log (kirim/hapus/filter/pager), papan tersimpan, tombol Coba Lagi.
- ⚪ Tombol outline (border-only, tanpa isi warna) sengaja tidak diberi efek emboss — bayangan timbul butuh permukaan berisi.

### v1.3.6 — Sistem Skin Menyeluruh, Semua Halaman Ikut Tema (PLAN-038)

- 🎨 **Sistem skin menyeluruh (Winamp-like)** — efek tema (warna, radius, bayangan neumorfik) kini merata ke **semua komponen di semua halaman**, bukan hanya sebagian permukaan. Sebelumnya ada ±994 warna hex hardcoded di 28 file komponen di luar registry tema; sekarang hampir semuanya memakai token tema / helper skin.
- 🧰 **Fondasi skin untuk tema masa depan** — token `radius` + warna generik (`overlay`, `chipBackground/Text`, `inputBackground/Border`, `textOnPrimary`) di tipe `Theme`, plus helper terpusat `skin.ts`: `surfaceStyle()` (warna+radius+bayangan), `chipStyle()`, `inputStyle()`, `overlayColor()`, `textOnPrimary()`, dan `contrastText()` (teks kontras otomatis berdasar luminance WCAG — dipakai teks di atas warna arbitrer seperti kartu bento & tombol Aktifkan). Tema baru cukup mendefinisikan token, tanpa mengubah komponen satu per satu.
- 🏠 **Halaman login & main menu ikut tema** — palet hardcoded login dihapus (sebelumnya selalu ungu-pink), kini mengikuti tema aplikasi aktif; orb, hero card, kartu bento, XP pill memakai warna tema dengan teks kontras otomatis.
- 🔲 **Permukaan "timbul" merata** — kartu dialog (AppModal), backdrop semua modal, papan crossword, badge Mode AI, kartu papan tersimpan, dan lain-lain kini ikut bayangan/radius tema; tema selain Neumorfik tetap tampil seperti biasa.
- ⚪ **Pengecualian tercatat** — tooltip tetap netral gelap (mengambang di atas konten bertema apa pun), konfeti & palet fallback ThemePreviewModal sengaja dibiarkan.

### v1.3.4 — Panel Hint Swipe + Tema Neumorfik (PLAN-035–036)

- 👉 **Panel hint in-game jadi pager swipe (PLAN-035)** — semua tombol (zoom, petunjuk, reset & keyboard) dibagi jadi 3 halaman yang bisa **di-swipe kiri/kanan** dengan **panah ◀ ▶** di kanan-kiri (seperti navigasi soal) + indikator titik. Panel kini hanya **setinggi satu baris** — tidak lagi memakan banyak ruang layar; transisi antar halaman halus (snap per halaman, opacity panah mengikuti scroll).
- 🎨 **Tema Neumorfik (PLAN-036)** — tema baru bergaya **neumorphism** di Pasar: permukaan senada abu lembut dengan aksen biru baja (light & dark), papan & keyboard ikut senada. **Backsound "Kicau burung pagi"** (URL online terverifikasi) dan **sound efek "Lembut"** (playback lebih pelan & halus) otomatis aktif saat tema dipilih.

### v1.3.3 — Card Masonry Riwayat, Pasar Hanya Tema Aplikasi & Toolbar In-Game Responsif (PLAN-032–034)

- 🧱 **Halaman Sejarah Permainan & Kata Ditemukan jadi card masonry (PLAN-032)** — bukan list baris lagi: setiap card punya tinggi & lebar yang bervariasi (acak tapi stabil — tidak berubah saat scroll), tetap rapi dalam tata letak 2 kolom + sesekali card lebar penuh. Lazy load (paging 25) tetap berjalan.
- 🎨 **Pasar hanya menjual Tema Aplikasi (PLAN-033)** — seksi "Tema Papan" & "Tema Keyboard" dihapus untuk sementara (menunggu rencana desain ulang pemilik). **Papan & keyboard kini selalu mengikuti tema aplikasi yang aktif** — ganti tema aplikasi otomatis mewarnai papan & keyboard senada.
- 📐 **Toolbar In-Game responsif (PLAN-034)** — panel aksi tidak lagi tampak kebesaran/offset di layar Android lama (Infinix Hot 8): radius panel diperbaiki untuk tampilan 2 baris, header menyusut di layar sempit, dan teks tidak membesar berlebihan saat font-scale besar.

### v1.3.1 — Backsound Suara Latar per Tema (PLAN-019)

- 🎵 **Backsound latar otomatis mengikuti tema aplikasi aktif** (loop pelan, tidak menenggelamkan efek suara game):
  - **Puitis** → rintik hujan lembut · **Samudra** → ombak laut · **Senja** → jangkrik malam · **Hutan** → hujan di hutan.
- 🔊 Sumber: URL MP3 online (Mixkit CDN, lisensi bebas royalti) — butuh jaringan; saat offline backsound diam tanpa error.
- 🎚 Backsound ikut mati saat suara dimatikan (toggle suara) dan kembali menyala saat dihidupkan.
- 🛍 Halaman **Pasar**: kartu tema aplikasi kini menampilkan chip **"🎵 Backsound: <nama suara>"** (dari katalog database maupun fallback offline).
- ⚙️ Ganti/menambah suara cukup ubah `ambient` di `themeData.ts` → `bun scripts/db/gen-themes-sql.mjs` → push seed.

### v1.3.0 — Keseragaman Tema, Tema Suara, Orb Semua Halaman, Dialog Keluar & Web Deploy (PLAN-018)

- 🧩 **Keseragaman tema** — setiap tema aplikasi kini punya versi **papan & keyboard dengan nama yang sama**: Samudra, Senja, dan Hutan (sebelumnya hanya Puitis) — paletnya diturunkan dari palet aplikasi supaya ganti tema tetap senada. Katalog Pasar sekarang: **4 tema aplikasi · 6 tema papan · 6 tema keyboard** (Tinta/Neon & Pastel/Klasik tetap ada sebagai gaya alternatif)
- 🖼 **Tema dengan GAMBAR latar** — tema aplikasi **Samudra** (foto laut) & **Senja** (foto senja) kini memakai foto latar di mode terang & gelap, dengan overlay kontras supaya teks tetap terbaca; saat offline/gagal dimuat, gradien & warna solid tetap tampil (fallback otomatis)
- 🔊 **Tema suara** — tiap tema aplikasi punya kepribadian audio (tanpa aset audio baru): **Puitis** = Klasik (normal), **Samudra** = Tenang (lebih pelan & lembut), **Senja** = Hangat, **Hutan** = Segar (lebih cepat). Diterapkan ke SEMUA efek suara game (ketuk, huruf, kata benar/salah, menang, popup, hint) lewat `playbackRate` + `volume` — native (expo-audio) & web (HTMLAudioElement)
- 🟣 **Orb di semua halaman** — efek orb kini hidup di SETIAP halaman (bukan cuma Main Menu & Login): komponen reusable `AmbientOrbs` — 24 orb dengan posisi/ukuran/fase gerak **acak** (boleh saling tumpang tindih), warna dari palet tema aktif, dirender otomatis oleh `ScreenFade` di belakang konten (Main Menu & Login memakainya sendiri jadi tidak dobel)
- 🚪 **Dialog keluar lebih ceria & responsif** — tombol dialog konfirmasi (Keluar Permainan, Reset, dll) kini ada **ikon** (💾 Simpan & Keluar / 🎮 Lanjut Main / 🗑️ Reset / ↩️ Batal); di layar HP tombol **vertikal menumpuk**, di layar lebar **berdampingan horizontal**
- 🌐 **Web deploy ke expo.dev** — script baru `scripts/expo-deploy-web.mjs` (npm: `bun run deploy:web`): export web lalu upload ke **EAS Hosting**; versi pertama sudah live di **https://kotakata-ai--x1zzugirv7.expo.app** (siap dipromosikan ke produksi via `eas deploy --prod`)
- 🗄 **DB** — seed `supabase/data/themes.sql` di-regenerate (16 tema) & di-push; terverifikasi `app 4 · board 6 · keyboard 6`

### v1.2.2 — Background Image & Gradien untuk Semua Tema (PLAN-017)

- 🖼 **Latar tema tidak lagi warna polos** — tiap tema kini punya **BackgroundSpec**: gradien warna (dirender via `react-native-svg` yang sudah terpasang, tanpa dependency native baru) + dukungan **URL gambar latar** (`imageUrl`, opsional — dipakai tema mendatang; saat offline/baru dibuka, gradien/warna solid tetap tampil sebagai fallback) + **overlay kontras** untuk keterbacaan teks
- 🎨 **Gradien per tema**: 4 tema aplikasi (Puitis/Samudra/Senja/Hutan), 3 tema papan (Puitis/Tinta/Neon) dan 2 tema keyboard (Pastel/Klasik) kini punya gradien light & dark sendiri; tema keyboard Puitis tetap solid (membuktikan gradien itu opsional)
- 🧩 **Komponen `ThemedBackground`** — lapisan latar reusable (warna → gradien → gambar → overlay) dipakai: semua halaman lewat `ScreenFade` (latar aplikasi), halaman game (latar **tema papan** — grid, clue pill & panel hint senada), dan panel keyboard (latar **tema keyboard**)
- 👁 **Preview Pasar diperbarui** — mockup aplikasi/papan/keyboard di modal preview ikut merender gradien latar tema yang sedang dilihat (toggle terang/gelap tetap ada); objek `background` diloloskan dari katalog database & registry lokal
- 🗄 **DB**: tidak ada perubahan schema (palet jsonb) — `supabase/data/themes.sql` di-regenerate dari registry dan di-push; aplikasi tetap offline-first

### v1.2.1 — Aturan Release, Script Build EAS & Fix Clue di HP (PLAN-016)

- 🚫 **Aturan GitHub Release** — rilis GitHub WAJIB atas nama **Fadhly Permata**: perintah `gh` di workspace ini memakai kredensial GitHub App platform (bukan akun personal), sehingga rilis dari sini tercatat atas nama app, bukan pemilik. Aturan baru di `AGENTS.md` (#2b): semua rilis dipersiapkan di workspace ini (bump versi + catatan rilis + tag), lalu **pemilik yang publish dari akun GitHub-nya sendiri**
- 🛠 **Script build via expo.dev** — `scripts/expo-build.mjs` (npm: `bun run build:eas`): baca `EXPO_TOKEN` dari env / `.env.local` / `.env`, default `android + preview` (APK), dukung `ios`, `all production` (AAB), `--list` untuk melihat build terakhir; jalan non-interaktif tanpa perlu login ulang
- 📱 **Fix clue auto-height di HP** — pill clue & panel bawah diberi `flexShrink: 0` supaya tinggi pill selalu mengikuti panjang teks soal (tidak pernah disusutkan layout saat keyboard virtual tampil di ponsel); di tablet/desktop tetap aman

### v1.2.0 — Multi-Tema: Katalog dari Database + Tema Papan & Keyboard + Preview Tema (PLAN-014 + PLAN-015)

- 🎨 **4 tema aplikasi** siap di-*switch* dari halaman Pasar: **Puitis** (default, gratis) — merah muda & ungu identitas KotaKata, **Samudra** — biru laut & teal, **Senja** — oranye hangat & ungu dusk, **Hutan** — hijau rimba & zaitun; semuanya mendukung mode **terang & gelap** penuh
- 🧩 **3 tema PAPAN** (desain halaman game saja — papan, soal/clue pill, dan panel petunjuk): **Puitis** (default), **Tinta** (crossword koran hitam-putih-merah), **Neon** (grid gelap neon cyan & magenta)
- ⌨️ **3 tema KEYBOARD** (InGameKeyboard): **Puitis** (default), **Pastel** (tombol lembut aksen ungu), **Klasik** (monokrom bersih)
- 🗄 **Data tema disimpan di DATABASE**: tabel baru `themes` di Supabase (id, kind `app/board/keyboard`, nama, deskripsi, palet jsonb light/dark, RLS read publik). Seed di-*generate* dari registry lokal (`scripts/db/gen-themes-sql.mjs` → `supabase/data/themes.sql`) dan di-push via `scripts/db/push-themes.mjs` — pola sama dengan vocabulary
- 🔁 **Pilihan tema tersimpan permanen**: `themeSelectionStore` (zustand + AsyncStorage) menyimpan `appThemeId`/`boardThemeId`/`keyboardThemeId`; kartu tema di Pasar menampilkan badge **"✓ Aktif"** dan tombol **"Aktifkan"** untuk mengganti langsung
- 📴 **Offline-first**: registry lokal (`themeData.ts`) menjamin render selalu jalan tanpa jaringan; halaman Pasar menampilkan katalog dari cloud dan otomatis jatuh ke katalog lokal bila Supabase tidak terjangkau (banner "Katalog offline")
- 👁 **Preview tiap tema sebelum aktivasi** (PLAN-015): tombol "👁 Preview" di setiap kartu membuka modal mockup sesuai jenis tema — aplikasi (mockup halaman utama: header, kartu menu, tombol), papan (grid mini: sel aktif/terpilih/highlight/solved/blocked + clue pill + panel hint), keyboard (baris huruf, backspace, tombol nav) — diwarnai palet tema yang di-preview, dengan toggle **☀️ Terang / 🌙 Gelap**; preview murni tampilan, tidak mengubah pilihan sampai user menekan "Aktifkan"

### v1.1.0 — Halaman Pasar (Store), Fix Fullscreen & Refactor Kode (PLAN-013)

- 🛍️ **Halaman Pasar (Store)** — tombol memanjang **"Pasar"** di posisi paling bawah Halaman Main membawa pemain ke halaman Store; katalog tema baru `src/presentation/themes/themeCatalog.ts` siap dikembangkan
- 🎨 **1 tema bawaan "Puitis"** (mendukung mode **terang & gelap**) dipilih sebagai default — preview swatch dua mode, badge "✓ Tema Aktif", label harga; struktur daftar produk siap untuk tema baru (ke depan jadi konten berbayar / mata pencaharian sampingan)
- 📱 **Semua halaman tidak lagi tampak fullscreen**: `TopBar` (dipakai History, GameHistory, BoardViewer, Profil, Pengaturan, Log, AiProvider) kini menghormati inset status bar via `useSafeAreaInsets`; Main Menu & halaman Login ikut inset — konten tidak lagi masuk ke balik status bar / gesture bar Android (edge-to-edge)
- 🧹 **Refactor maintainability**: helper papan dipisah dari `gameStore` ke `gameBoardHelpers.ts`; `GameScreen` dipecah menjadi komponen `GameTopBar`, `CluePill`, `GameActionBar` (±1.570 → 1.213 baris); orb parallax/bounce jadi komponen bersama `FloatingOrbs` (Main Menu & Login memakai yang sama) — perilaku aplikasi identik

### v1.0.1 — Reveal XP Fair + Header In-Game (Progress Ring & Theme Toggle) (PLAN-012)

- 🔍 **Reveal letter/word tidak lagi memotong XP tanpa efek**: sebelumnya reveal hanya mengisi sel *kosong*, jadi saat semua sel sudah terisi (atau terkunci) XP tetap berkurang padahal tidak ada huruf yang berubah. Sekarang reveal mengisi sel kosong **dan** mengganti huruf yang salah dengan huruf yang benar; bila tidak ada satu pun sel yang perlu diubah, reveal **batal total dan XP tidak dipotong** (tombol reveal ikut dinonaktifkan dengan tooltip penjelasan)
- 🎬 **Animasi zoom-out** pada huruf yang baru di-reveal/diganti: huruf mengecil cepat lalu membal ke ukuran normal (spring) supaya pemain langsung melihat jawaban lama diganti jawaban baru (state transien `revealedPulse` — tidak ikut di-persist)
- 🚫 **Progress bar garis di pill clue dihapus** (posisinya terlihat offset di layar game)
- ⭕ **Progress ring persentase** (`ProgressRing`) pindah ke **header layar game, di samping label XP** — hanya tampil di dalam game, angka % di tengah lingkaran
- 🌗 **Tombol switch cepat tema** terang/gelap di header game (☀️/🌙), tersimpan permanen lewat `ThemeProvider`

### v1.0.0 — Build Native (EAS), Fix Login APK, Legal, Fix UI Real Device, Kurasi Singkatan Kuno (PLAN-010 + PLAN-011)

- 🤖 **Build native via EAS**: dependency disejajarkan ke Expo **SDK 57**, `extra.eas.projectId` + `owner` di app.json, profile build `preview` (APK) — aplikasi bisa di-build dan di-install di perangkat nyata
- 🔐 **Fix login di build native (APK)**: login **Google** (handler error `undefined is not a function` — perbaikan callback OAuth) & **Guest** (`crypto` tidak tersedia di native — fallback identitas perangkat yang aman); tombol auth **TikTok, X, dan Facebook dihapus** (sementara hanya Google + Guest)
- 📄 **Ketentuan Layanan & Kebijakan Privasi**: `docs/TERMS.md` + `docs/PRIVACY.md` — dibuka dari halaman login via **markdown preview** (react-native-markdown-display) yang di-load dari raw GitHub
- 📱 **Fix tampilan di real device**: game **tidak lagi fullscreen** (inset safe-area dihormati — tidak tertutup navbar/status bar Android), **kontainer clue auto-height** (teks clue panjang selalu terbaca), **daftar tier & leaderboard bisa di-swipe** di HP (scroll bukan cuma mouse), **tooltip native tidak lagi memanjang ke bawah** (tata letak samping)
- 👤 **Pengaturan**: label di bawah versi diganti **"Author — Fadhly Permata"** + link ke profil GitHub (https://github.com/fadhly-permata)
- 🎊 **PLAN-010**: konfeti & hujan seluruh layar, tombol **ESC** tutup semua popup (AppModal/ConfirmDialog/CompletionOverlay), panel Profil "Kata Ditemukan" + "Sejarah Permainan"
- ✨ **PLAN-011**: **semua singkatan kuno di clue dihilangkan** (`pd`→pada, `dl`→dalam, `krn`→karena, `thd`→terhadap, `msl`→misalnya, dll.) — **308 baris** tier 6–10 dimodernisasi, **210 kata dikurasi ulang** c2/c3 (`modernize-clues.mjs` + `modernize-overrides.mjs`), QA **0 issue / 0 bocor / 0 duplikat** semua tier, placeholder 0, `vocabulary.sql` di-regenerate & di-push ke Supabase (total **10.003 row**, singkatan kuno = **0**)
- 📜 **Aturan repo**: tanpa izin eksplisit tidak boleh build/push ke EAS; commit hanya atas nama pemilik repo (tanpa atribusi pihak lain)

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

### v0.11.0 — Responsif UI, Orb Login, Dialog Seragam & Konfeti (PLAN-009)

- 📐 **Responsivitas lintas resolusi**: `Dimensions.get()` di scope modul diganti `useWindowDimensions()` (reactive) di halaman Auth, History, dan In-Game; ukuran orb login, kartu bento main menu, dan padding halaman menyesuaikan tinggi/lebar layar (HP kecil s/d tablet/web lebar) — tidak ada lagi konten terpotong/overlap
- 🟣 **Orb login animated**: 4 orb dekoratif dengan idle bounce (fase & durasi berbeda, Easing) + parallax saat scroll — tidak lagi terasa statis seperti dulu
- 📖 **Clue In-Game terbaca lengkap**: `numberOfLines={2}` dihapus — teks clue panjang tidak lagi terpotong (tinggi panel soal mengikuti teks, halaman tetap bisa scroll)
- 🔍 **Action bar responsif**: panel zoom/reveal/reset/keyboard kini `flexWrap` + mode compact (lebar < 400px) — komponen tidak lagi overlap/terpotong di layar sempit
- 🗂 **Dialog seragam (`AppModal`)**: satu komponen modal bersama (header + tombol [✕] konsisten + tap di luar menutup) dipakai popup Kata Ajaib, Daftar Tier, Leaderboard, error Mode AI, dan dialog tier — menghapus gaya close yang berbeda-beda antar jendela
- 🎊 **Konfeti**: efek partikel ringan (Animated murni, tanpa dependency baru, jalan di web) pada dialog **Permainan Selesai** dan popup tier naik
- 🔕 **Notifikasi tier dibersihkan**: toast `TierChangeToast` (Main Menu & Game) dan blok "TIER UP!" di dialog selesai dihapus — informasi naik/turun tier dipusatkan ke satu tempat
- 🏆 **Dialog perubahan tier (hanya Main Menu)**: popup baru saat tier berubah setelah kembali ke menu — **naik**: judul "TIER UP! 🎉" + konfeti + nama/filosofi tier; **turun**: hujan murung 🌧️ + pesan penyemangat

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
| DB | `gen-themes-sql.mjs` / `push-themes.mjs` | Generate `supabase/data/themes.sql` dari registry tema & push ke Supabase |
