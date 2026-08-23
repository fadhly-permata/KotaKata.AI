# PLAN-096 — Fitur Anti-Cheat

**Status:** DONE ✅ (23 Aug 2026 — validasi XP server-side)
**Tanggal:** 23 Aug 2026

## Deskripsi revisi (apa adanya dari pemilik)
> tambahkan fitur anti cheat dong.

## Pemahaman (perlu dirinci saat pengerjaan)
Permintaan terbuka — anti-cheat untuk game TTS KotaKata.AI. Kemungkinan vektor curang
yang relevan untuk didiagnosis & ditangani saat pengerjaan:
1. **Manipulasi waktu/jawaban lokal** — submit jawaban instan mustahil (interval tidak wajar),
   spam jawaban, atau edit state klien.
2. **Skor/progress palsu** — poin, streak, level naik tanpa permainan valid;
   validasi sisi server (RPC) alih-alih percaya payload klien.
3. **Brute-force jawaban** — menebak semua kombinasi kata dengan cepat
   (rate-limit percobaan jawaban / penalti salah beruntun).
4. **Multi-akun / reset berulang** — eksploitasi reset level untuk farming.
5. **Integritas Mode AI** — soal AI yang bocor/invalid dipakai menipu skor.

## Rencana pengerjaan (belum dieksekusi)
1. Audit jalur submit jawaban/skor: mana yang ditentukan klien vs divalidasi server.
2. Tambah validasi server-side (RPC Supabase): durasi minimum, kecocokan board,
   rate-limit percobaan, penalti pola abnormal.
3. Deteksi sederhana di klien + logging `loggerWarn` ke Supabase untuk pola curiga
   (tanpa mengganggu pemain normal).
4. Verifikasi lintas platform web & native (aturan #5b) + tsc/test → commit → deploy web.

## Catatan
- Perlu konfirmasi arah prioritas dari pemilik saat mulai dikerjakan:
  fokus ke validasi skor server-side dulu, atau deteksi perilaku curang dulu?

## Hasil pengerjaan
1. **Validasi XP server-side** — RPC `apply_board_xp(p_delta, p_play_seconds)`
   (security definer) di Supabase:
   - Delta di-clamp ke [-5000, +8000] (teoretis maks papan ±4500).
   - Delta positif wajib durasi ≥ 10 detik.
   - Rate limit: submit positif beruntun < 8 detik ditolak.
   - Total XP & tier dihitung ulang SERVER-SIDE dari ambang resmi.
2. Kolom baru `users.last_board_at` untuk rate limit.
3. GameScreen tidak lagi menulis `total_xp` absolut via upsert — kini kirim
   delta + durasi ke RPC; nilai balikan server dipakai untuk store.
4. Penolakan dicatat via loggerWarn → Supabase (tanpa mengganggu pemain normal).
