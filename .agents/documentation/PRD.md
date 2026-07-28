# Product Requirement Document (PRD)
## Cross-Platform Dynamic Crossword Game (Offline-First)
### KotaKata.AI

---

## 1. Project Overview

### 1.1 Objective
Membangun aplikasi game Teka-Teki Silang (TTS) modern yang responsif dan dapat dimainkan di berbagai platform (**Android, iOS, Windows, Linux, dan Web**) menggunakan satu basis kode React Native. Game ini menerapkan sistem progresi kompetitif berbasis peringkat (*tiering system*) layaknya game modern, namun dikemas dengan pendekatan estetika bahasa yang puitis.

### 1.2 Core Value Proposition
- **Offline-First Experience:** Pengguna dapat memainkan game tanpa koneksi internet menggunakan penyimpanan lokal sepenuhnya.
- **Cloud Sync & Backup:** Sinkronisasi progres otomatis ke cloud secara efisien saat terhubung ke internet menggunakan Supabase untuk mengamankan data pengguna.
- **Multiplatform Fluidity:** UI adaptif yang dirancang khusus agar nyaman digunakan baik menggunakan layar sentuh (mobile) maupun kombinasi keyboard dan mouse (desktop/web via React Native for Web/Desktop).
- **Procedural & Dynamic Play:** Tidak ada papan yang sama. Setiap papan TTS dibuat secara instan di sisi klien (*client-side*) berdasarkan bank kosakata yang disaring dinamis sesuai peringkat pemain.

### 1.3 Tech Stack & Infrastructure
- **Framework:** React Native (TypeScript) dengan Expo atau Bare Workflow
- **Backend & Auth:** Supabase Auth (Google, Email, & Anonymous Sign-in via `@supabase/supabase-js`)
- **Primary Database (Cloud):** Supabase PostgreSQL (Dilengkapi fitur Row Level Security / RLS dan dukungan JSONB untuk fleksibilitas skema)
- **Local Storage:** WatermelonDB / RxDB (Penyimpanan lokal NoSQL reaktif berbasis SQLite/LokiJS, sangat cepat & mendukung skema kompleks secara *offline-first*)
- **State Management:** Zustand atau Redux Toolkit (RTK Query / Zustand store untuk logika reaktif)
- **Animation & Rendering:** React Native Reanimated v3, React Native Gesture Handler, & React Native Skia (untuk rendering grid TTS performa tinggi tanpa hambatan *JS Bridge*)

---

## 2. Target Audience & Platforms
- **Platforms:** Android (min. API 21), iOS (min. iOS 13), Windows, Linux (via React Native for Desktop / Web PWA).
- **Target User:** Pengguna kasual segala usia yang menyukai permainan asah otak, pencinta bahasa, sastra, dan kosakata unik.

---

## 3. Sistem Kepangkatan (Tiering System) Puitis

Sistem progresi pemain dibagi menjadi 10 tingkatan yang merepresentasikan perjalanan spiritual dan intelektual seorang manusia dalam mengenali, meresapi, hingga mengabadikan bahasa. Kenaikan tier mengacu sepenuhnya pada akumulasi **XP (Experience Points)** pemain.

### 3.1 Skema Fluktuasi XP
- **XP Bertambah (+):** Jika pemain berhasil menebak kata dengan benar pada kotak teka-teki silang.
- **XP Berkurang (-):** Jika pemain menggunakan fitur bantuan penunjang di dalam permainan:
    - Membuka Petunjuk 2 (*Clue 2*)
    - Membuka Petunjuk 3 (*Clue 3*)
    - Membuka Huruf Acak (*Reveal Letter*)

### 3.2 Daftar Nama Tier & Filosofi Bahasa

