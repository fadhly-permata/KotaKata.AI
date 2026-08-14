# Hapus kemampuan login dengan email di halaman Login

<!-- status: pending -->
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

## Langkah (rencana, belum dikerjakan)

- [ ] **1. AuthScreen** — hapus mode email, form, link "Atau masuk dengan email", state & handler email, style mati.
- [ ] **2. useAuth** — hapus `signInWithEmail`/`signUpWithEmail`/`linkEmail` (+ import yang tak terpakai).
- [ ] **3. Dokumen** — sinkronkan penyebutan login email di README/GUIDE/TERMS/PRIVACY.
- [ ] **4. Verifikasi** — tsc + test + lint; preview manual login Google & Guest tetap jalan.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 022 <no> "teks"`)_
