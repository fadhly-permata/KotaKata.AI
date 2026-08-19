# PLAN-067 — Perbaiki Kualitas Clue & Kosakata KBBI

## Problem

Dua masalah kualitas kosakata ditemukan:

### 1. Clue bocor (mengandung jawaban)
Banyak clue mengandung kata dasar atau bentuk imbuhan dari jawaban:
- **"sepak"** (tier 1): clue = "menyepak dengan kaki" → mengandung "sepak"
- **"berhitung"** (tier 2): clue = "mengerjakan hitungan" → mengandung "hitung"
- Kasus serupa diperkirakan ada di banyak tier lain

### 2. Kosakata bukan KBBI
Banyak kata dalam database bukan kata resmi KBBI:
- **"amit"** (tier 2): ini bahasa gaul/bukan KBBI → harus diganti
- Perlu audit menyeluruh seluruh 10.000 kata untuk menemukan semua yang bukan KBBI

## Scope

- Audit clue di semua tier (1–10): cari clue yang mengandung jawaban (kata dasar atau bentuk imbuhan)
- Audit kosakata di semua tier: identifikasi kata yang bukan KBBI standar
- Perbaikan: rewrite clue yang bocor, ganti kata non-KBBI dengan kata KBBI yang sesuai
- Push perubahan ke Supabase setelah perbaikan
- Jalankan scanner vulgar untuk memastikan 0 hit

## Status

**done** — 115 clue leak diperbaiki across 9 tier files. Vulgar scanner: 0 hit VULGAR & ANSWER-ONLY. tsc pass. Vocabulary sudah bundled di app code.
