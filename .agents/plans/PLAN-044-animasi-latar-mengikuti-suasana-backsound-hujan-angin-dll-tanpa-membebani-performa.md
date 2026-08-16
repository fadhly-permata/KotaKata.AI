# Animasi latar mengikuti suasana backsound (hujan/angin/dll) tanpa membebani performa

<!-- status: pending -->
<!-- dibuat: 2026-08-16 -->

> Kelola plan ini: `bun .agents/plans/plan.mjs <cmd> 044`
> (lihat `bun .agents/plans/plan.mjs help`)

## Revisi (dari pemilik)

> "tambahkan revisi:
> - bisa gak ya kira-kira, kalo suara latar adalah hujan, maka orb diganti dengan
>   rintik hujan, kalo latar belakang angin maka diganti dengan animasi angin, dan
>   seterusnya... tapi pastikan agar gak terlalu mengganggu performa aplikasi."

**Tujuan:** mengganti/menambah animasi ambien halaman sesuai SUASANA backsound
tema aktif — hujan → rintik hujan turun, angin → garis/partikel angin melintas,
api unggun → bara/percikan naik, jangkrik malam → titik kelap-kelip, ombak →
gelombang lembut, dst. **Syarat utama: ringan** (native driver, jumlah partikel
kecil, tidak membebani perangkat kelas menengah — mengikuti mitigasi force
close PLAN-023/024/027: animasi hanya jalan saat layar fokus).

## Langkah

- [ ] **1. Petakan suasana → animasi** — tiap tema aplikasi diberi `ambientFx`
  (jenis efek: `rain | wind | embers | fireflies | waves | breeze | none`)
  berdasarkan backsound-nya (hujan→rain, angin→wind, unggun→embers, jangkrik→
  fireflies, ombak→waves, burung/hutan→breeze, kota→none/ringan, dst.) di
  registry `themeData.ts` (field baru opsional, fallback `none`).
- [ ] **2. Komponen efek ambien** — buat komponen ringan `AmbientFx` (mirip
  `AmbientOrbs`): Animated dengan **useNativeDriver**, partikel sedikit (mis.
  ≤20), loop diam-diam, warna dari palet tema, `pointerEvents="none"`, dan
  **hanya berjalan saat layar fokus** (useFocusEffect / isFocused — pola
  PLAN-023/024/027). Rain = garis tipis jatuh; wind = goresan horizontal
  melintas; embers = titik naik memudar; fireflies = titik kelap-kelip;
  waves = garis bergelombang naik-turun.
- [ ] **3. Wire ke ScreenFade** — `ScreenFade` merender `AmbientFx` sesuai
  `theme.ambientFx` (mengganti/menyertai `AmbientOrbs` sesuai jenis; Main Menu
  & Login tetap punya FloatingOrbs sendiri — efek ambien disesuaikan agar tidak
  dobel/berat).
- [ ] **4. Performa & verifikasi** — pastikan native driver, tanpa re-render
  tiap frame (Animated values ref), jumlah partikel rendah; tsc + tes + lint;
  cek visual web tiap tema (efek sesuai backsound, tidak nge-lag).

## Catatan Revisi

- _(belum ada catatan — gunakan `bun .agents/plans/plan.mjs note 044 <no> "teks"`)_
