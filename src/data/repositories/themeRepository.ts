import { supabase } from "../sources/supabase";

/**
 * Baris katalog tema dari tabel `themes` (Supabase). Palet light/dark disimpan
 * sebagai jsonb — parsing dilakukan di sini supaya konsumen (halaman Pasar)
 * mendapat objek ter-typed.
 */
export interface ThemeCatalogRow {
  id: string;
  kind: "app" | "board" | "keyboard";
  name: string;
  tagline: string;
  description: string;
  is_default: boolean;
  price_label: string;
  /** Palet mode terang (bentuk sesuai jenis tema: app/board/keyboard). */
  light: Record<string, unknown>;
  /** Palet mode gelap. */
  dark: Record<string, unknown>;
}

/**
 * Katalog tema di-fetch dari cloud dengan cache pendek (TTL 15 menit).
 * Halaman Pasar memakai data ini sebagai katalog resmi; kalau fetch gagal
 * (offline / Supabase tidak terjangkau), layar jatuh ke registry lokal
 * (src/presentation/themes/themeData.ts) — lihat StoreScreen.
 */
const CLOUD_TTL_MS = 15 * 60 * 1000;
let cache: { fetchedAt: number; rows: ThemeCatalogRow[] } | null = null;

const THEME_COLUMNS = "id, kind, name, tagline, description, is_default, price_label, light, dark";

function toRow(raw: Record<string, unknown>): ThemeCatalogRow {
  const light = (raw.light ?? {}) as Record<string, unknown>;
  const dark = (raw.dark ?? {}) as Record<string, unknown>;
  const kind = raw.kind === "board" ? "board" : raw.kind === "keyboard" ? "keyboard" : "app";
  return {
    id: raw.id as string,
    kind,
    name: (raw.name as string) ?? "",
    tagline: (raw.tagline as string) ?? "",
    description: (raw.description as string) ?? "",
    is_default: Boolean(raw.is_default),
    price_label: (raw.price_label as string) ?? "Gratis",
    light,
    dark,
  };
}

export const themeRepository = {
  /** Ambil seluruh katalog tema dari Supabase (cache 15 menit). */
  async getCatalog(): Promise<ThemeCatalogRow[]> {
    if (cache && Date.now() - cache.fetchedAt < CLOUD_TTL_MS) {
      return cache.rows;
    }
    const { data, error } = await supabase
      .from("themes")
      .select(THEME_COLUMNS)
      .order("sort_order", { ascending: true });
    if (error) {
      throw new Error(`Gagal ambil katalog tema dari Supabase: ${error.message}`);
    }
    const rows = ((data ?? []) as Record<string, unknown>[]).map(toRow);
    cache = { fetchedAt: Date.now(), rows };
    return rows;
  },

  /** Bypass cache (mis. saat developer ingin memaksa refresh). */
  clearCache(): void {
    cache = null;
  },
};
