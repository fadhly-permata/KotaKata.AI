---
name: log-triage
description: Triase error log dari database Supabase (tabel user_log_reports) — ambil satu row, diagnosa akar masalah, kerjakan fix-nya, lalu delete row tersebut HANYA bila fix sudah berhasil diverifikasi. Gunakan skill ini setiap kali user meminta "cek error log di database", "perbaiki error dari log", "triage log", atau setelah user melaporkan error dari halaman Log.
---

# KotaKata.AI — Triase Error Log dari Database (ambil 1 → fix → delete)

Skill untuk **agent** dalam menangani error log yang dikirim user dari halaman Log
(aplikasi) ke tabel `public.user_log_reports` di Supabase. Alur wajib: **ambil satu
row → diagnosa → kerjakan fix → verifikasi → delete row (hanya jika fix berhasil).**

User bisa meminta dengan bahasa sehari-hari, contoh:
- "cek error log di database"
- "ada error di log, perbaiki dong"
- "triage log yang masuk"
- "kenapa bisa error?" (lalu rujuk ke skill ini)

## Lokasi & alat

- Tabel: `public.user_log_reports` (Supabase) — kolom: `id` (uuid), `user_id`, `level`
  (`error`/`warn`), `payload` (jsonb, ARRAY entri log), `device_id`, `platform`,
  `app_version`, `created_at`.
- Query DB: `node scripts/db/supabase-run.mjs "<SQL>"` (baca token dari env sendiri,
  TIDAK mencetak secret). Bisa menerima file `.sql` juga.
- Verifikasi kode: `bun tsc -b --noEmit`, `bun test`, `bun lint`, dan
  `bun scripts/check/qa-logic.mjs` bila perubahan menyentuh domain/generator.
- Structure `payload` per entri:
  ```json
  { "level": "error|warn", "source": "promise|window|global|app|...",
    "message": "...", "details": "opsional", "stack": "opsional (stacktrace + cause)", "createdAt": 1234567890 }
  ```

## Alur kerja wajib (urut, jangan dilewati)

### 1. Cek jumlah & ambil SATU row (tertua dulu — FIFO)

```bash
# Ringkasan jumlah per level
node scripts/db/supabase-run.mjs "SELECT level, count(*) FROM public.user_log_reports GROUP BY level;"

# Ambil 1 row PALING LAMA yang belum ditangani (FIFO)
node scripts/db/supabase-run.mjs "SELECT id, user_id, level, platform, app_version, created_at, jsonb_array_length(payload) AS n_entries FROM public.user_log_reports ORDER BY created_at ASC LIMIT 1;"
```

Catat `id` row tersebut. **Jangan** mengerjakan lebih dari satu row sekaligus —
skill ini dirancang satu-fix-per-row supaya tiap perbaikan bisa diverifikasi
terpisah dan row hanya dihapus setelah fix-nya terbukti.

### 2. Baca payload row itu secara LENGKAP

```bash
node scripts/db/supabase-run.mjs "SELECT jsonb_pretty(payload) FROM public.user_log_reports WHERE id = '<ID>';"
```

- Baca SEMUA entri dalam payload (bukan hanya yang pertama).
- Kelompokkan pola: pesan yang sama berulang = satu akar masalah.
- Kalau payload besar, lihat juga ringkasan:
  ```bash
  node scripts/db/supabase-run.mjs "SELECT jsonb_array_elements(payload)->>'message' AS message, count(*) AS n FROM public.user_log_reports, jsonb_array_elements(payload) WHERE id = '<ID>' GROUP BY message ORDER BY n DESC;"
  ```

### 3. Diagnosa akar masalah di kode

- Cari sumber error di `src/` berdasarkan `source` + `message` + `stack`:
  - `source: "promise"` → promise yang tidak ditangkap (paling sering `play()`,
    `fetch`, animasi, dsb.) — telusuri `.catch`/`try-catch` yang hilang.
  - `source: "window"` / `"global"` → error runtime global.
  - `source: "app"` → error dari `loggerError`/`loggerWarn` di kode.
- Gunakan `code_searcher` / `file_picker` untuk menemukan lokasi.
- **Pola yang sudah pernah ditemukan (periksa dulu):**
  - `NotSupportedError: The element has no supported sources` (source: promise) →
    efek suara web. Fix: `src/utils/sound.ts` memakai `HTMLAudioElement` manual +
    `Asset.fromModule` dan menangkap semua rejection — jangan kembali ke
    `expo-audio` di web (bug: `play()` tidak menangkap Promise rejection).
- Jelaskan akar masalah dengan singkat sebelum mengubah kode.

### 4. Kerjakan fix (minimal, jangan over-engineering)

- Ubah sesedikit mungkin, ikuti konvensi file sekitar.
- Jangan hapus/mengubah row DB sebelum fix selesai diverifikasi.

### 5. Verifikasi fix

Wajib menjalankan (semua dari root proyek):
```bash
bun tsc -b --noEmit
bun test
bun lint
```
Tambahan bila menyentuh domain/generator/vocab:
```bash
bun scripts/check/qa-logic.mjs
```
Perbaiki sampai semua lolos. Baru lanjut ke langkah 6.

### 6. Delete row HANYA jika fix berhasil

```bash
node scripts/db/supabase-run.mjs "DELETE FROM public.user_log_reports WHERE id = '<ID>';"
```

- **Fix berhasil** = verifikasi langkah 5 lolos DAN akar masalah (sesuai diagnosa)
  sudah benar-benar dihilangkan dari kode.
- **Jangan delete** jika:
  - Belum yakin penyebabnya / fix belum tuntas.
  - Error butuh data tambahan (row ini jadi bukti — catat `id`-nya ke user).
  - Hanya mau menyembunyikan error (bukan memperbaiki).
- Setelah delete, konfirmasi jumlah tersisa:
  ```bash
  node scripts/db/supabase-run.mjs "SELECT count(*) FROM public.user_log_reports;"
  ```

### 7. Laporkan & commit

- Ringkas ke user: id row, pesan error, akar masalah, fix yang dibuat, status
  verifikasi, apakah row di-delete.
- Tawarkan commit & push (jangan commit otomatis tanpa diminta).

## Aturan penting

- **Satu row per sesi triase.** Kalau ada banyak row, kerjakan satu, selesaikan,
  lalu tanya/lanjut ke berikutnya — jangan menumpuk fix.
- **Auto-purge otomatis (pg_cron).** Job `purge-user-log-reports` di Supabase
  menghapus row `user_log_reports` berumur > 30 hari setiap hari 03.00 UTC
  (migrasi `supabase/migrations/user-log-reports-purge.sql`). Karena itu triase
  sebaiknya dilakukan sebelum umur row lewat 30 hari — row yang sudah terhapus
  cron TIDAK bisa di-recover (tidak perlu dicari/di-rollback).
- **Delete HANYA setelah fix terbukti.** Row adalah bukti error; menghapus sebelum
  fix = menutup mata, bukan memperbaiki.
- Jangan pernah mencetak/membaca secret dari `.env*`; `supabase-run.mjs` mengelola
  token sendiri.
- Kalau ada row dengan `level: "warn"` (bukan error), tetap triase — warning
  biasanya petunjuk error berikutnya.
- Perubahan kode harus tetap konsisten dengan plan/checkpoint proyek
  (`.agents/checkpoint.json`, `.agents/plans/`).
