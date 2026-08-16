import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import {
  APP_THEMES,
  BOARD_THEMES,
  KEYBOARD_THEMES,
} from "../../presentation/themes/themeData";
import {
  themeRepository,
  type ThemeCatalogRow,
} from "../../data/repositories/themeRepository";
import ThemePreviewModal, {
  type ThemeKind,
  type ThemePreviewPalettes,
} from "./ThemePreviewModal";

/** Satu kartu tema di halaman Pasar (model UI, independen dari sumber data). */
interface ThemeCardModel {
  id: string;
  kind: ThemeKind;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  /** Label backsound tema (hanya tema aplikasi yang punya) — chip kecil di kartu. */
  ambientLabel?: string;
  swatches: { light: string[]; dark: string[] };
  /** Palet LENGKAP (light/dark) untuk mockup di modal Preview. */
  palettes: ThemePreviewPalettes;
}

/** Warna representatif per jenis tema untuk preview swatch (terang/gelap). */
const SWATCH_KEYS: Record<ThemeKind, string[]> = {
  app: ["background", "surface", "primary", "secondary", "tertiary"],
  board: ["boardBackground", "cellActive", "cellSelected", "cellSolved", "clueBackground"],
  keyboard: ["panelBackground", "keyBackground", "specialBackground", "navBackground", "navBorder"],
};

function pickSwatches(palette: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const value = palette[key];
    if (typeof value === "string" && value.startsWith("#") && !out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

/**
 * Normalisasi palet jadi map warna polos + spec latar. Tema app di
 * DB/registry berbentuk `{ mode, colors }` — ambil bagian `colors`; tema
 * papan/keyboard langsung map warna. Nilai non-string dibuang, KECUALI
 * objek `background` (gradien/gambar) yang ikut disalin utuh supaya mockup
 * preview bisa merendernya.
 */
function colorMapOf(kind: ThemeKind, palette: Record<string, unknown>): Record<string, unknown> {
  const raw =
    kind === "app" && palette && typeof palette === "object" && "colors" in palette
      ? (palette as { colors?: unknown }).colors
      : palette;
  const out: Record<string, unknown> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string") out[key] = value;
    }
  }
  const bg = palette?.background;
  if (bg && typeof bg === "object") out.background = bg;
  return out;
}

function rowToCard(kind: ThemeKind, row: ThemeCatalogRow): ThemeCardModel {
  // Backsound dibawa seed di dalam jsonb palet (light/dark) — lihat
  // scripts/db/gen-themes-sql.mjs. Hanya tema app yang punya.
  const ambient =
    (row.light as { ambient?: { label?: string } } | null)?.ambient ??
    (row.dark as { ambient?: { label?: string } } | null)?.ambient;
  return {
    id: row.id,
    kind,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    isDefault: row.is_default,
    priceLabel: row.price_label,
    ambientLabel: kind === "app" ? ambient?.label : undefined,
    swatches: {
      light: pickSwatches(row.light, SWATCH_KEYS[kind]),
      dark: pickSwatches(row.dark, SWATCH_KEYS[kind]),
    },
    palettes: {
      light: colorMapOf(kind, row.light),
      dark: colorMapOf(kind, row.dark),
    },
  };
}

/** Fallback katalog dari registry lokal (offline-first) — bentuk sama dengan kartu DB. */
function localCards(kind: ThemeKind): ThemeCardModel[] {
  if (kind === "app") {
    return APP_THEMES.map((t) => ({
      id: t.id,
      kind,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      isDefault: t.isDefault,
      priceLabel: t.priceLabel,
      ambientLabel: t.ambient?.label,
      swatches: {
        light: pickSwatches(t.light.colors as unknown as Record<string, unknown>, SWATCH_KEYS.app),
        dark: pickSwatches(t.dark.colors as unknown as Record<string, unknown>, SWATCH_KEYS.app),
      },
      palettes: {
        light: colorMapOf(kind, t.light as unknown as Record<string, unknown>),
        dark: colorMapOf(kind, t.dark as unknown as Record<string, unknown>),
      },
    }));
  }
  if (kind === "board") {
    return BOARD_THEMES.map((t) => ({
      id: t.id,
      kind,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      isDefault: t.isDefault,
      priceLabel: t.priceLabel,
      swatches: {
        light: pickSwatches(t.light as unknown as Record<string, unknown>, SWATCH_KEYS.board),
        dark: pickSwatches(t.dark as unknown as Record<string, unknown>, SWATCH_KEYS.board),
      },
      palettes: {
        light: colorMapOf(kind, t.light as unknown as Record<string, unknown>),
        dark: colorMapOf(kind, t.dark as unknown as Record<string, unknown>),
      },
    }));
  }
  return KEYBOARD_THEMES.map((t) => ({
    id: t.id,
    kind,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    isDefault: t.isDefault,
    priceLabel: t.priceLabel,
    swatches: {
      light: pickSwatches(t.light as unknown as Record<string, unknown>, SWATCH_KEYS.keyboard),
      dark: pickSwatches(t.dark as unknown as Record<string, unknown>, SWATCH_KEYS.keyboard),
    },
    palettes: {
      light: colorMapOf(kind, t.light as unknown as Record<string, unknown>),
      dark: colorMapOf(kind, t.dark as unknown as Record<string, unknown>),
    },
  }));
}

