# Title HTML mode web menampilkan "KotaKata AI"

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 031`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Pada mode web, title pada html kenapa gak ada yang menampilkan \"KotaKata
> AI\", contoh penggunaan \"KotaKata AI - Beranda\"."

**Tujuan:** title HTML (tab browser) pada mode web menampilkan "KotaKata AI"
beserta nama halaman, misal "KotaKata AI - Beranda", di tiap halaman/rute.

## Langkah

- [x] **1. Cek konfigurasi web title** — lihat bagaimana title diset saat ini
  (index.html, expo-router/React Navigation, atau library head).
- [x] **2. Implementasi** — set title per halaman dengan format "KotaKata AI -
  <Nama Halaman>" (mis. Beranda, Papan, Pengaturan, dsb).
- [x] **3. Verifikasi** — buka mode web & cek title tab di beberapa halaman.

## Catatan Revisi

- **1.** 2026-08-16: Dikerjakan batch 2026-08-16: public/index.html (title dasar 'KotaKata AI') + title per rute 'KotaKata AI - <Halaman>' (mis. 'KotaKata AI - Beranda') via onStateChange di RootNavigator.
