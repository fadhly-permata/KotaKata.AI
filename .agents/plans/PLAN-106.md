# PLAN-106 — Hasil Audit Bug Logic/Tampilan (HANYA CATATAN, BELUM FIXING)

**Status:** ✅ SELESAI — ditangani lewat PLAN-108 (A1/A2/C1); B1 ditunda (tidak menghasilkan crash saat ini)
**Tanggal:** 23 Aug 2026
**Sumber:** Audit statis menyeluruh atas permintaan pemilik (pola: logic, tampilan, UX)
**Tool permanen:** `npm run audit:bugs` (`scripts/audit-bugs.mjs`) — jalankan ulang kapan saja untuk audit ulang otomatis.

---

## 🔴 Temuan KRITIS — berdampak langsung ke pengalaman

### A1. `Alert.alert` di web = NO-OP → kode share tidak pernah tampil
- **Lokasi:** `src/features/game/MainMenuScreen.tsx:560`
- **Gejala:** Setelah "Buat Soal Sendiri" sukses, dialog "📤 Soal Siap & Kode Bagikan"
  memakai `Alert.alert` — di react-native-web Alert adalah **no-op**, jadi pemain
  web TIDAK PERNAH melihat kode bagikannya.
- **Fix yang disarankan:** ganti dengan modal `AppModal` (sudah ada komponennya).

### A2. `Alert.alert` Boss "⏰ Waktu Habis" → pemain web terjebak di papan
- **Lokasi:** `src/features/game/GameScreen.tsx:145`
- **Gejala:** Saat timer boss habis di web, dialog kekalahan tidak muncul (no-op)
  sehingga tombol OK yang men-trigger `navigation.goBack()` tidak pernah jalan —
  pemain tertahan di papan boss tanpa UI apa pun (harus back manual).
- **Fix yang disarankan:** ganti dengan `ConfirmDialog`/`AppModal` + state visible.

---

## 🟡 Temuan SEDANG

### B1. Async handler tanpa guard unmount (`cancelled`) — update state setelah keluar layar
- **Lokasi:** `SharedBoardsScreen.tsx` (`loadPage`, `playSharedSet`),
  `QuestionEditorScreen.tsx` (loop bulk), beberapa handler MainMenu.
- **Gejala:** Kalau user keluar layar di tengah proses async, `setState` tetap
  dipanggil. React 18 sudah tidak warning, tapi berisiko update tak terduga /
  memory churn. Pola `cancelled`/`disposed` sudah dipakai RootNavigator — bisa
  diterapkan serupa.
- **Prioritas rendah-menengah:** tidak menghasilkan crash saat ini.

---

## 🟢 Temuan MINOR — konsistensi aturan repo

### C1. `catch {}` kosong tanpa komentar `// abaikan — <alasan>` (aturan #7)
- `src/features/game/MainMenuScreen.tsx`: baris ±291, 334, 355, 377, 655
- `src/data/repositories/logReportRepository.ts`: ±88
- `src/features/auth/useAuth.ts`: ±101
- Fix: tambahkan komentar alasan atau logging bila error-nya penting.

### C2. Verifikasi guard platform sudah baik (tidak perlu fix)
- Semua `window.addEventListener` / `window.innerWidth` ternyata SUDAH di-guard
  `Platform.OS === "web"` atau cek fungsi eksplisit (GameScreen 488/935,
  useEscapeClose, logDb, TooltipButton). Aman untuk native — dicatat agar tidak
  salah diperbaiki dua kali.

---

## Langkah pengerjaan (bila disetujui pemilik)
1. Ganti kedua `Alert.alert` → modal in-app (A1, A2).
2. (Opsional) Tambah guard cancelled pada async handler (B1).
3. (Opsional) Rapikan catch kosong sesuai aturan #7 (C1).
4. Verifikasi lintas platform (aturan #5b): tsc + test + jalur startup web & native.
5. Commit & push → deploy web dev.