/** Preview swatch satu tema: dua baris warna (mode terang & gelap). */
function ThemeSwatches({ swatches }: { swatches: ThemeCardModel["swatches"] }) {
  return (
    <View style={styles.swatchWrap}>
      <View style={styles.swatchRow}>
        <Text style={styles.swatchLabel}>Terang</Text>
        <View style={styles.swatchDots}>
          {swatches.light.map((color) => (
            <View key={`l-${color}`} style={[styles.swatchDot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
      <View style={styles.swatchRow}>
        <Text style={styles.swatchLabel}>Gelap</Text>
        <View style={styles.swatchDots}>
          {swatches.dark.map((color) => (
            <View key={`d-${color}`} style={[styles.swatchDot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

interface ThemeCardProps {
  card: ThemeCardModel;
  active: boolean;
  accent: string;
  onPreview: () => void;
  onActivate: (id: string) => void;
}

function ThemeCard({ card, active, accent, onPreview, onActivate }: ThemeCardProps) {
  const { theme } = useTheme();
  const C = theme.colors;

  return (
    <View
      style={[
        styles.themeCard,
        {
          backgroundColor: C.surface,
          borderColor: active ? accent : C.border,
        },
      ]}
    >
      <View style={styles.themeCardHeader}>
        <View style={styles.themeCardTitleCol}>
          <Text style={[styles.themeName, { color: C.text }]}>{card.name}</Text>
          <Text style={[styles.themeTagline, { color: C.textSecondary }]}>{card.tagline}</Text>
          {card.ambientLabel ? (
            <View style={[styles.ambientChip, { backgroundColor: C.secondaryContainer }]}>
              <Text style={[styles.ambientChipText, { color: C.secondary }]}>
                🎵 Backsound: {card.ambientLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {active && (
          <View style={[styles.activeBadge, { backgroundColor: accent + "1A" }]}>
            <Text style={[styles.activeBadgeText, { color: accent }]}>✓ Aktif</Text>
          </View>
        )}
      </View>

      <ThemeSwatches swatches={card.swatches} />

      <Text style={[styles.themeDescription, { color: C.textSecondary }]}>{card.description}</Text>

      <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
        <Text style={[styles.priceLabel, { color: C.text }]}>{card.priceLabel}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onPreview}
            style={[styles.previewButton, { backgroundColor: C.secondaryContainer }]}
          >
            <Text style={[styles.previewButtonText, { color: C.secondary }]}>👁 Preview</Text>
          </TouchableOpacity>
          {active ? (
            <View style={[styles.activeButton, { backgroundColor: accent + "1A" }]}>
              <Text style={[styles.activeButtonText, { color: accent }]}>Sedang Dipakai</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onActivate(card.id)}
              style={[styles.activateButton, { backgroundColor: accent }]}
            >
              <Text style={[styles.activateButtonText, { color: "#FFFFFF" }]}>Aktifkan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

interface SectionConfig {
  kind: ThemeKind;
  title: string;
  emoji: string;
  subtitle: string;
}

// PLAN-033: hanya Tema Aplikasi yang dijual di Pasar untuk saat ini. Tema
// papan & keyboard sengaja dihapus dari pasar (pemilik akan mendesain ulang
// keduanya); papan & keyboard selalu mengikuti tema aplikasi yang aktif.
const SECTIONS: SectionConfig[] = [
  {
    kind: "app",
    title: "Tema Aplikasi",
    emoji: "🎨",
    subtitle: "Palet global untuk semua halaman — papan & keyboard ikut senada. Terang & gelap penuh.",
  },
];

/**
 * Halaman Pasar (Store): katalog tema dari DATABASE (tabel `themes`) dengan
 * 3 seksi — Tema Aplikasi, Tema Papan, dan Tema Keyboard. Tiap tema bisa
 * langsung diaktifkan (pilihan tersimpan permanen di perangkat).
 *
 * Saat katalog cloud tidak bisa dijangkau (offline), layar jatuh ke registry
 * lokal (themeData.ts) — katalog yang sama, jadi pengalaman tetap utuh.
 */
export default function StoreScreen() {
  const { theme, appThemeId, setAppThemeId } = useTheme();
  const C = theme.colors;

  const [catalog, setCatalog] = useState<ThemeCatalogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCloud, setFromCloud] = useState(false);
  // Tema yang sedang di-preview (modal mockup) — hanya state UI, tidak mengubah
  // pilihan aktif sampai user menekan "Aktifkan" di kartu.
  const [previewCard, setPreviewCard] = useState<ThemeCardModel | null>(null);

  useEffect(() => {
    let disposed = false;
    themeRepository
      .getCatalog()
      .then((rows) => {
        if (disposed) return;
        setCatalog(rows);
        setFromCloud(true);
      })
      .catch(() => {
        // Offline / Supabase tidak terjangkau → fallback registry lokal.
        if (disposed) return;
        setCatalog(null);
        setFromCloud(false);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const cardsFor = (kind: ThemeKind): ThemeCardModel[] => {
    if (catalog) return catalog.filter((r) => r.kind === kind).map((r) => rowToCard(kind, r));
    return localCards(kind);
  };

  // Hanya tema aplikasi yang dijual di Pasar (PLAN-033) — papan & keyboard
  // mengikuti tema aplikasi, jadi tidak ada pilihan terpisah lagi.
  const activeIdFor = (kind: ThemeKind): string => appThemeId;

  const activateFor = (_kind: ThemeKind, id: string): void => {
    void setAppThemeId(id);
  };

  return (
    <ScreenFade style={[styles.container, { backgroundColor: C.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ═══ Hero Pasar ═══ */}
        <View style={styles.hero}>
          <Text style={[styles.heroEmoji, { color: C.primary }]}>🛍️</Text>
          <Text style={[styles.heroTitle, { color: C.text }]}>Pasar</Text>
          <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>
            Ganti tampilan KotaKata sesukamu: pilih tema aplikasi — papan dan
            keyboard otomatis mengikuti tema yang sama. Mode terang & gelap
            penuh di tiap tema.
          </Text>
        </View>

        {!fromCloud && !loading && (
          <View style={[styles.offlineNote, { backgroundColor: C.secondaryContainer }]}>
            <Text style={[styles.offlineNoteText, { color: C.secondary }]}>
              📴 Katalog offline — daftar tema dari versi aplikasi ini.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={styles.loading} />
        ) : (
          SECTIONS.map((section) => {
            const activeId = activeIdFor(section.kind);
            return (
              <View key={section.kind} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionEmoji, { color: C.primary }]}>{section.emoji}</Text>
                  <View style={styles.sectionHeaderCol}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
                    <Text style={[styles.sectionSubtitle, { color: C.textSecondary }]}>
                      {section.subtitle}
                    </Text>
                  </View>
                </View>

                {cardsFor(section.kind).map((card) => (
                  <ThemeCard
                    key={`${section.kind}-${card.id}`}
                    card={card}
                    active={card.id === activeId}
                    accent={C.primary}
                    onPreview={() => setPreviewCard(card)}
                    onActivate={(id) => activateFor(section.kind, id)}
                  />
                ))}
              </View>
            );
          })
        )}

        {/* ═══ Catatan ═══ */}
        <View style={[styles.comingSoon, { backgroundColor: C.secondaryContainer }]}>
          <Text style={[styles.comingSoonEmoji, { color: C.secondary }]}>✨</Text>
          <Text style={[styles.comingSoonTitle, { color: C.text }]}>Koleksi tema terus bertambah</Text>
          <Text style={[styles.comingSoonText, { color: C.textSecondary }]}>
            Tema-tema ini nantinya akan menjadi konten berbayar. Pantau terus
            Pasar untuk koleksi terbaru!
          </Text>
        </View>
      </ScrollView>

      {/* Preview tema — mockup sesuai jenis tema, sebelum user mengaktifkan */}
      <ThemePreviewModal
        visible={previewCard !== null}
        kind={previewCard?.kind ?? "app"}
        name={previewCard?.name ?? ""}
        tagline={previewCard?.tagline ?? ""}
        palettes={
          previewCard?.palettes ?? { light: {}, dark: {} }
        }
        onClose={() => setPreviewCard(null)}
      />
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  /* ─── Hero ─── */
  hero: { alignItems: "center", gap: 6, paddingVertical: 12 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 330 },

  /* ─── Status katalog ─── */
  offlineNote: { borderRadius: 12, padding: 10, alignItems: "center" },
  offlineNoteText: { fontSize: 12, fontWeight: "700" },
  loading: { marginVertical: 48 },

  /* ─── Seksi ─── */
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sectionEmoji: { fontSize: 26 },
  sectionHeaderCol: { flex: 1, gap: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 12, lineHeight: 17 },

  /* ─── Kartu Tema ─── */
  themeCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  themeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  themeCardTitleCol: { flex: 1, gap: 2 },
  themeName: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  themeTagline: { fontSize: 12, fontWeight: "600" },
  ambientChip: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ambientChipText: { fontSize: 11, fontWeight: "700" },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  activeBadgeText: { fontSize: 11, fontWeight: "800" },

  /* ─── Swatch Preview ─── */
  swatchWrap: { gap: 6 },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatchLabel: { width: 44, fontSize: 11, fontWeight: "700", color: "#8a6d90" },
  swatchDots: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  swatchDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },

  themeDescription: { fontSize: 13, lineHeight: 19 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  priceLabel: { fontSize: 13, fontWeight: "800", flexShrink: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  previewButtonText: { fontSize: 12, fontWeight: "800" },
  activeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  activeButtonText: { fontSize: 12, fontWeight: "800" },
  activateButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  activateButtonText: { fontSize: 13, fontWeight: "800" },

  /* ─── Catatan ─── */
  comingSoon: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  comingSoonEmoji: { fontSize: 30 },
  comingSoonTitle: { fontSize: 15, fontWeight: "800" },
  comingSoonText: { fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 300 },
});
