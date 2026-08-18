# PLAN-066 — Pusatkan Tombol-Tombol Panel Clue

## Problem

Tombol-tombol pada panel clue (CluePill) tidak center/terpusat. User ingin posisi tombol-tombol tersebut di-center.

## Current State

Panel clue (`CluePill.tsx`) berisi:
- Nomor soal + arah (Mendatar/Menurun)
- Teks clue
- Tombol navigasi ◀ ▶ (prev/next word)
- Indikator halaman (jika multi-halaman)

Layout saat ini kemungkinan menggunakan `flexDirection: "row"` dengan justify default.

## Solution

- Update `CluePill.tsx` — center alignment untuk tombol-tombol navigasi (◀ ▶)
- Pastikan responsive: tetap center di semua ukuran layar (HP, tablet, web)
- Jangan mengubah posisi clue text — hanya center tombol navigasi

## Files Changed
- `src/presentation/components/game/CluePill.tsx`

## Verification
- tsc -b --noEmit → 0 errors
- bun test → pass
- Visual: tombol ◀ ▶ center di panel clue (HP + web)
