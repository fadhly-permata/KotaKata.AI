# 📋 Sistem Plan Revisi — `.agents/plans/`

Folder ini berisi **rencana revisi** KotaKata.AI yang dijalankan satu per satu.
Setiap plan adalah satu file markdown (`PLAN-NNN-*.md`) yang berisi daftar
langkah revisi dengan checkbox, status plan, dan catatan revisi yang sudah
dikerjakan.

## 🤖 Cara PRAKTIS: minta agent yang kerjain (disarankan)

**Tidak perlu mengedit file manual.** Tinggal minta agent (Buffy) dengan bahasa
sehari-hari — agent memakai skill **`revision-plan`** untuk menjalankan semuanya:

- "mulai plan 001" / "lanjutkan plan revisi" → `start`
- "pause dulu" → `pause`  ·  "hentikan/selesaikan plan ini" → `stop`
- "tandai item 3 selesai" / "item 5 udah kelar" → `check`
- "catat revisi item 2: ..." → `note`
- "tambah item revisi baru: ..." → agent mengedit file plan langsung
- "buat plan baru berjudul ..." → `new` + agent mengisi daftar itemnya

Skill berada di `.agents/skills/revision-plan/SKILL.md`.

## Alat: `plan.mjs`

Semua operasi dikelola lewat satu command: `bun .agents/plans/plan.mjs`.

```
bun .agents/plans/plan.mjs list                    # daftar semua plan + progres
bun .agents/plans/plan.mjs new "Judul"             # buat plan baru (PLAN-NNN)
bun .agents/plans/plan.mjs start <file|no>         # mulai / lanjutkan plan
bun .agents/plans/plan.mjs pause <file|no>         # jeda plan sementara
bun .agents/plans/plan.mjs stop <file|no>          # tandai plan SELESAI
bun .agents/plans/plan.mjs status [file|no]        # lihat progres (atau semua)
bun .agents/plans/plan.mjs check <file|no> <no>    # tandai langkah selesai
bun .agents/plans/plan.mjs uncheck <file|no> <no>  # batalkan tanda selesai
bun .agents/plans/plan.mjs note <file|no> <no> "catatan"   # catat revisi
bun .agents/plans/plan.mjs notes <file|no>         # lihat semua catatan revisi
bun .agents/plans/plan.mjs help                    # dokumentasi lengkap
```

> `file` bisa berupa nama file penuh (`PLAN-001-....md`) atau nomor (`001`).
> Dokumentasi lengkap format file + aturan ada di dalam `plan.mjs` itu sendiri
> (ketik `bun .agents/plans/plan.mjs help`).

## Alur kerja

1. **Buat plan** — `bun .agents/plans/plan.mjs new "Judul revisi"`.
   Isi daftar langkahnya di file markdown hasil generate.
2. **Mulai** — `bun .agents/plans/plan.mjs start 001` (status → `in-progress`).
3. **Kerjakan satu per satu** — setiap langkah selesai:
   - `bun .agents/plans/plan.mjs check 001 2` (centang langkah #2)
   - `bun .agents/plans/plan.mjs note 001 2 "Detail yang diubah & alasan"` (catat revisi)
4. **Jeda / lanjut** — `pause` saat berhenti sejenak, `start` untuk lanjut lagi.
5. **Selesai** — semua langkah dicentang → `bun .agents/plans/plan.mjs stop 001`.

Setiap `check`/`note` menulis langsung ke file markdown, jadi riwayat revisi
selalu tersimpan di git dan bisa dilihat siapa pun.

## Menambah plan baru di kemudian hari

Tidak ada batasan jumlah plan. Cukup jalankan `new` lagi — nomornya
diincrement otomatis (`PLAN-002`, `PLAN-003`, dst). Plan lama tetap bisa
dibaca, tidak terpengaruh.

## File di folder ini

| File | Isi |
| --- | --- |
| `plan.mjs` | Command pengelola plan (dokumentasi penggunaan ada di dalamnya) |
| `README.md` | Panduan ini |
| `PLAN-NNN-*.md` | Dokumen plan revisi (satu file per plan) |
| `archive/` | Dokumen historis (CHECKPOINT, DESIGN_PLAN, development-plan) |
