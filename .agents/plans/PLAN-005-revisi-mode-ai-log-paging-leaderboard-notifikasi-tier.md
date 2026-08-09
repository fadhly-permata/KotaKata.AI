# Revisi Mode AI, Log Paging, Leaderboard & Notifikasi Tier

<!-- status: done -->
<!-- dibuat: 2026-08-09 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 005`
> (lihat `bun .agents/plans/plan.mjs help`)

## Langkah

- [ ] **1. Sebutkan asal bahasa untuk kata non-Indonesia** — DIDEFER oleh user (2026-08-09): prosesnya lama, dikerjakan nanti terpisah. Banyak soal bukan berbahasa Indonesia, tetapi clue 1, 2, 3 tidak menyebutkan kata itu berasal dari bahasa apa.

- [x] **2. Mode AI: tanpa kalkulasi XP sama sekali** — untuk game yang di-generate AI, jangan mengakumulasi XP dalam bentuk apa pun: tidak menambah XP saat menyelesaikan kata, dan tidak mengurangi XP saat menggunakan clue. Beri informasi jelas ke user bahwa mode ini tidak melakukan kalkulasi apa pun terhadap XP.

- [x] **3. Fix bug board AI selesai masih "nyangkut"** — ketika game sudah selesai (terutama setelah bermain mode AI), lalu dibuka lagi melalui tombol "Mulai Bermain", game yang sebelumnya masih muncul/nyangkut padahal sudah terjawab semua. Pastikan game selesai benar-benar ditutup/bersih dan tidak ter-muat ulang.

- [x] **4. Simpan soal AI baru ke database vocabulary** — setiap user memainkan mode AI, ambil soal-soal yang belum terdaftar di database lalu simpan langsung ke database, supaya database vocabulary makin meningkat.

- [x] **5. Mode AI: soal sesuai tier pemain** — sebisa mungkin soal yang di-generate AI menyesuaikan dengan TIER pemain agar tetap menantang dan seru.

- [x] **6. Halaman Log: tombol aksi pindah ke atas** — pindahkan posisi tombol "Muat Ulang", "Salin", dan "Hapus Log" ke atas halaman, supaya user tidak perlu scroll dulu untuk menyalin data.

- [x] **7. Halaman Log: paging dengan row custom** — tambahkan paging pada daftar log (jumlah row per halaman bisa di-custom), supaya tidak perlu menampilkan semua log sekaligus.

- [x] **8. Main Screen: tombol Daftar Tier** — buat tombol "Daftar Tier" yang menampilkan seluruh tier, dengan highlight pada tier yang sama dengan level user.

- [x] **9. Main Screen: tombol Leaderboard** — buat tombol Leaderboard agar user bisa melihat posisinya. Urutkan posisi leaderboard berdasarkan level dan waktu kenaikan (total XP / updated_at).

- [x] **10. Notifikasi perubahan tier** — ketika user naik atau turun tier (baik di main screen maupun in-game screen), tampilkan notifikasi bahwa user mengalami perubahan tier.

## Catatan Revisi
- **10.** 2026-08-09: Komponen TierChangeToast dipasang di Main Menu & layar Game untuk notifikasi naik/turun tier.
- **9.** 2026-08-09: Tombol Leaderboard di Main Menu; urut total_xp desc lalu updated_at asc, highlight baris sendiri, medal top 3.
- **8.** 2026-08-09: Tombol Daftar Tier di Main Menu; modal 10 tier dengan highlight tier pemain (warna + tag 'Kamu di sini').
- **7.** 2026-08-09: Paging log: prev/next + info halaman + chip jumlah baris per halaman (25/50/100/200).
- **6.** 2026-08-09: Tombol Muat Ulang / Salin / Hapus Log dipindah ke atas (di bawah ringkasan log).
- **5.** 2026-08-09: requestAiWords kini menerima playerTier; MainMenu mengirim calcTier(totalXp) dan prompt berisi panduan kesulitan per tier.
- **4.** 2026-08-09: RPC insert_ai_vocabulary (supabase/migrations/ai-vocabulary-insert.sql) + vocabularyRepository.saveAiWords; dipanggil fire-and-forget setelah kata AI diterima.
- **3.** 2026-08-09: Fix auto-save zombie: timer auto-save re-check boardResult saat fire + dibatalkan saat board selesai; progres AI disimpan dengan flag aiMode.
- **2.** 2026-08-09: Mode AI tanpa XP total: gate aiMode di gameStore (markWordSolved, useClue2/3, reveal), skip XP upsert saat board selesai, badge 'Mode AI' di top bar, tooltip/dialog gratis, info di CompletionOverlay.

- **1.** 2026-08-09: DIDEFER oleh user — "koreksi soal & clue kerjain nanti aja, karna lama prosesnya". Perubahan SYSTEM_PROMPT (aturan #5, wajib sebut bahasa asal) yang sempat dibuat di-revert; dikerjakan ulang terpisah.
