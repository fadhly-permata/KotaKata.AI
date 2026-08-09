# 🎨 Design Plan — KotaKata.AI Redesign

## Tema Visual: "Arsip Sastra Digital"
Perpaduan klasik literasi dengan sentuhan modern — perpustakaan tua yang elegan versi digital.

## Palette Warna

| Role        | Light Mode    | Dark Mode     |
|-------------|---------------|---------------|
| Background  | `#F8F6F0` krem | `#0F0E17` navy |
| Surface     | `#FFFFFF`      | `#1A1926`     |
| Primary     | `#6C5CE7` indigo | `#A29BFE` soft purple |
| Accent      | `#00B894` emerald | `#55EFC4` mint |
| Gold        | `#FDCB6E`      | `#F9CA24`     |
| Text        | `#2D3436`      | `#F5F5F5`     |
| Text muted  | `#8E99A4`      | `#8E99A4`     |

## Per-Halaman Plan

### 1. AuthScreen — "Sambutan Puitis"
- [ ] Background gradient subtle primary → accent
- [ ] Logo buku dengan glow effect
- [ ] Tombol border-radius 16px + shadow
- [ ] Input field dengan icon prefix
- [ ] Animasi entrance (fade + scale)

### 2. MainMenu — "Rak Buku Utama"
- [ ] Card-based layout dengan elevation halus
- [ ] Tombol "Main" hero CTA gradient (indigo → purple)
- [ ] Tier badge redesain sebagai progress bar XP
- [ ] Menu buttons icon besar + label dalam card
- [ ] Dekoratif border tipis di header

### 3. GameScreen — "Papan Permainan"
- [ ] Grid cell rounded corners 4px + border halus
- [ ] Sel aktif: indigo solid
- [ ] Sel highlight: soft purple bg
- [ ] Sel solved: emerald green subtle
- [ ] Toolbar ringkas, icon bundar 32px
- [ ] Progress bar XP tipis di atas grid

### 4. CompletionOverlay — "Perayaan"
- [ ] Bounce animation pada trophy/star
- [ ] Statistik dalam 3 card terpisah
- [ ] Tombol "Main Lagi" dengan pulse animation

### 5. ProfileScreen — "Kartu Pemain"
- [ ] Avatar besar gradient circle + border
- [ ] Statistik dalam card glassmorphism
- [ ] Achievement badges
- [ ] Timeline aktivitas

### 6. SettingsScreen — "Pengaturan Minimalis"
- [ ] Grouped list style (iOS Settings)
- [ ] Toggle switch custom track color
- [ ] Ikon setting di kiri setiap baris
- [ ] Footer copyright/tentang

## Global Improvements
- [ ] Font weight hierarchy: judul 800, subjudul 700, body 500/400
- [ ] Consistent spacing: padding 16px, gap 12px, border-radius 12px/16px
- [ ] Semua tombol: boxShadow + elevation
- [ ] Semua button: activeOpacity 0.7
- [ ] Ikon konsisten (emoji-based relevan)
