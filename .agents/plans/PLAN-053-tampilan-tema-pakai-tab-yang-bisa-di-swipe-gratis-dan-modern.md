# Tampilan tema pakai tab yang bisa di-swipe: Gratis dan Modern

<!-- status: pending -->
<!-- dibuat: 2026-08-18 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 053`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "Tampilan pengelompokan tema jelek banget. Coba dibuat pake tab biar user
> bisa melihat berdasarkan kelompok aja. Karena suatu hari nanti gua mau
> tambahkan tema-tema lain, buat agar tab tersebut bisa di swipe atau di
> geser. Untuk sementara tab-nya kita kasih judul 'Gratis', dan 'Modern'."

**Tujuan:** ganti tampilan pengelompokan tema di Pasar (hasil PLAN-052 —
grup header vertikal Gratis/Premium) menjadi **tab horizontal** yang bisa
**di-swipe/di-geser** (pager), sehingga user melihat satu kelompok tema per
waktu. Label tab sementara: **"Gratis"** dan **"Modern"** (istilah "premium"
di UI diganti jadi "Modern" mulai revisi ini). Desain harus siap menerima
tab/tema baru di masa depan (tab otomatis muncul kalau ada kelompok baru).

## Cakupan

- `src/features/store/StoreScreen.tsx` — tab bar + konten pager per tab.
- Label UI "Premium" → "Modern" (tab + chip kartu) di StoreScreen; data
  internal `theme_type` ('free'/'premium') tetap.
- Komponen pager yang bisa di-swipe lintas platform (web + native) —
  mis. ScrollView horizontal pagingEnabled / FlatList paging per tab, atau
  `react-native-pager-view` bila sudah ada (cek package.json dulu).
- Tab otomatis dari daftar kelompok tema yang ada (Gratis, Modern) — siap
  ditambah kelompok lain.

## Langkah (disusun saat dikerjakan)

- [ ] **1. Judul langkah** — deskripsi singkat

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 053 <no> "teks"`)_