| Tier | Nama Puitis | Filosofi & Deskripsi Tingkatan |
| :--- | :--- | :--- |
| **1** | **Eja Awal** | Langkah paling mula; saat jemari baru belajar meraba bentuk huruf dan mengeja bunyi yang sederhana. |
| **2** | **Desau Saujana** | Kata-kata mulai terdengar seperti angin sepoi-sepoi di kejauhan, membawa makna yang mulai samar-samar dikenali. |
| **3** | **Rima Gerimis** | Ketukan huruf yang mulai beraturan, berjatuhan menciptakan irama indah layaknya rintik hujan di atas atap pikiran. |
| **4** | **Untai Aksara** | Kemampuan merangkai huruf demi huruf yang tadinya terberai menjadi jalinan kata yang memiliki nyawa. |
| **5** | **Gema Diksi** | Pilihan kata yang tidak lagi biasa; mulai memahami resonansi dari kata-kata indah yang jarang terucap. |
| **6** | **Raut Metafora** | Bahasa dipahami melampaui bentuk fisiknya; mampu melihat bayangan kiasan dan analogi yang tersembunyi di balik teks. |
| **7** | **Bait Hening** | Masuk ke ruang kontemplasi mendalam, di mana kesunyian pun mampu melahirkan kalimat-kalimat yang sarat akan makna. |
| **8** | **Madah Sanubari** | Pujian dan ungkapan bahasa yang mengalir langsung dari kedalaman rasa, menyentuh inti dari setiap teka-teki kehidupan. |
| **9** | **Risalah Langit** | Lembaran-lembaran pemikiran tingkat tinggi; mencerminkan kecerdasan luar biasa dalam merumuskan dan membaca sandi bahasa. |
| **10** | **Keabadian Seloka** | Puncak tertinggi kebahasaan; ia tidak lagi sekadar membaca kata, melainkan telah menjadi bagian dari keabadian karya sastra yang luhur. |

---

## 4. Functional Requirements (Fitur Utama)

### 4.1 User Authentication & Profile
- **Anonymous Login:** Pengguna dapat langsung bermain tanpa mendaftar menggunakan Supabase Anonymous Auth. Data disimpan di Local Storage dan di-link ke ID anonim Supabase.
- **Social Sign-In (Google/Email):** Mengubah akun anonim menjadi akun permanen (*identity linking*) tanpa kehilangan data progres lokal.
- **Cloud Synchronization:** Progres permainan (papan yang diselesaikan, skor, koin, peringkat XP) disinkronkan otomatis ke Supabase Postgres ketika mendeteksi koneksi internet (*reactive sync*).

### 4.2 Game Engine & Procedural Board Mechanics
- **Responsive Grid System:** Kotak TTS menyesuaikan ukuran layar secara dinamis menggunakan kalkulasi `useWindowDimensions` / `Flexbox` atau Canvas Skia untuk performa rendering *grid* yang optimal.
- **Navigation & Input:**
    - *Mobile:* Ketukan pada kotak mengaktifkan mode input dan mendeteksi orientasi (Mendatar/Menurun). Menyediakan *custom in-game keyboard* atau integrasi keyboard sistem.
    - *Desktop/Web:* Mendukung navigasi tombol panah keyboard (←, ↑, →, ↓) via event listener keyboard fisik (`KeyEventListener`).
- **Client-Side Procedural Generation:**
    - Sistem mendeteksi Tier XP pemain saat ini.
    - Sistem menyaring daftar kata dari koleksi kosakata lokal yang memiliki kecocokan tingkat kesulitan dengan `tier_level` pemain.
    - Sistem melakukan operasi *exclusion* (pengurangan) dengan daftar kata yang ada di tabel **Temuan Kata**. Kata yang sudah pernah terjawab **tidak akan diikutsertakan** dalam pembuatan papan baru.
    - Menggunakan algoritma *backtracking* / *greedy fitting* untuk menyusun kata terpilih secara acak menjadi papan TTS yang terintegrasi (misal dimensi 10×10 atau 12×12). Jika bank kata tier aktif tidak cukup membentuk persilangan valid, sistem akan mengambil kata dari `tier_level` satu tingkat di bawahnya sebagai *fallback*.

