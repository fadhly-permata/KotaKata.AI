---
name: bug-audit
description: Audit kemungkinan bug logic/tampilan/UX yang mengganggu kenyamanan — jalankan npm run audit:bugs, verifikasi tiap temuan secara manual (baca konteks kode), catat SEMUA hasil ke dokumen PLAN berstatus pending TANPA memperbaiki apa pun, lalu konfirmasi ke user apakah mau dikerjakan. Gunakan skill ini setiap kali user meminta "cek bug", "audit bug", "cari kemungkinan bug", "cek kenyamanan/UX", atau "kumpulkan daftar bug".
---

# KotaKata.AI — Audit Bug Logic / Tampilan / UX

Skill untuk **agent** melakukan pengecekan berkala atas kemungkinan bug yang
mengganggu kenyamanan pemain. Prinsip utama: **CATAT DULU, JANGAN LANGSUNG
FIXING** (selaras Aturan Proyek #5) — pekerjaan fixing hanya dimulai setelah
pemilik menyetujuinya secara eksplisit.

User bisa meminta dengan bahasa sehari-hari, contoh:
- "cek bug dong"
- "audit kemungkinan bug"
- "carilah bug yang bisa mengganggu kenyamanan"
- "scan tampilan/logic ada yang aneh gak"

## Alat

- **Scanner otomatis:** `npm run audit:bugs` (`scripts/audit-bugs.mjs`) — deteksi
  pola yang diketahui: `Alert.alert` (no-op di web), `window.addEventListener`
  tanpa cek fungsi, API web tanpa guard platform (aturan #5b), timer leak,
  `catch {}` tanpa komentar alasan, `console.log` tersisa, TODO/FIXME.
- Flag `--quiet` untuk ringkasan saja.
- Scanner HANYA alat bantu — hasilnya adalah KANDIDAT, bukan vonis.

## Alur kerja wajib (urut, jangan dilewati)

### 1. Jalankan scanner otomatis

```bash
npm run audit:bugs
```

### 2. Verifikasi manual SETIAP temuan KRITIS & SEDANG

Untuk setiap temuan, buka file pada baris tersebut dan periksa konteksnya:
- Guard platform mungkin sudah ada beberapa baris di atas (heuristik scanner
  hanya melihat ±6 baris) → jika sudah aman, tandai sebagai *false positive*.
- `Alert.alert` SELALU benar-benar bermasalah di web (react-native-web no-op).
- Untuk pola async/state, cek adanya guard `cancelled`/`disposed` di effect.

Selain hasil scanner, lakukan pemeriksaan cepat manual pada area yang baru
diubah sejak commit terakhir (`git log --oneline -10`) — regresi biasanya
berasal dari perubahan terbaru.

### 3. CATAT — jangan memperbaiki

Buat/masukkan ke dokumen plan di `.agents/plans/PLAN-NNN.md` (satu plan per
sesi audit; lanjutkan nomor terakhir):

```markdown
# PLAN-NNN — Hasil Audit Bug (tgl)

**Status:** PENDING

## 🔴 Kritis / 🟡 Sedang / 🟢 Minor
- Lokasi (file:baris) · aturan · gejala · dampak · saran fix
```

Semua temuan — termasuk false positive penting — dicatat apa adanya agar bisa
ditelusuri di kemudian hari. Commit & push dokumen plannya saja.

### 4. Laporkan & konfirmasi ke pemilik

Sampaikan ringkasan bergrup severity + dampak nyata ke pengalaman pemain,
lalu **tanyakan**: mau diperbaiki semuanya, sebagian (sebutkan nomornya),
atau belum? JANGAN mulai fixing sebelum ada jawaban eksplisit.

### 5. Bila pemilik menyetujui fixing

Kerjakan sesuai urutan yang diminta. Setiap fix wajib:
1. Pertimbangkan dampak lintas platform (aturan #5b — web DAN native APK).
2. Verifikasi: `bun run typecheck && bun test`, lint file tersentuh.
3. Update doc plan → commit & push → deploy web dev (`node scripts/expo-deploy-web.mjs --prod`).
