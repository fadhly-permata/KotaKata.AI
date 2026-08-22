# PLAN-080: Log Error Pre-Login Langsung Kirim ke Supabase

## Status: DONE

## Laporan / Permintaan (dari pemilik)
Kita punya tabel log, tapi error saat user BELUM login tidak terkirim ke
Supabase (laporan log manual butuh sesi login). Permintaan: kalau ada error
disaat user belum login, log langsung dikirim ke Supabase.

## Konteks
APK verifikasi (build 677a27c3) sekarang menampilkan ErrorBoundary
("Terjadi Kesalahan") — bukan putih polos lagi — artinya ada error render
yang tertangkap, tapi detailnya hanya tersimpan di DB lokal device.
Dengan pengiriman otomatis ini, error seperti itu langsung kelihatan di DB.

## Langkah
- [x] Pelajari struktur tabel `user_log_reports` (user_id NOT NULL + policy
      insert milik-user-sendiri) + `logReportRepository`
- [x] Migration `supabase/migrations/public-log-report-insert.sql`:
      RPC `insert_public_log_report` (security definer, grant anon +
      authenticated) — user_id diisi dari sesi bila login, kalau anon pakai
      `device:<device_id>` / fallback `anonymous`; validasi level &
      ukuran payload; tidak pernah melempar error. Sudah diterapkan ke
      Supabase (HTTP 201)
- [x] Hook otomatis di `logDb.writeLog`: setiap log level `error` langsung
      dicoba kirim via `logReportRepository.sendPublic` (lazy import anti
      circular dependency; fire-and-forget — gagal/offline = tetap tersimpan
      lokal; anti-spam maksimal 1 kirim per 3 detik)
- [x] Verifikasi: tsc --noEmit ✅ · bun test 69 pass ✅ · migration applied ✅
