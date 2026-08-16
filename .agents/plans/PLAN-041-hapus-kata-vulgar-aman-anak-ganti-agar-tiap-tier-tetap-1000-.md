# Hapus kata vulgar (aman anak) + ganti agar tiap tier tetap 1000 soal

<!-- status: in-progress -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 041`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi:
> - Hapus kata-kata vulgar agar aman digunakan oleh anak-anak. agar tiap tier
>   tetap 1000 soal, maka buatkan gantinya."

**Tujuan:** memastikan kosakata KotaKata aman untuk anak-anak — tidak ada kata
atau clue yang vulgar/kasar/sensitif. Kata yang dihapus diganti dengan kata
pengganti yang berkualitas (KBBI, kurasi) sehingga **setiap tier tetap tepat
1000 soal**.

## Cakupan

1. **Daftar kata vulgar** (bahasa Indonesia + serapan umum): kata makian,
   kata alat kelamin/vulgar, kata seksual eksplisit, kata diskriminatif/sara,
   eufemisme kasar yang dikenal anak. Termasuk variasi ejaan (mis. tanpa huruf
   ganda, dll.).
2. **Pindai 2 tempat**: (a) kata JAWABAN di semua tier, (b) isi **clue** c1/c2/c3
   (kata vulgar bisa muncul di clue walau jawabannya bersih).
3. **Penggantian**: kata jawaban vulgar → ganti dengan kata pengganti dari
   kumpulan kata kurasi (konteks tier yang sama, kesulitan setara); clue yang
   memuat kata vulgar → tulis ulang clue. Pastikan tetap 3 clue berbeda,
   tidak bocor jawaban, tanpa duplikat di tier.

## Langkah

- [ ] **1. Bangun daftar kata vulgar** — daftar lengkap (kata + variasi ejaan)
  sebagai data script `scripts/vocab/vulgar-words.mjs` (array eksplisit,
  mudah ditinjau pemilik).
- [ ] **2. Audit vulgarkata** — script scan seluruh `src/data/vocabulary/`
  (jawaban + clue c1/c2/c3), laporkan semua kemunculan + konteks per tier.
  Juga flag kata yang mengandung substring vulgar walau jawaban lain (mis.
  "memekik" mengandung "meki"-style? — pakai word-boundary, hindari false
  positive; kata yang KEBETULAN memuat substring harus dievaluasi manual).
- [ ] **3. Penggantian jawaban** — tiap kata vulgar diganti kata pengganti
  (tier sama, kesulitan setara, tanpa duplikat di tier, 3 clue baru kurasi
  tidak bocor jawaban); update file tier terkait (`tierN*.ts`).
- [ ] **4. Bersihkan clue** — clue yang memuat kata vulgar ditulis ulang.
- [ ] **5. Validasi & QA** — `gen-vocab-sql.mjs` (wajib tepat 1000/tier,
  tanpa duplikat), `check-clue-quality.mjs` (0 issue/0 bocor/0 duplikat),
  re-scan vulgarkata = 0, tsc + tes + lint.
- [ ] **6. Push & rilis** — `push-vocab.mjs` ke Supabase (verifikasi jumlah
  row + 0 kata vulgar di DB), commit + push + deploy web (aturan #6).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 041 <no> "teks"`)_
