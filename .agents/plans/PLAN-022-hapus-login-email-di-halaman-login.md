# Hapus kemampuan login dengan email di halaman Login

<!-- status: done -->
<!-- dibuat: 2026-08-14 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 022`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Halaman Login: hapus kemampuan login dengan menggunakan email."

**Cakupan (hasil penelusuran read-only):**
- `src/features/auth/AuthScreen.tsx`: mode `"email"` (form email + password, tombol daftar/masuk, link "Atau masuk dengan email", tombol kembali), state `email`/`password`/`isSignUp`, handler `handleEmailAuth`, style form yang tak terpakai lagi.
- `src/features/auth/useAuth.ts`: fungsi `signInWithEmail`, `signUpWithEmail`, `linkEmail` — **hanya** dipakai di AuthScreen/useAuth (tidak ada pemakai lain di repo, termasuk Profile). Aman dihapus.
- Login yang TETAP: Google + Guest (tamu).
- Dokumen yang menyebut "login Google/email" perlu disesuaikan: README.md (fitur, FAQ "Hubungkan Akun"), GUIDE.md ("login Google atau Email", "Akun & Data"), docs/TERMS.md & PRIVACY.md ("masuk dengan Google/email").

## Langkah

- [x] **1. AuthScreen** — mode email, form, link "Atau masuk dengan email", state/handler email, dan style mati (formCard/input/emailSubmit/switchMode/dll) dihapus; `TextInput` tak terpakai ikut dibuang. Halaman login kini hanya Google + Guest.
- [x] **2. useAuth** — `signInWithEmail`/`signUpWithEmail`/`linkEmail` dihapus (sudah diverifikasi tidak dipakai di tempat lain).
- [x] **3. Dokumen** — README/GUIDE/TERMS/PRIVACY disinkronkan ("login Google/email" → "login Google").
- [x] **4. Verifikasi** — tsc + 43 tes + lint lolos.

## Catatan Revisi

- Selesai dikerjakan bersama PLAN-021 & PLAN-025 (batch 2026-08-14).
