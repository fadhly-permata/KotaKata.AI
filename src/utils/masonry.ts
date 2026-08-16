/**
 * Utilitas tata letak "masonry" untuk halaman riwayat (PLAN-032): ukuran card
 * (tinggi & lebar) dibuat bervariasi supaya tidak terkesan list kaku, tapi
 * DETERMINISTIK dari id item — jadi ukuran tidak berubah-ubah saat re-render
 * / scroll dan hasilnya tetap rapi (brick 2 kolom + sesekali card lebar).
 */

/** Hash string (FNV-1a 32-bit) — stabil antar platform & sesi. */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tinggi card normal (2 kolom): 132–204 px — acak tapi cukup untuk isi. */
export function masonryCardHeight(id: string): number {
  return 132 + (hashText(id) % 73);
}

/** Tinggi card lebar (1 baris penuh): 156–216 px. */
export function masonryWideHeight(id: string): number {
  return 156 + (hashText(id) % 61);
}

/** ~18% item menjadi card lebar penuh — variasi WIDTH (1 atau 2 kolom). */
export function isWideMasonryCard(id: string): boolean {
  return hashText(id) % 100 < 18;
}
