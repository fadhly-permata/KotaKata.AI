# PLAN-109 — Peta Layout Komponen & Ukuran per Resolusi Layar

**Status:** ✅ DOKUMEN SELESAI (baseline audit tata letak — bahan perbaikan overlap)
**Tanggal:** 23 Aug 2026
**Sumber:** Analisis statis kode — semua angka diambil dari style aktual di source.

---

## 1. Breakpoint yang AKTUAL dipakai kode saat ini

| Breakpoint | Lokasi | Efek |
|---|---|---|
| `winW < 480` | `GameScreen.tsx` (`compactBar`) | GameTopBar & GameActionBar masuk mode ringkas |
| Selain itu | flex / persen / `useWindowDimensions` | Tidak ada breakpoint eksplisit lain — risiko utama overlap |

> ⚠️ Temuan kunci: repo hanya punya SATU breakpoint eksplisit. Komponen lain
> mengandalkan flex, sehingga di layar ekstrem (≤320px / ≥768px) ukuran tetap
> (ikon, chip, pill) saling mendorong → overlapping/terpotong.

## 2. Definisi kelas resolusi (usulan standarisasi)

| Kelas | Lebar | Contoh device |
|---|---|---|
| XS | < 360 px | iPhone SE 1st, Android kecil |
| S | 360–414 px | Mayoritas Android |
| M | 415–599 px | iPhone Pro Max, besar |
| L | ≥ 600 px | Tablet / desktop web sempit |

## 3. Peta komponen IN-GAME (GameScreen)

Susunan vertikal: `GameTopBar` → (warning) → `ScrollView(CrosswordGrid)` →
`bottomPanels(CluePill + GameActionBar)` → (`InGameKeyboard` bila tampil).

### 3.1 GameTopBar (tinggi total ±48–56px)
| Elemen | Ukuran | Sifat |
|---|---|---|
| Tombol back | 32×32, font 18 | tetap |
| Judul app | font 20, numberOfLines=1, maxFontScale 1.2 | flexShrink |
| Badge Mode AI | font 11 | tetap |
| ProgressRing | ±30 (compact) | tetap |
| XP pill | font 12, flexShrink | fleksibel |
| Toggle tema | 34×34 | tetap |
| Divider | 1×20 | tetap |

Risiko: **XS/S** — judul + badge + ring + pill + toggle = ±260px fixed; sisanya
<100px untuk teks → judul terpotong/overlap dengan badge.

### 3.2 CluePill (tinggi ±46–70px mengikuti teks)
| Elemen | Ukuran |
|---|---|
| Panah ◀ ▶ | 32×32 bulat |
| Nomor kata | tinggi 30, font 13 |
| Chip level clue | tinggi 34, font 10 |
| Divider | 1×24 |
| Teks clue | font 14 / lh 19, padV 8, auto-height |

Risiko: panah + 2 chip + divider = ±130px fixed; di XS teks clue menyusut ke
<40% lebar → terpotong meski auto-height.

### 3.3 GameActionBar (pager 3 halaman, tinggi baris ±40–48px)
| Elemen | Ukuran |
|---|---|
| Tombol zoom/tools | 32×40 |
| pageWidth | winW÷3 dikurangi padding |
| Indikator titik | tetap |

Risiko: **S ke bawah** tiap halaman berisi 3–4 tombol 32px + gap → mepet;
label tooltip ikon kecil sulit disentuh (<44px tap target).

### 3.4 CrosswordGrid (adaptif ✓)
- `baseCellSize = floor((screenW − margin8 − gaps − border2 − pad) / size)` —
  otomatis menyesuaikan; font sel `max(12, cell×0.45)`.
- Zoom 0.6–2.0 × baseCellSize; di zoom >1 grid horizontal-scroll.
- ✅ Komponen paling aman; satu-satunya yang benar-benar resolusi-aware.

### 3.5 InGameKeyboard
| Elemen | Ukuran |
|---|---|
| Key | flex 1 (backspace 1.3), tinggi 46, font 16–18 |

Risiko: **layar pendek (tinggi <640)** — keyboard 3–4 baris ×46 + bottomPanels
±120px + topBar ±52 → grid tersisa <200px tinggi.

## 4. Peta komponen LUAR GAME

| Layar/Komponen | Ukuran kunci | Catatan |
|---|---|---|
| AppModal | maxWidth 380, tap-luar tutup | Aman ≥320; konten scroll? tidak — modal tinggi bisa melebihi layar pendek |
| ConfirmDialog | tombol vertikal di layar sempit ✓ | Sudah responsif (PLAN-009) |
| MainMenu actionGrid | kartu 2 kolom, ikon emoji fs±28, label 14 | Di XS label 2 baris → tinggi kartu beda-beda (grid melompat) |
| AuthScreen | orb + form proporsional useWindowDimensions ✓ | Aman |
| History/GameHistory | masonry card deterministik 132–204px | Aman (deterministik) |
| Store | kartu tema + preview modal | Preview modal 380 fixed — di XS tepi mepet |
| TopBar umum | inset safe-area ✓ | Aman native edge-to-edge |

## 5. Daftar risiko OVERLAP prioritas (bahan fixing berikutnya)

1. 🔴 **GameTopBar XS/S**: judul vs badge AI vs XP pill — perlu urutan
   shrink eksplisit (judul dulu) + sembunyikan divider di <360.
2. 🔴 **CluePill XS**: chip level + nomor memakan 45% lebar — chip bisa
   disusutkan jadi ikon saja di <360.
3. 🟡 **GameActionBar tap target 32px** < rekomendasi 44px — perbesar area sentuh
   tanpa memperbesar visual (padding hit).
4. 🟡 **Keyboard + panel bawah di layar pendek**: batasi tinggi grid minimum,
   keyboard boleh semi-transparan/scroll.
5. 🟢 **MainMenu kartu tidak setinggi sama** dalam satu grid — samakan minHeight.
6. 🟢 **AppModal di layar pendek**: tambah maxHeight + ScrollView dalam kartu.

## 6. Rekomendasi sistematis

1. Buat util `src/utils/responsive.ts`: `breakpoint(w): "XS"|"S"|"M"|"L"` +
   hook `useBreakpoint()` — ganti pengecekan `winW < 480` tersebar.
2. Token tipografi/ikon (fs11/fs13/fs16…) supaya label & ikon konsisten antar
   komponen (saat ini tiap file hardcode sendiri).
3. Tap target minimal 44×44 (padding hit untuk ikon kecil).
4. Matrix uji manual: 320×640, 360×800, 414×896, 768×1024 (web + APK).
