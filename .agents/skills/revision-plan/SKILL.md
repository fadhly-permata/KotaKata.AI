---
name: revision-plan
description: Kelola dokumen plan revisi di .agents/plans melalui agent — start/stop/pause plan, mencentang item selesai, mencatat revisi, menambah/mengedit item daftar revisi, dan membuat plan baru. Gunakan skill ini setiap kali user meminta memulai/menjeda/menyelesaikan plan revisi atau mengubah isi daftar revisi.
---

# KotaKata.AI — Kelola Plan Revisi (via Agent)

Skill untuk **agent** (bukan user manual) dalam mengelola dokumen plan revisi di
`.agents/plans/`. User cukup minta dengan bahasa sehari-hari, misalnya:
- "mulai plan 001" / "lanjutkan plan revisi"
- "pause dulu" / "hentikan plan ini"
- "tandai item 3 selesai" / "item 5 udah kelar"
- "catat revisi item 2: ..."
- "tambah item revisi baru: ..." / "buat plan baru ..."

Agent yang memegang skill ini bertanggung jawab menjalankan semua operasi itu.

## Lokasi & alat

- Dokumen plan: `.agents/plans/PLAN-NNN-*.md` (satu file per plan)
- Command pengelola: `bun .agents/plans/plan.mjs <cmd>` (dari root proyek)
- Dokumentasi lengkap: `bun .agents/plans/plan.mjs help` atau `.agents/plans/README.md`

## Perintah yang tersedia

```bash
bun .agents/plans/plan.mjs list                    # daftar semua plan + progres
bun .agents/plans/plan.mjs new "Judul"             # buat plan baru (PLAN-NNN otomatis)
bun .agents/plans/plan.mjs start <no>              # mulai / lanjutkan plan
bun .agents/plans/plan.mjs pause <no>              # jeda plan
bun .agents/plans/plan.mjs stop <no>               # tandai plan SELESAI
bun .agents/plans/plan.mjs status <no>             # lihat progres satu plan
bun .agents/plans/plan.mjs check <no> <item>       # centang item selesai
bun .agents/plans/plan.mjs uncheck <no> <item>     # batalkan centang
bun .agents/plans/plan.mjs note <no> <item> "teks" # catat revisi pada item
bun .agents/plans/plan.mjs notes <no>              # lihat semua catatan revisi
```

`<no>` = nomor plan (001, 002, dst). `<item>` = nomor langkah di dalam plan.

## Format dokumen plan (wajib dipatuhi)

```
# Judul Plan

<!-- status: pending | in-progress | paused | done -->
<!-- dibuat: YYYY-MM-DD -->

## Langkah

- [ ] **1. Judul langkah** — deskripsi singkat
- [x] **2. Judul langkah** — sudah selesai

## Catatan Revisi

- **1.** YYYY-MM-DD: catatan revisi langkah 1
```

Aturan:
- Nomor langkah WAJIB `**N. ...**` setelah checkbox `- [ ]` / `- [x]`.
- Status valid: `pending | in-progress | paused | done`.
- Catatan revisi: `- **N.** <tanggal>: <teks>` di bawah `## Catatan Revisi`.

## Cara edit isi daftar revisi (via agent)

Jangan menyuruh user mengedit manual — agent yang mengedit:

1. **Baca dulu** file plan target (`read_files`) sebelum mengubah apa pun.
2. **Menambah item baru** ke plan yang ada: pakai `str_replace` pada bagian
   `## Langkah` — tambahkan baris `- [ ] **<no-berikutnya>. <Judul>** — <deskripsi>`
   di akhir daftar, atau sisipkan di posisi yang masuk akal lalu penomoran
   dirapikan ulang (pastikan nomor urut tetap berurutan & unik).
3. **Mengubah deskripsi / judul item**: `str_replace` pada baris item tsb —
   jangan sentuh checkbox atau nomornya kecuali memang diminta.
4. **Menghapus item**: hapus baris item + catatan terkaitnya, rapiikan nomor.
5. **Membuat plan baru**: jalankan `bun .agents/plans/plan.mjs new "Judul"`,
   lalu `str_replace` isi bagian `## Langkah` dengan item-item revisinya.
6. Setelah edit manual, verifikasi: `bun .agents/plans/plan.mjs status <no>`
   — pastikan jumlah item terdeteksi benar.

## Alur kerja standar

1. User minta mulai → `bun .agents/plans/plan.mjs start <no>` (atau `list`
   dulu kalau tidak yakin nomornya).
2. Kerjakan item satu per satu (ubah kode sesuai deskripsi item).
3. Setiap item selesai:
   - `bun .agents/plans/plan.mjs check <no> <item>`
   - `bun .agents/plans/plan.mjs note <no> <item> "<ringkasan perubahan & alasan>"`
4. User minta jeda → `bun .agents/plans/plan.mjs pause <no>`.
5. User minta lanjut → `bun .agents/plans/plan.mjs start <no>`.
6. Semua item selesai → `bun .agents/plans/plan.mjs stop <no>`.

## Kapan harus meminta konfirmasi user

- Menghapus item / plan yang sudah ada → konfirmasi dulu.
- Stop plan padahal masih ada item belum dicentang → tanya dulu (atau tandai
  item yang memang sudah dikerjakan lalu stop).
- Menambah item yang mengubah cakupan → cukup catat di plan, tidak perlu izin
  khusus (plan memang dirancang untuk berkembang).

## Catatan penting

- Setiap `check` / `note` / `start` / `pause` / `stop` langsung menulis ke file
  markdown → riwayat revisi otomatis tercatat di git.
- Kalau file plan di-edit manual (add/hapus item), jalankan `list` atau
  `status` setelahnya untuk memastikan CLI masih membaca dengan benar.
- Jangan commit otomatis tanpa diminta user; tawarkan commit & push setelah
  sekumpulan revisi selesai.
