# Sejarah Permainan lazy-load — paging saat scroll

<!-- status: done -->
<!-- dibuat: 2026-08-11 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 008`
> (lihat `bun .agents/plans/plan.mjs help`)

## Latar belakang

Halaman **"Sejarah Permainan"** (`GameHistoryScreen`) saat ini memuat SEMUA
papan yang sudah selesai sekaligus: `boardRepository.getFinished(user.id)`
dibatasi `.limit(100)` tanpa offset/range — jadi maksimal 100 riwayat, dimuat
sekaligus di awal (ScrollView + `boards.map(...)`), makin lambat makin banyak
board. (Catatan: halaman "Kata Ditemukan" `HistoryScreen` SUDAH lazy-load paging
25 — pola yang sama akan dipakai di sini.)

## Langkah

- [x] **1. Repository: dukung paging di `getFinished`** — ubah
  `src/data/repositories/boardRepository.ts` → `getFinished(userId, opts?: {
  limit?: number; offset?: number })` memakai `.range(offset, offset+limit-1)`
  pada query yang sudah ada (tetap `is_finished = true`, order
  `updated_at desc`). Default `limit` 25 (bukan 100) supaya pemanggil lain tidak
  kena cap lama; update pemanggil yang ada. Tambahkan `countFinished(userId)`
  untuk label total (pakai `count: "exact"`), dipakai langkah 2.

- [x] **2. `GameHistoryScreen`: ganti ScrollView → FlatList + lazy-load paging**
  — refactor `src/features/history/GameHistoryScreen.tsx` mengikuti pola
  `HistoryScreen`: (a) `PAGE_SIZE = 25`; (b) state `items/total/loading/
  loadingMore/hasMore/loadError` + refs guard (`pageRef`, `hasMoreRef`,
  `loadingMoreRef`, `resetTokenRef`) supaya load-more tidak bertumpuk & response
  basi dibuang; (c) muat halaman pertama saat focus (via `useFocusEffect` yang
  ada) dengan reset; (d) `onEndReached` (threshold ~0.4) + `onScroll` fallback
  jarak < 600px memuat halaman berikutnya (append, offset = page*PAGE_SIZE);
  (e) footer: spinner "Memuat riwayat lainnya…" saat `loadingMore`, tombol
  manual "Muat lebih banyak" sebagai jaring pengaman, label "— Akhir riwayat —"
  saat `hasMore=false`; (f) header label total "{n} permainan selesai" bila
  `total > 0`; (g) empty/error state tetap (dengan opsi coba lagi saat error);
  (h) `renderItem` memakai `useCallback`, `keyExtractor` = `board_id`;
  `parseMeta` tetap dipanggil per item saat mapping halaman.

- [x] **3. Verifikasi** — `bun tsc -b --noEmit`, `bun test`, `bun lint` lolos;
  `bun scripts/check/qa-logic.mjs` tidak terdampak (tidak sentuh domain/vocab).
  Test manual (web): halaman Sejarah Permainan memuat 25 baris pertama, scroll
  ke bawah memuat 25 berikutnya sampai habis, label akhir muncul; pull/focus
  ulang mereset ke halaman 0; tanpa error, tanpa duplikat baris.

## Catatan Revisi

- **2.** 2026-08-11: GameHistoryScreen di-refactor ke FlatList + paging 25 (onEndReached + onScroll fallback <600px, guard anti-tumpuk via refs + token anti-basi), header total count, footer spinner/tombol manual/akhir riwayat, empty+error state dengan tombol Coba lagi; getFinished + countFinished di boardRepository memakai range()
