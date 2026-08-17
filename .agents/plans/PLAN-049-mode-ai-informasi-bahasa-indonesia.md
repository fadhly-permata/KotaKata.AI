# Mode AI — tampilkan informasi bahwa bahasa soal adalah Bahasa Indonesia

<!-- status: pending -->
<!-- dibuat: 2026-08-17 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 049`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "untuk mode AI, bisa tambahkan informasi bahasa yang digunakan adalah bahasa
> indonesia."

**Tujuan:** pemain perlu tahu bahwa soal yang dibuat Mode AI (dari provider
OpenRouter / HuggingFace / URL kustom) selalu **berbahasa Indonesia** —
kosakata, clue, dan arah permainan semuanya Bahasa Indonesia. Saat ini
informasi ini hanya tersirat di system prompt AI (`aiProvider.ts`), tidak
terlihat oleh pemain.

## Cakupan

- UI Mode AI — titik yang paling terlihat pemain:
  1. **Halaman pengaturan provider** (`src/features/ai/AiProviderScreen.tsx`)
     — deskripsi "Main Mode AI memakai model dari provider yang kamu pilih…"
     ditambah kalimat bahwa semua soal & petunjuk dibuat dalam **Bahasa
     Indonesia**.
  2. **Dialog loading soal AI** di Main Menu (`src/features/game/MainMenuScreen.tsx`,
     `title="Main Mode AI"`) — tambahkan baris info "🇮🇩 Soal dalam Bahasa
     Indonesia".
  3. (opsional) **Badge in-game** `GameTopBar` ("🤖 Mode AI") — bisa ditambah
     label bahasa, tapi dijaga tetap ringkas di header sempit.
- Tidak mengubah perilaku AI / prompt — murni penambahan info di UI.

## Langkah

- [ ] **1. AiProviderScreen** — tambahkan info "Soal dibuat dalam Bahasa
  Indonesia" di deskripsi halaman pengaturan provider.
- [ ] **2. Dialog loading Main Menu** — tambahkan baris info bahasa pada dialog
  "Main Mode AI" (saat meminta soal ke provider).
- [ ] **3. (Opsional) badge in-game** — pertimbangkan label bahasa ringkas di
  badge "Mode AI" `GameTopBar` bila tidak membuat header sempit (cek layar
  kecil).
- [ ] **4. Verifikasi** — tsc + tes + lint, cek UI web (badge & dialog tampil
  rapi di layar sempit).
- [ ] **5. Rilis** — commit + push + deploy web (aturan #6).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 049 <no> "teks"`)_
