# Perbaiki kualitas clue tier 5-6 (ambigu, bocor, placeholder)

<!-- status: pending -->
<!-- dibuat: 2026-08-09 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 003`
> (lihat `bun .agents/plans/plan.mjs help`)

## Hasil audit awal (scripts/check-clue-quality.mjs)

**Tier 6** — bermasalah serius (837 issue / 1000 baris):
- **"Contoh:" yang memuat kata jawabannya sendiri** (leak langsung) — mis. `seseorang` → "Contoh: tadi ada seseorang menelepon Anda"; `kehidupan`, `terlambat`, `bergabung`, `mempunyai`, `menderita`, `perbedaan`, `terhormat` dan puluhan lainnya. Tidak konsisten: kadang memakai kata utuh, kadang "--".
- **Sisa penanda KBBI bocor ke clue** — mis. `meninggal`: c1 = "[hor] mati; berpulang" (register/etiket KBBI tidak dibersihkan).
- **Label kelas kata nyasar ke tengah definisi** — mis. `ketakutan`: c1 = "…keadaan takut **kata benda keseganan**…", c2 = "kata benda keseganan"; `kelaparan`: "perihal lapar **kata kerja menderita lapar…**"; `kesakitan`: c2 = "kata benda perasaan sakit".
- **Sinonim asal / salah** — mis. `kerusakan`: c3 = "Sinonim: kebejatan" (tidak tepat); `kesakitan`: c3 = "terasa sakit" persis c1 (duplikat).
- **c1 sudah memuat kata sinonim c3** (leak lembut) — mis. `mencintai`: c1 = "…; menyukai" lalu c3 = "Sinonim: menyukai".
- **Placeholder "Merupakan kata X" 17%** (170 baris) — clue lemah/membingungkan.

**Tier 5** — mayoritas rapi, 3 kasus leak lembut (c1/c2 sudah memuat kata sinonim c3, mis. `terlibat` c1 berisi "tersangkut" = c3, `keliling` c1 berisi turunan c3).

## Langkah

- [ ] **1. Bangun generator perbaikan tier 5-6 (regenerasi dari KBBI)** — perbaiki `fix-tier6-10.mjs` / script baru agar: contoh kalimat yang memuat jawaban diganti (kata jawaban → "—" atau contoh di-buang/diganti fragmen deskriptif); strip penanda KBBI (`[hor]`, `[ki]`, dll.); bersihkan label kelas kata yang nyasar ke definisi; c3 jangan mengulang kata yang sudah ada di c1/c2.
- [ ] **2. Ganti sinonim asal & duplikat** — sinonim (c3) hanya dipakai kalau benar-benar kata lain yang setara (dari entri KBBI terpisah); kalau tidak, gunakan clue deskriptif. Hilangkan c1≈c3 / c2≈c3.
- [ ] **3. Kurangi placeholder "Merupakan kata X"** — ganti dengan fragmen definisi/deskriptif asli semaksimal mungkin; placeholder hanya tersisa untuk kata berdefinisi tunggal yang benar-benar tanpa materi lain (target turun jauh dari 17%).
- [ ] **4. Perbaiki leak lembut tier 5** — c1/c2 yang sudah memuat kata sinonim c3 diganti c3-nya (deskriptif) supaya clue tidak saling membocorkan.
- [ ] **5. Verifikasi kualitas menyeluruh** — `node scripts/check-clue-quality.mjs` pada tier5.ts & tier6.ts: 0 bocor jawaban, 0 duplikat, 0 penanda KBBI, 0 label kelas nyasar, placeholder minimum; idempotent; tsc bersih; jumlah kata per tier tetap 1000.
- [ ] **6. Push ulang ke Supabase** — regenerate `supabase/vocabulary.sql` + upsert (riwayat word_discoveries pemain aman), verifikasi sample di DB, commit & push.

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 003 <no> "teks"`)_
