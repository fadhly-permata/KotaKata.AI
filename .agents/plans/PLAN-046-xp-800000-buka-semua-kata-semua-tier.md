# XP ≥ 800.000: semua kata dari tier manapun boleh keluar lagi

<!-- status: done -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 046`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi dong agar:
> - Setelah user mencapai XP 800.000 maka semua kata dari tier manapun boleh
>   keluar lagi."

**Tujuan:** pemain dengan **XP ≥ 800.000** (jauh melampaui ambang tier 10 =
500.000) tidak lagi dibatasi tier — pool kata untuk papan diambil dari
**SEMUA tier (1–10)**. Kata yang sudah pernah ditemukan tetap dikecualikan
(aturan `word_discoveries` tidak berubah: kata yang sudah ditemukan tidak
muncul lagi dari tier mana pun).

## Cakupan

- `src/domain/usecases/wordPoolFilter.ts` — `selectWordPool` saat ini memanggil
  `vocabularyRepository.getByTierFromCloud(playerTier, excludedWordIds)` yang
  hanya mengambil satu tier.
- `src/data/repositories/vocabularyRepository.ts` — butuh jalur query tanpa
  filter tier (atau tier `all`) beserta `excludedWordIds`.
- Pemanggil `selectWordPool` (generator papan — cek `gameStore` / usecase
  pembangkit board) supaya XP user diteruskan.
- `xpEngine.ts` — tambah konstanta `UNLOCK_ALL_TIERS_XP = 800000` (bukan
  threshold tier baru; XP 800k > tier 10).

## Langkah

- [x] **1. Konstanta & logika unlock** — tambah `UNLOCK_ALL_TIERS_XP = 800000`
  di `xpEngine.ts` + helper (mis. `shouldUnlockAllTiers(totalXp)`).
- [x] **2. Repository dukung semua tier** — `vocabularyRepository` method
  ambil kata dari semua tier (query tanpa filter `tier_level`, tetap terima
  `excludedWordIds`) atau perluas `getByTierFromCloud` dengan mode `all`.
- [x] **3. Wire pemanggil** — `selectWordPool` menerima flag/mode all-tiers
  (dari XP user via pemanggil); papan yang dihasilkan memakai pool lintas
  tier; kata ditemukan tetap di-exclude.
- [x] **4. Verifikasi** — tsc + tes (tambah unit test pola unlock bila ada
  pola tes yang sama) + lint; cek alur pembangkitan papan di web/native.
- [ ] **5. Push & rilis** — commit + push + deploy web (aturan #6).

## Catatan Revisi

- **4.** 2026-08-17: UNLOCK_ALL_TIERS_XP=800000 + shouldUnlockAllTiers() di xpEngine; vocabularyRepository.getAllTiersFromCloud(excludedWordIds) (tanpa filter tier, eksklusi server-side chunk); WordPoolFilterParams.allTiers + selectWordPool branch; GameScreen kirim allTiers dari totalXp. 3 tes unit baru (bawah/tepat/di atas ambang + ambang > tier 10). tsc + 50 tes + lint lolos.
