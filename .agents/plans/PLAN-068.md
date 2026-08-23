# PLAN-068 — Admin: Simulasi Resolusi Layar (cek tampilan tanpa ganti device)

**Status:** DONE ✅ (23 Aug 2026 — revisi baru dari pemilik)

> Catatan: isi lama plan ini ("Admin Editor Soal") sudah terwujud lewat
> `QuestionEditorScreen` dan dianggap selesai. Isi dokumen diganti dengan
> revisi baru di bawah.

## Revisi (permintaan pemilik, 23 Aug 2026)

Untuk user **admin**, tambahkan fitur **simulasi resolusi layar**, jadi tidak
perlu ganti device hanya untuk cek tampilan.

### Checklist
- [x] Komponen `ResolutionSimulator` (web only, admin only):
      tombol melayang 🖥️ kanan-bawah → modal simulasi.
- [x] Preview memakai iframe yang memuat halaman yang sama — viewport nyata,
      jadi `useWindowDimensions` / layout responsif ikut akurat.
- [x] Preset device: HP Kecil 320×568, Android S 360×640, iPhone 8 375×667,
      iPhone 13 390×844, Pixel 6 412×915, Tablet 768×1024.
- [x] Toggle Portrait/Landscape + input ukuran kustom (200–2560 px).
- [x] Auto-zoom: preview diskalakan agar selalu muat di layar sungguhan
      (label menampilkan ukuran & persen zoom).
- [x] Guard platform (aturan #5b): hanya render saat `Platform.OS === "web"`
      dan API DOM tersedia; di native APK/iOS komponen merender `null`
      (cek layout native tetap di device sungguhan). Non-admin juga `null`.
- [x] Dipasang di `RootNavigator` (di luar Stack.Navigator) sehingga tersedia
      di SEMUA halaman.
- [x] Verifikasi: tsc --noEmit ✅ · bun test 79/79 ✅

## Catatan teknis
- Iframe = instance app terpisah dengan viewport sesuai resolusi terpilih;
  sesi login dibagikan lewat localStorage same-origin, jadi tidak perlu
  login ulang di preview.
- Perubahan data di dalam preview TIDAK mengganggu sesi aslimu — preview
  dimuat ulang tiap kali resolusi diubah.
