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
  lain (mis. Codebuff/Freebuff Agent) ke pesan commit. Semua commit harus
  tercatat atas nama pemilik repo (Fadhly Permata) saja.
- JANGAN menambahkan baris seperti "Generated with Codebuff" / "🤖 Generated
  with Codebuff" ke body pesan commit.

### 2b. JANGAN membuat GitHub Release dari workspace ini
- Setiap perintah `gh` di workspace ini berjalan dengan kredensial **GitHub App
  Freebuff** (`freebuff-web[bot]`) — satu-satunya identitas yang tersedia untuk
  API GitHub. Akibatnya, release yang dibuat lewat `gh release create`
  **tercatat atas nama app, bukan pemilik repo** (commit tidak terpengaruh:
  memakai `user.name`/`user.email` git = Fadhly Permata).
- JANGAN membuat GitHub Release kecuali diminta eksplisit. Kalau diminta:
  - Siapkan draf catatan rilis + tag, lalu minta pemilik membuat release dari
    akun GitHub-nya sendiri (UI GitHub atau `gh` pribadinya).
  - ATAU peringatkan terlebih dahulu bahwa release akan tercatat atas nama
    GitHub App Freebuff, dan hanya lanjut bila pemilik menyetujui.

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
<!-- ATURAN_PROYEK_END -->