### 4.3 Fitur Bantuan (Hint System) & Regulasi XP
Saat papan TTS dimainkan, secara default hanya `clue_1` yang ditampilkan kepada pemain untuk kata yang sedang dipilih.
- **Buka Clue 2:** Menampilkan petunjuk tambahan dengan konsekuensi pengurangan XP sebesar X poin.
- **Buka Clue 3:** Menampilkan petunjuk spesifik/definisi dengan konsekuensi pengurangan XP sebesar Y poin.
- **Reveal Letter:** Membuka 1 kotak huruf acak pada kata terpilih dengan konsekuensi pengurangan XP sebesar Z poin. Kotak yang terbuka via bantuan otomatis terkunci (*locked state*) agar tidak bisa diubah manual oleh pemain.

> **Catatan Teknis Penurunan Tier:** Pengurangan XP akibat penggunaan bantuan tidak boleh membuat tier pemain turun seketika di tengah permainan demi menjaga kestabilan *generation pool* kata pada papan yang sedang berjalan. Penyesuaian penurunan tier hanya dikalkulasi saat papan selesai (*board completion*) atau saat pemain kembali ke Main Menu.

### 4.4 Riwayat Permainan & Manajemen Status (Save/Resume/Review)
- Setiap papan dinamis yang terbentuk sukses wajib disimpan ke dalam database lokal agar pemain dapat melakukan *review*, *replay*, atau melanjutkan game yang tertunda (*save state / resume mode*).

### 4.5 Halaman "Sejarah Saya" & Tabel Temuan Kata
- **Tabel Pelacak:** Setiap kata yang berhasil dipecahkan dengan benar oleh pengguna akan langsung dicatat ke dalam tabel **Temuan Kata** (*Word Discoveries*). Kata yang terdaftar di sini diblokir dari proses pembuatan papan game baru.
- **Fitur Halaman Sejarah:**
    - Menampilkan *list-view* (menggunakan `FlashList` dari Shopify untuk optimasi memori) berisi kata-kata yang sudah berhasil dipecahkan secara kronologis.
    - Menyediakan fungsi pencarian (*search bar*) berbasis teks kata ataupun isi petunjuk.
    - Saat salah satu item kata diklik, aplikasi akan memunculkan komponen *bottom sheet* (via `@gorhom/bottom-sheet`) yang menjabarkan kata tersebut secara lengkap beserta ketiga tingkatan *clue* (Petunjuk 1, 2, dan 3) sebagai media edukasi/kamus pribadi pemain.

### 4.6 Fitur Tema: Terang & Gelap (Theme Management)
Aplikasi menyediakan opsi pengaturan tema global (*Light Mode* dan *Dark Mode*) untuk fleksibilitas kenyamanan visual pengguna.
- **Mekanisme Kontrol:** State management / React Context memantau preferensi tema di Local Storage. Jika data kosong, aplikasi mengadopsi pengaturan tema bawaan sistem operasi (`useColorScheme`).
- **Aksen Kontras Grid TTS:**
    - *Tema Terang:* Kotak aktif berwarna putih bersih (`#FFFFFF`), garis tepi abu-abu muda (`#E0E0E0`), teks huruf berwarna navy pekat, kotak mati berwarna hitam/abu gelap.
    - *Tema Gelap:* Kotak aktif berwarna abu-abu gelap (`#1E1E1E`), garis tepi abu-abu metalik (`#333333`), teks huruf berwarna putih gading (`#F5F5F5`), kotak mati berwarna hitam pekat (`#121212`).
- **Efek Transisi:** Perpindahan tema menggunakan animasi memudar halus berdurasi **300ms** untuk menjaga kenyamanan mata pengguna dari perubahan cahaya mendadak.

---

## 5. UI/UX & Motion Guidelines

### 5.1 Elegan Lintas Halaman (Page Transitions)
Perpindahan antar halaman utama harus terasa premium, puitis, dan konsisten tanpa memicu *stuttering* atau penurunan *frame rate* (Wajib berjalan di **UI Thread** stabil 60fps / 120fps via React Native Reanimated).
- **Mekanisme Animasi:** Menggunakan `@react-navigation/native-stack` dengan animasi `slide_from_right` atau custom interpolation Reanimated untuk transisi linier (misal: Main Menu ke Sejarah Saya) dan `fade` untuk perubahan konteks (misal: setelah menyelesaikan papan permainan).
- **Implementasi React Native:** Durasi transisi dibatasi secara ketat antara **250ms hingga 350ms** menggunakan kurva `Easing.bezier(0.4, 0.0, 0.2, 1)`.

