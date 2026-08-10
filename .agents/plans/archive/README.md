# 📦 Arsip — Dokumen Superseded

Folder ini berisi dokumen perencanaan **tahap awal** KotaKata.AI yang sudah
digantikan oleh sistem perencanaan resmi. Semua informasi di bawah sudah
**tidak dipakai lagi** dan dipertahankan hanya sebagai catatan sejarah.

## Yang pernah ada di sini (dihapus)

| File | Isi | Digantikan oleh |
| :--- | :--- | :--- |
| `development-plan.md` | Rencana 19 fase awal pembangunan | `.agents/checkpoint.json` (19 phase, status per fase) |
| `CHECKPOINT.md` | Checkpoint progres awal + bug tracker manual | `.agents/checkpoint.json` + plan revisi + `scripts/check/*` |
| `DESIGN_PLAN.md` | Wishlist redesign UI awal (32 item unchecked) | PLAN-001 (semua redesign sudah dieksekusi) |

## Sumber resmi saat ini

- **Status fase inti:** `.agents/checkpoint.json`
- **Plan revisi aktif:** `.agents/plans/PLAN-001.md` … `PLAN-005.md` (semua ✅ done)
- **Ringkasan progres & rilis:** `RELEASE_NOTES.md`
- **Panduan pemain:** `GUIDE.md`, `README.md`
- **Verifikasi otomatis:** `scripts/check/*` + unit test (`bun test`)

> Catatan: item "Known Technical Debt" di CHECKPOINT.md lama (demo words
> hardcoded, belum sync Supabase, belum unit test) **semuanya sudah selesai** —
> vocabulary terintegrasi penuh, sync cloud aktif, dan unit test domain logic
> tersedia sejak Agustus 2026.
