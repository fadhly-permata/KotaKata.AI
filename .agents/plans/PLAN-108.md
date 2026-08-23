# PLAN-108 — Hasil Audit Bug Sesi 2 (skill bug-audit, 23 Aug 2026)

**Status:** PENDING
**Tool:** `npm run audit:bugs` (28 kandidat) + verifikasi manual konteks kode

---

## 🔴 KRITIS — TERKONFIRMASI (perlu fixing)

| # | Lokasi | Masalah | Dampak nyata | Saran fix |
|---|---|---|---|---|
| A1 | `src/features/game/GameScreen.tsx:145` | `Alert.alert` "⏰ Waktu Habis" boss timeout | Di web Alert = no-op → tombol OK yang men-trigger `goBack()` tidak pernah muncul → **pemain terjebak di papan boss kalah** | Ganti dengan state `showBossTimeout` + `ConfirmDialog` |
| A2 | `src/features/game/MainMenuScreen.tsx:560` | `Alert.alert` "📤 Soal Siap & Kode Bagikan" | Di web **kode share tidak pernah tampil** setelah Buat Soal Sendiri | Ganti dengan modal `AppModal` |

## ⚪ FALSE POSITIVE — terverifikasi aman (JANGAN diperbaiki)

| Lokasi scanner | Alasan aman |
|---|---|
| GameScreen:948 addEventListener | Guard `Platform.OS !== "web"` di baris 935 |
| useEscapeClose:22 | Guard Platform + `typeof window` di baris 20 |
| logDb:429/439 addEventListener | Cek fungsi eksplisit `typeof window.addEventListener === "function"` di baris 427 |
| logDb:407 Alert.alert | Konteks handler ErrorUtils **native** (web tidak lewat jalur ini); sudah dibungkus try-catch |
| supabase.ts:81 window.close | Guard `Platform.OS === "web"` di baris 73 (di luar jangkauan ±6 baris heuristik) |
| useAuth:68/74 window.open/location | Guard `isWeb` baris 49, jalur native return-early di baris 57 |
| TooltipButton:200 document.body | `createPortal` hanya terdefinisi saat `isWeb` (baris 79); render dikondisikan |
| Duplikat SEDANG dari entri di atas | Entri sama yang discan ulang lewat aturan berbeda |

## 🟢 MINOR — konsistensi aturan #7 (`catch {}` tanpa komentar alasan)

- `logReportRepository.ts:88`, `wordDiscoveryRepository.ts:162` & `:201`,
  `useAuth.ts:101`, `MainMenuScreen.tsx:355`, `GameHistoryScreen.tsx:176`,
  `HistoryScreen.tsx:210`, `aiProvider.ts:473`, `logDb.ts:218`,
  `sound.ts:278` & `:684`
- Fix: tambahkan komentar `// abaikan — <alasan>` atau logging bila error penting.

## Catatan pemeriksaan regresi (commit terakhir)

- Kapitalisasi clue dilakukan SEBELUM deteksi bocor, tapi perbandingan bocor
  pakai `.toLowerCase()` → tidak terpengaruh. ✅
- Perubahan body background & overscroll hanya web, guard platform lengkap. ✅

## Langkah bila disetujui

1. Fix A1 + A2 (modal in-app, lintas platform aman).
2. (Opsional) Rapikan 11 catch kosong.
3. tsc + test → commit & push → deploy web dev.