### 5.2 Sistem Dialog Konfirmasi & Modals (Dialog & Pop-up System)
Setiap keputusan krusial pemain yang berisiko mengubah *save-state* atau memotong *resources* (koin/XP) harus melalui konfirmasi pop-up dialog yang terpadu secara visual.
- **Konteks Penggunaan Pop-up:**
    - Konfirmasi pembelian/penggunaan *Hint* (*Reveal Letter* / *Clue* tambahan).
    - Konfirmasi keluar dari papan permainan yang sedang aktif (*Quit Match Alert*).
    - Notifikasi naik peringkat (*Tier Up Celebration Overlay*).
- **Aturan Desain Dialog:**
    - Menggunakan animasi muncul bertipe *Scale Fade* (skala membesar halus dari 95% ke 100% dibarengi efek opasitas) berdurasi **200ms** via Reanimated.
    - Bagian latar belakang diwajibkan menggunakan efek buram (`@react-native-community/blur` atau `BlurView` dari Expo senilai intensity 20-30) untuk mengisolasi fokus mata pengguna ke arah dialog.
    - Tombol aksi utama (*Call to Action*) diletakkan di sisi kanan dengan warna aksen yang jelas, sedangkan tombol pembatalan diletakkan di sisi kiri dengan gaya visual minimalis (*low contrast*).

---

## 6. Non-Functional Requirements & Architecture

### 6.1 Architecture Principles (Clean Architecture & Feature-First)
Pemisahan struktur kode yang ketat untuk menjamin skalabilitas dan kemudahan pengujian (*maintainability & testability*):
1. **Data Layer:** Berisi *data sources* (Supabase Client API & WatermelonDB Local DB), *repositories implementation*, dan *data models* (serialization/deserialization JSON).
2. **Domain Layer:** Pusat logika bisnis murni, berisi *use cases*, entitas TypeScript, dan kontrak interface repositori. Lapisan ini murni steril dari dependensi React Native/UI/Supabase.
3. **Presentation Layer:** Mengontrol UI component (Functional Components) menggunakan arsitektur reaktif berbasis Zustand / Redux Toolkit. UI bersifat adaptif (*responsive layout*) menyesuaikan variasi tipe input dan dimensi layar target.

### 6.2 Data Flow & Sync Strategy
Demi menekan pengeluaran operasional dan pemakaian kuota API Supabase, arsitektur sinkronisasi mengikuti aturan berikut:

```text
[UI / Game Screen Component] 
       │
       ▼ (Write State Instan per Detik dengan Debounce / Throttle)
[Local Storage (WatermelonDB/RxDB)] ──(Scheduled Upsert/Batch Sync jika Online)──> [Supabase Postgres DB]
```

- Aplikasi berinteraksi secara primer dengan **Local Storage** (baca dan tulis secara reaktif).
- Sinkronisasi data lokal ke **Supabase** dilakukan di latar belakang (*asynchronous*) menggunakan metode *batching / upsert* (misal: mengirimkan data akumulatif hanya ketika satu papan TTS selesai diselesaikan secara utuh, atau dijadwalkan berkala setiap 5 menit jika terdeteksi adanya perubahan data signifikan).

---

## 7. Database Schema Design (Supabase PostgreSQL & Local DB)

Seluruh tabel di Supabase dikonfigurasi dengan **Row Level Security (RLS)** agar pengguna hanya dapat membaca dan mengubah data miliknya sendiri.

### 7.1 Table: `users`
Menyimpan profil dasar, akumulasi XP, dan penentuan tingkatan tier (Berelasi dengan `auth.users` Supabase).

```sql
CREATE TABLE public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  total_xp INTEGER DEFAULT 0,
  current_tier SMALLINT DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 10),
  coins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update own profile" ON public.users
  FOR ALL USING (auth.uid() = user_id);
```

