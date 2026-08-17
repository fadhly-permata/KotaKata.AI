# Mode AI — exclude kata yang sudah pernah ditemukan/dipecahkan pemain

<!-- status: pending -->
<!-- dibuat: 2026-08-17 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 050`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "untuk mode AI, tambahkan exclude word. exclude kata-kata yang pernah
> ditemukan/dipecahkan. Karna mode AI ini selalu menggunakan soal yang sama
> berulang kali."

**Tujuan:** saat pemain menekan **Main Mode AI**, kata-kata yang sudah pernah
ditemukan/dipecahkan (riwayat `word_discoveries` — halaman "Kata Ditemukan")
tidak boleh muncul lagi sebagai soal AI. Saat ini prompt AI hanya menyuruh
"Semua kata harus unik" tanpa tahu riwayat pemain, sehingga soal yang sama
sering berulang.

## Cakupan

- `src/utils/aiProvider.ts` — `requestAiWords(cfg, playerTier, signal)` diberi
  parameter baru daftar kata yang dikecualikan → prompt AI menyebutkan kata-kata
  itu dan melarang menggunakannya.
- `src/features/game/MainMenuScreen.tsx` — `handlePlayAi`: sebelum meminta soal,
  ambil riwayat kata yang sudah ditemukan user (cloud), ubah ke teks kata, lalu
  teruskan ke `requestAiWords`.
- Sumber riwayat (sudah tersedia):
  - `wordDiscoveryRepository.getDiscoveredWordIds(user.id)` → `word_id` yang
    sudah ditemukan.
  - `vocabularyRepository.getByIds(wordIds)` → `VocabularyDoc.word` (teks).
  - `useAuth()` → `user.id` (pola sama dengan HistoryScreen).
- **Batas jumlah**: riwayat bisa ribuan kata; kirim maksimal ±300 kata
  terbaru ke prompt (jangan boros token provider). Batas ini cukup untuk
  mencegah pengulangan praktis tanpa membuat prompt melebihi konteks.

## Langkah

- [ ] **1. `requestAiWords`** — tambah parameter `excludeWords?: string[]`
  (default kosong); saat ada, sisipkan ke user prompt: daftar kata yang dilarang
  ("JANGAN gunakan kata-kata berikut: …") dengan cap ±300.
- [ ] **2. Ambil riwayat di `handlePlayAi`** — sebelum `requestAiWords`:
  `getDiscoveredWordIds(user.id)` → `getByIds(...)` → ambil teks kata →
  potong 300 terakhir (mis. urut discovery terbaru) → teruskan.
  Gagal ambil riwayat (offline/error) = jangan blokir Mode AI; lanjutkan tanpa
  exclude (fallback aman).
- [ ] **3. Validasi ganda di sisi klien** — selain prompt, tetap filter hasil
  `requestAiWords` di kode: buang kata yang ada di daftar exclude (jaga-jaga
  model AI melanggar).
- [ ] **4. Verifikasi** — tsc + tes + lint; tes unit untuk `requestAiWords`
  (exclude tercantum di prompt & hasil difilter).
- [ ] **5. Rilis** — commit + push + deploy web (aturan #6).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 050 <no> "teks"`)_
