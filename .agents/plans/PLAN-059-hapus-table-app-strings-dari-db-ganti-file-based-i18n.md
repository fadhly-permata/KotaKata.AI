# Hapus table app_strings dari DB, ganti file-based i18n

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 059`

## Revisi (dari pemilik)

> "Dukungan multi bahasa ini jangan simpan di database dong. simpan aja di
> file untuk bahasa-bahasanya. Jadi satu file untuk satu bahasa, kalo ada 5
> bahasa maka ada 5 file bahasa. hapus aja table 'app_strings' dan pindahkan
> ke file."

**Tujuan:** ganti tabel `app_strings` di Supabase dengan sistem **file-based
i18n** di kode sumber: satu file TypeScript per bahasa (mis. `src/i18n/id.ts`,
`src/i18n/en.ts`, dll.) + modul `src/i18n/index.ts` yang mengekspor fungsi
`t(key)` untuk mengambil terjemahan. Lebih cepat (tidak perlu network call),
lebih mudah di-maintain, dan cocok untuk string UI yang statis.

## Cakupan

- **DB:** drop tabel `app_strings` + hapus seed INSERT (migrasi baru).
- **Kode:** buat `src/i18n/` dengan `id.ts` (Bahasa Indonesia — sumber
  kebenaran string saat ini), `en.ts` (placeholder awal), `index.ts`
  (getCurrentLocale, setLocale, t()).
- **Frontend:** semua string hardcoded di komponen bisa perlahan dipindah ke
  `t("key")` (tahap inkremental, tidak wajib sekaligus).

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan)_