### 7.2 Table: `vocabulary_collection`
Tabel referensi master data kosakata bahasa. Diunduh secara parsial/penuh saat instalasi pertama atau sinkronisasi pembaruan konten baru.

```sql
CREATE TABLE public.vocabulary_collection (
  word_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  clue_1 TEXT NOT NULL,
  clue_2 TEXT,
  clue_3 TEXT,
  tier_level SMALLINT NOT NULL CHECK (tier_level BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Read-only untuk semua pengguna terotentikasi
ALTER TABLE public.vocabulary_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vocabulary" ON public.vocabulary_collection
  FOR SELECT TO authenticated USING (true);
```

### 7.3 Table: `word_discoveries` (Tabel Temuan Kata)
Mencatat riwayat kata yang sudah terjawab benar oleh masing-masing user.

```sql
CREATE TABLE public.word_discoveries (
  discovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.vocabulary_collection(word_id),
  word VARCHAR(100) NOT NULL,
  clue_1 TEXT NOT NULL,
  clue_2 TEXT,
  clue_3 TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
);

-- RLS
ALTER TABLE public.word_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own discoveries" ON public.word_discoveries
  FOR ALL USING (auth.uid() = user_id);
```

### 7.4 Table: `saved_boards`
Menyimpan status layout papan permainan yang di-generate dinamis agar bisa dibuka kembali sewaktu-waktu. Memanfaatkan tipe data **JSONB** Postgres untuk struktur layout grid yang kompleks.

```sql
CREATE TABLE public.saved_boards (
  board_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  tier_at_generation SMALLINT NOT NULL,
  grid_size SMALLINT NOT NULL,
  layout_data JSONB NOT NULL,
  is_finished BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.saved_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved boards" ON public.saved_boards
  FOR ALL USING (auth.uid() = user_id);
```

---

## 8. Technical Guidelines & Coding Standards

### 8.1 Code Style & Conventions
- **TypeScript Mandatory:** Wajib menggunakan TypeScript dengan *strict mode* diaktifkan (`"strict": true`). Hindari penggunaan tipe `any`.
- **File Structure:** Terapkan standar *Feature-First Folder Structure* (misal: `src/features/game/`, `src/features/history/`). Satu file hanya berisi satu komponen/hook utama.
- **Naming Standard:**
    - React Components & Type/Interface: `PascalCase`
    - Functions, Custom Hooks, Variables: `camelCase` (Khusus Custom Hook wajib diawali dengan `use...`)
    - Constants: `UPPER_SNAKE_CASE`
- **Formatting:** Menggunakan ESLint + Prettier. Indentasi **2 spasi**, max line length **100-120 karakter**.
- **Documentation:** Tuliskan TSDoc (`/** ... */`) untuk setiap fungsi utility, custom hook, dan interface utama.

### 8.2 Performance Optimization
- **JS Thread offloading:** Semua animasi visual dan gesture penanganan sentuhan wajib diproses di Native Thread menggunakan `react-native-reanimated` dan `react-native-gesture-handler`.
- **List Optimization:** Gunakan `@shopify/flash-list` alih-alih `FlatList` biasa untuk daftar kosakata pada halaman "Sejarah Saya" untuk menjamin konsumsi memori yang konsisten dan *recycling view* yang super mulus.
- **Component Memoization:** Gunakan `React.memo`, `useCallback`, dan `useMemo` pada sel-sel grid TTS yang padat guna mencegah *unnecessary re-renders* saat pengguna mengetik huruf.

### 8.3 Error Handling & Logging
- **Error Boundaries:** Terapkan `React Error Boundary` di level akar (*root*) dan modul game utama untuk mencegah aplikasi *crash* total jika terjadi runtime JS error.
- **Specific Exception Handling:** Tangani error Async/Network secara spesifik (misal penanganan kegagalan Supabase Auth terpisah dari error kegagalan koneksi lokal).
- **Centralized Logging:** Gunakan pustaka logging terstruktur (seperti `react-native-logs`) yang memisahkan log berdasarkan level (*debug, info, warn, error*) untuk mempermudah pelacakan error saat mode rilis (*production*).
