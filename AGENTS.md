<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the relevant symbols' verbatim source plus the call paths between them — including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source.
- Useful companions: `codegraph query <symbol>` (search symbols), `codegraph callers <symbol>`, `codegraph callees <symbol>`, `codegraph impact <symbol>` (blast radius), `codegraph status` (index freshness).

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

<!-- ATURAN_PROYEK_START -->
## Aturan Proyek (wajib dipatuhi)

Aturan-aturan ini mengikat untuk semua sesi kerja di repository ini:

### 1. Jangan pernah push/build ke Expo & EAS kecuali diminta eksplisit
- JANGAN pernah menjalankan `eas build`, `eas submit`, `eas update`, `expo prebuild`
  (atau perintah apa pun yang mengunggah/mempublikasikan ke expo.dev / EAS) tanpa
  perintah eksplisit dari pemilik repo pada sesi itu.
- Push ke repo GitHub (`git push`) adalah hal yang wajar; push/build ke **Expo
  (expo.dev / EAS)** adalah hal yang TERPISAH dan hanya boleh dilakukan jika
  pemilik repo memintanya secara eksplisit.
- Jika perlu, beri tahu pemilik bahwa build EAS butuh persetujuan mereka, jangan
  langsung menjalankannya.

### 2. Atribusi commit: hanya nama pemilik repo
- JANGAN pernah menambahkan trailer `Co-Authored-By: ...` atau atribusi pihak
  lain (mis. agen AI) ke pesan commit. Semua commit harus tercatat atas nama
  pemilik repo (Fadhly Permata) saja.
- JANGAN menambahkan baris watermark/atribusi otomatis (mis. "Generated with
  ...") ke body pesan commit.

### 2b. Rilis GitHub WAJIB atas nama Fadhly Permata (dilarang pakai identitas lain)
- Setiap perintah `gh` di workspace ini berjalan dengan kredensial **GitHub App
  yang dikelola platform** (bukan akun personal Fadhly Permata) — satu-satunya
  identitas yang tersedia untuk API GitHub. Akibatnya, release yang dibuat
  lewat `gh release create` dari workspace ini tercatat atas nama app tersebut,
  BUKAN atas nama Fadhly Permata (commit tidak terpengaruh: memakai
  `user.name`/`user.email` git = Fadhly Permata).
- KARENA ITU: **JANGAN PERNAH** membuat (atau menghapus) GitHub Release dari
  workspace ini. Kalau pemilik minta rilis:
  1. Siapkan SEMUANYA di sini: bump versi `app.json` (version/buidNumber),
     catatan rilis lengkap (RELEASE_NOTES), nama tag `vX.Y.Z`.
  2. Jangan jalankan `gh release create` / `gh release delete` — berikan
     instruksi singkat dan MINTA Fadhly Permata publish dari akun GitHub-nya
     sendiri (UI GitHub atau `gh` pribadinya), supaya penulis release =
     Fadhly Permata.
- Dilarang mencantumkan identitas selain Fadhly Permata sebagai author release,
  author commit, atau kredit di file repo (kecuali nama command tooling
  platform yang memang harus dipakai, mis. `freebuff-preview`).

### 3. STOP preview dulu sebelum menyentuh file (aturan dari pemilik repo)
- Selama mode preview SEDANG JALAN, file-file (mis. `.env` / `.env.local`) bisa
  terkunci sehingga akses terminal ke file itu diblokir/ditutup. Ini BUKAN karena
  izin hilang — itu efek preview yang sedang berjalan.
- SEBELUM melakukan perubahan apa pun yang menyentuh file (termasuk operasi yang
  membaca/menulis `.env*`, script DB yang baca `.env.local`, dll):
  `freebuff-preview stop` dulu, kerjakan, lalu `freebuff-preview start` lagi
  kalau preview memang sedang dibutuhkan.
- Jangan pernah pakai `kill`/`pkill` untuk mematikan preview — selalu lewat
  `freebuff-preview stop` (tool resmi platform).

### 4. Langsung commit & push setelah setiap perubahan (aturan dari pemilik repo)
- SETELAH satu revisi/pekerjaan selesai (kode, fix bug, dokumen, meta-aturan)
  dan verifikasinya lolos (tsc / test / lint bila relevan): LANGSUNG
  `git add` file yang relevan → `git commit` → `git push origin main`,
  tanpa menunggu diminta lagi.
- Pesan commit mengikuti gaya repo & aturan #2 (atas nama pemilik saja, tanpa
  atribusi pihak lain). Jangan biarkan perubahan menumpuk tidak ter-commit.
- Bila beberapa pekerjaan selesai dalam satu sesi, gabungkan per batch yang
  jelas (mis. satu commit per plan/revisi).

### 5. Konfirmasi dulu sebelum mulai mengerjakan revisi (aturan dari pemilik repo)
- SAAT menerima pesan berisi daftar revisi/permintaan baru: JANGAN langsung
  mengerjakan semuanya. Di awal, lakukan:
  1. Susun daftar revisi yang BELUM dikerjakan (ringkas & jelas).
  2. Konfirmasi ke pemilik: mau dikerjakan SEMUANYA sekaligus, SATU PER SATU
     (selesai satu → lapor → lanjut), atau MAU YANG DULU (pemilik pilih urutan).
- Pengecualian yang boleh langsung dikerjakan tanpa konfirmasi: permintaan
  meta/aturan repo itu sendiri (mis. menambah/mengubah aturan di AGENTS.md),
  dan fix bug kecil yang jelas & mendesak (tetap laporkan setelah selesai).
<!-- ATURAN_PROYEK_END -->
