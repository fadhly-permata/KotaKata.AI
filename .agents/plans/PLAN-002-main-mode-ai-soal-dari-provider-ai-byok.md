# Main Mode AI — soal dari provider AI (BYOK)

<!-- status: pending -->
<!-- dibuat: 2026-08-09 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 002`
> (lihat `bun .agents/plans/plan.mjs help`)
>
> **Keputusan desain (dari user):** provider preset = OpenRouter + HuggingFace + URL kustom;
> fallback gagal AI = pesan error + tawarkan mode normal. Status: ditambahkan ke plan dulu, belum dieksekusi.

## Langkah

- [ ] **1. Ganti tombol "Misi Harian" → "Main Mode AI"** — di halaman utama (`MainMenuScreen.tsx`), kartu aksi pertama berganti label + emoji jadi mode main AI. Tidak ada perubahan tinggi/lebar kartu.
- [ ] **2. Popup konfirmasi provider belum diatur** — saat "Main Mode AI" ditekan dan belum ada provider AI tersimpan, tampilkan dialog ramah (kata-kata diperbaiki dari usulan user yang terasa rancu, mis. "Provider AI belum diatur. Mau diatur dulu sebelum main?"), dengan tombol **Atur Sekarang** (membuka halaman pengaturan provider) dan **Batal**.
- [ ] **3. Halaman "Pengaturan Provider AI" (entry sederhana)** — pilih provider preset: **OpenRouter**, **HuggingFace**, atau **URL kustom**; isi API key + nama model; tombol **Tes Koneksi** dan **Simpan**. Key disimpan lokal di AsyncStorage (BYOK — tidak pernah dikirim ke cloud KotaKata).
- [ ] **4. Tombol "Tambahkan Provider AI" di Pengaturan** — di `SettingsScreen.tsx` ada tombol baru yang membuka halaman entry provider; tampilkan juga status provider yang sudah tersimpan (aktif / belum).
- [ ] **5. Alur main mode AI** — jika provider tersimpan, request soal ke provider: prompt meminta daftar kata Bahasa Indonesia + clue (format JSON), hasil di-parse lalu di-generate menjadi papan lewat `crosswordGenerator` yang sudah ada, dan dimainkan seperti biasa. Kalau request gagal / respons tidak valid → **pesan error ramah + tawarkan bermain mode normal** (opsi "Main Mode Normal" dan "Coba Lagi"), tanpa merusak mode normal.
- [ ] **6. Validasi** — `bun tsc --noEmit` bersih dan script cek (check-nav-lock / check-variety) tetap jalan.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 002 <no> "teks"`)_
