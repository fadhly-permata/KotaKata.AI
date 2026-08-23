---
name: vocabulary-clue-review
description: Review & perbaiki kualitas clue di file vocabulary tier (src/data/vocabulary/tier*.ts) — baca seluruh file, perbaiki clue yang bocor/duplikat/salah definisi/tanda baca sesuai checklist KBBI tanpa mengubah kata jawaban, lalu verifikasi dengan tsc --noEmit. Gunakan skill ini setiap kali user meminta "review clue", "perbaiki clue", "audit vocabulary", atau menyebut review soal tier tertentu.
---

# KotaKata.AI — Review & Perbaikan Clue Vocabulary

Command reusable untuk memeriksa dan memperbaiki kualitas clue di file vocabulary tier
(`src/data/vocabulary/tier*.ts`). Format tiap baris:

```ts
["kata", "clue_1 (penjelasan utama)", "clue_2 (penjelasan lain)", "clue_3 (sinonim/antonim)"],
```

## Cara pakai
1. Panggil skill ini dengan menyebutkan file target, mis. `tier1.ts`.
2. Baca SELURUH file dulu (bukan hanya sampel) sebelum mengubah apa pun.
3. Perbaiki setiap baris yang bermasalah sesuai aturan di bawah.
4. Jangan ubah `kata` (kolom pertama) — hanya perbaiki clue 1/2/3.
5. Jangan ubah jumlah baris / urutan / struktur file.
6. Setelah selesai: jalankan `tsc --noEmit` dan pastikan lolos.

## Aturan wajib (checklist per baris)

### 1. Bahasa & tanda baca
- ✅ Ejaan baku KBBI (pada → bukan "pd"; dalam → bukan "dl"; terhadap → bukan "thd"; daripada → bukan "dp"; dsb.)
- ✅ Kalimat utuh, tidak terpotong, tidak ada sisa markup editor (mis. `--`, `: 2`, `(kiasan)` yang menggantung, spasi ganda)
- ✅ Tanda baca tepat: koma, titik, titik koma digunakan benar; jangan akhiri clue dengan `;`
- ✅ Huruf kapital hanya di awal kalimat / nama diri
- ❌ Jangan pakai "Merupakan kata benda", "Kata berawalan X (N huruf)", "N huruf, huruf terakhir X", atau sejenisnya — ini clue sampah yang bocor dari builder lama

### 2. Tidak redundan
- ❌ clue_1 dan clue_2 TIDAK BOLEH isinya sama atau hampir sama (hampir semua kata di file ini kena)
- Setiap clue harus memberi informasi BERBEDA:
  - clue_1 = penjelasan/definisi utama
  - clue_2 = sudut pandang lain, contoh penggunaan, atau fakta menarik yang relevan
  - clue_3 = sinonim (atau antonim yang jelas ditandai "lawan kata:")

### 3. Tidak menyebutkan jawaban / soal
- ❌ clue TIDAK BOLEH mengandung kata jawabannya sendiri (termasuk bentuk turunan / ejaan huruf per huruf)
- ❌ clue TIDAK BOLEH hanya mengulang kata dengan pola huruf ("3 huruf, huruf terakhir X")
- ❌ clue_3 yang berupa sinonim boleh menyebut sinonim LAIN, tetapi kalau satu-satunya sinonim itu sama dengan kata jawaban, ganti dengan antonim atau penjelasan lain

### 4. Akurat & tidak ngaco
- ✅ Semua clue harus DEFINISI / fakta yang benar — tidak boleh ngelantur, ngehayal, halusinasi, atau salah arti
- ✅ Definisi mengacu ke makna kata yang paling umum & dikenal
- ⚠️ Banyak baris di file ini adalah definisi KBBI asli yang SALAH DISALIN dari entri lain (mis. kata "marah" di-clue-kan ke arti "gelar bangsawan", kata "asin" di-clue-kan ke "tempat mengasini"). Cek definisi benar-benar milik kata itu; kalau salah, tulis ulang definisi yang benar dan sederhana.
- ✅ Gaya: bahasa Indonesia yang jelas, ringkas, dan mudah dipahami pemain; hindari kalimat yang terlalu panjang/bertele-tele

## Standar hasil akhir
- Tidak ada clue sampah / bocor format builder
- Tidak ada clue duplikat dalam satu baris
- Tidak ada clue yang membocorkan jawaban
- Tidak ada typo / salah ucap / tanda baca aneh
- Semua clue masuk akal dan sesuai makna kata

## Contoh
Baris rusak:
```ts
["asin", "tempat mengasini (mengasinkan)", "tempat mengasini (mengasinkan)", "Antonim: tawar"],
```
Baris benar:
```ts
["asin", "rasa seperti garam; mengandung garam", "berasa seperti air laut", "lawan kata: tawar"],
```
