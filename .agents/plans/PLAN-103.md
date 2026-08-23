# PLAN-103 — Mode "Buat Soalmu Sendiri" via AI + Share

**Status:** ✅ INTI DONE (23 Aug 2026) — fitur share kode: menyusul (butuh desain tabel shared_boards)
**Tanggal:** 23 Aug 2026

## Deskripsi
> Rekomendasi enhancement #8 (fitur signature) — pemain ketik kata apa pun → AI
> bikin board-nya → bisa dibagikan ke teman (link/kode).

## Rencana pengerjaan (saat disuruh kerjakan)
1. Layar input kata (+ opsi tier) → generate board via provider BYOK yang ada.
2. Validasi clue anti-bocor (pakai logika yang sudah ada di editor).
3. Simpan board custom + kode share; layar main dari kode share.
4. Rate-limit per user agar biaya AI terkendali.
5. Verifikasi lintas platform (aturan #5b) → tsc/test → deploy web dev.

## Hasil pengerjaan (INTI — 23 Aug 2026)
1. Kartu **✍️ Buat Soal Sendiri** di Main Menu → modal input 6–10 kata + tier.
2. Clue dibuatkan AI via `requestAiRevisionBatch` (satu request batch, streaming
   thinking tampil live), clue bocor otomatis dibuang — minimal 6 kata valid.
3. Papan digenerate & dimainkan seperti biasa (hitung XP normal), kata disimpan
   ke bank kosakata (dedup) seperti Mode AI.
4. ~~**Share kode = BELUM**~~ → **SELESAI 23 Aug 2026 (bagian 2, arah revisi pemilik)**:
   bukan modal kode, tapi **halaman komunitas "Papan Bagikan"** (`SharedBoardsScreen`,
   rute baru + tombol di Main Menu). Tabel `shared_word_sets` HANYA memetakan
   **kode → daftar kata**; papan tiap pemain digenerate acak sendiri. Saat
   dimainkan, kata yang sudah ada di vocabulary memakai versi DB (teraudit);
   kata baru tetap disimpan ke vocabulary via saveAiWords. Daftar semua set
   tampil publik (paging 25 + nama pembuat via embed users), siapa pun bisa
   main soal buatan siapa pun.
