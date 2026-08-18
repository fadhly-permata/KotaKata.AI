# Tampilan tema pakai tab yang bisa di-swipe: Gratis dan Modern

<!-- status: done -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 053`

## Revisi (dari pemilik)

> "Tampilan pengelompokan tema jelek banget. Coba dibuat pake tab biar user
> bisa melihat berdasarkan kelompok aja. Karena suatu hari nanti gua mau
> tambahkan tema-tema lain, buat agar tab tersebut bisa di swipe atau di
> geser. Untuk sementara tab-nya kita kasih judul 'Gratis', dan 'Modern'."

## Langkah

- [x] **1. Tab bar & pager** — `ThemeTabBar` horizontal dengan tombol "🆓 Gratis" & "✨ Modern" + badge jumlah tema, pakai `ScrollView pagingEnabled` supaya bisa di-swipe.
- [x] **2. Label "Premium" → "Modern"** — semua UI ("💎 Premium" chip → "✨ Modern", judul grup → judul tab, teks catatan bawah diperbarui); data internal `theme_type` tetap 'free'/'premium'.
- [x] **3. Verifikasi** — tsc + 50 tes lolos.

## Catatan Revisi

- **1–3.** 2026-08-18: Tab gratis-modern implementasi: `ThemeTabBar` komponen baru, konten per-tab di `ScrollView` horizontal `pagingEnabled` (siap menerima tab tambahan masa depan tanpa ubah struktur).
