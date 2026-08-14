// ============================================================
// Generator: supabase/data/themes.sql dari registry tema lokal
// ============================================================
// Membaca src/presentation/themes/themeData.ts (sumber palet RUNTIME) dan
// menulis file SQL seed untuk tabel `themes` (katalog Pasar/Store).
//
// Jalankan: bun scripts/db/gen-themes-sql.mjs
// Lalu push: node scripts/db/supabase-run.mjs supabase/data/themes.sql
//
// ⚠️ Setiap kali registry tema berubah, jalankan ulang generator ini supaya
// katalog cloud tidak tertinggal. (Header di themeData.ts mengingatkan hal
// yang sama.)
// ============================================================

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_THEMES,
  BOARD_THEMES,
  KEYBOARD_THEMES,
} from "../../src/presentation/themes/themeData.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "supabase", "data", "themes.sql");

/** Escape teks SQL literal (single quote → double single quote). */
function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Palet jadi jsonb literal — warna disimpan polos supaya tetap bisa dibaca. */
function jsonb(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function rowSql(kind, sortOrder, theme) {
  // Backsound tema (AmbientSoundSpec) dibawa di dalam jsonb palet (light &
  // dark sama, karena backsound tidak tergantung mode) supaya katalog cloud
  // ikut membawanya tanpa perlu kolom baru — dibaca StoreScreen sebagai
  // badge "🎵 Backsound". Nilai volume dibakukan ke 0–1 (default 0.3).
  const ambient = theme.ambient
    ? {
        ambient: {
          label: theme.ambient.label,
          url: theme.ambient.url,
          volume:
            typeof theme.ambient.volume === "number" &&
            theme.ambient.volume >= 0 &&
            theme.ambient.volume <= 1
              ? theme.ambient.volume
              : 0.3,
        },
      }
    : {};
  const light = { ...theme.light, ...ambient };
  const dark = { ...theme.dark, ...ambient };
  return [
    `  (${sqlStr(theme.id)}, ${sqlStr(kind)}, ${sqlStr(theme.name)},`,
    `   ${sqlStr(theme.tagline)}, ${sqlStr(theme.description)},`,
    `   ${theme.isDefault}, ${sqlStr(theme.priceLabel)},`,
    `   ${jsonb(light)},`,
    `   ${jsonb(dark)},`,
    `   ${sortOrder})`,
  ].join("\n");
}

const rows = [];
let order = 0;
for (const t of APP_THEMES) rows.push(rowSql("app", order++, t));
for (const t of BOARD_THEMES) rows.push(rowSql("board", order++, t));
for (const t of KEYBOARD_THEMES) rows.push(rowSql("keyboard", order++, t));

const header = `-- ============================================================
-- KotaKata AI — Seed katalog tema (tabel themes)
-- ============================================================
-- File ini DIBANGUN OTOMATIS oleh scripts/db/gen-themes-sql.mjs dari
-- src/presentation/themes/themeData.ts. Jangan edit manual — ubah registry,
-- lalu jalankan ulang generator dan push file ini.
--
-- Jalankan: node scripts/db/supabase-run.mjs supabase/data/themes.sql
-- ============================================================

insert into public.themes
  (id, kind, name, tagline, description, is_default, price_label, light, dark, sort_order)
values
`;

const footer = `
on conflict (id, kind) do update set
  kind = excluded.kind,
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  is_default = excluded.is_default,
  price_label = excluded.price_label,
  light = excluded.light,
  dark = excluded.dark,
  sort_order = excluded.sort_order;
`;

writeFileSync(OUT, header + rows.join(",\n") + footer, "utf8");
console.log(`✓ supabase/data/themes.sql ditulis (${rows.length} tema).`);
