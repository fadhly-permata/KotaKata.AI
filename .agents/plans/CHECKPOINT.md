# 📍 Checkpoint — KotaKata.AI

> File ini mencatat progres pengembangan. Update setiap kali ada perubahan besar.

## Status: Active Development 🚧

---

## ✅ Selesai

### Auth & Navigation
- [x] AuthScreen sebagai initial route (`RootNavigator.tsx`)
- [x] Navigasi otomatis ke MainMenu setelah login sukses
- [x] Splash loading screen saat cek session
- [x] Error banner visible di mode select (gak cuma di form email)
- [x] Back navigation confirm dialog di GameScreen

### Board Generator
- [x] `validateGrid()` fix — tidak reject board valid
- [x] `canPlaceHorizontal/Vertical` — cek perpendicular neighbors (cegah kata nempel)
- [x] Nomor clue hanya untuk cell yang beneran awal kata (min 2 huruf)

### Gameplay — Core Mechanics
- [x] Auto-advance cursor ke cell berikutnya dalam satu kata
- [x] Auto-advance ke kata berikutnya (urut clue number) saat satu kata selesai
- [x] Skip locked cells pas auto-advance
- [x] `markWordSolved()` dipanggil synchronously di `inputLetter()` — cegah race condition
- [x] `findNextUnsolvedWord()` skip kata yang semua cell-nya locked
- [x] `navigateToCell()` dan `deleteLetter()` skip locked cells
- [x] `validateWord()` sebelum lock — jawaban salah tidak di-lock
- [x] Kata benar: hijau (#1B5E20) + terkunci
- [x] Kata salah: bisa diedit ulang

### Gameplay — Keyboard & Input
- [x] InGameKeyboard — stretch ke lebar layar (flex: 1)
- [x] Backspace di samping L, navigasi (◀▶ / ▲▼) di samping M
- [x] Compact toolbar: ◀ 🔍 ▶ clue_text ⌨️
- [x] Keyboard auto-detect: media query + Keyboard API + keypress fallback
- [x] Auto-show keyboard on tap: DIHAPUS (user request)
- [x] Fix cell click fokus di web (onClick fallback)

### Clue Panel
- [x] Compact clue bar dengan carousel (clue 2/3/reveal)
- [x] Reveal letter: selalu tampil sebagai icon 🔍

### UI/UX
- [x] Confirm dialog quit game
- [x] `shadow*` deprecated → `boxShadow`
- [x] ThemeProvider — light/dark/system mode

---

## 🎨 Design Redesign (Belum Dimulai)

Lihat `DESIGN_PLAN.md` untuk detail per-halaman.

### Priority Order:
1. [x] ThemeProvider — update palette warna ✅
2. [ ] AuthScreen — redesign
3. [ ] MainMenu — redesign
4. [ ] GameScreen — redesign (grid, toolbar)
5. [ ] CompletionOverlay — redesign
6. [ ] ProfileScreen — redesign
7. [ ] SettingsScreen — redesign

---

## 🐛 Bug Tracker

- [ ] Keyboard Bluetooth detection: `navigator.keyboard.getLayoutMap()` tidak selalu available
- [ ] Demo words hardcoded — perlu integrasi vocabulary seed

## 📦 Known Technical Debt
- CrosswordGenerator masih pake `DEMO_WORDS` hardcoded
- Belum ada sync ke Supabase
- Belum ada save/load game state ke AsyncStorage
- Belum ada unit test
