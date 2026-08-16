# Hapus login tamu — game hanya untuk user login Google

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 030`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Proses login sebagai tamu di hapus aja deh. Mulai sekarang game cuma boleh
> dimainkan oleh user yang login google."

**Tujuan:** hapus opsi/cara masuk sebagai tamu (guest). Seluruh akses game
wajib melalui login Google. (Catatan: login email sudah dihapus di PLAN-022 —
ini lanjutannya untuk mode tamu.)

## Langkah

- [ ] **1. Hapus mode tamu** — buang opsi login tamu dari Halaman Login & alur
  auth (guard: akses tanpa akun Google ditolak / diarahkan ke login).
- [ ] **2. Sesuaikan dependensi** — pastikan tidak ada alur/state game yang
  masih mengandalkan identitas tamu (data pengguna, penyimpanan skor, dsb).
- [ ] **3. Verifikasi** — tsc + tes + cek alur login Google end-to-end (web &
  device).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 030 <no> "teks"`)_
