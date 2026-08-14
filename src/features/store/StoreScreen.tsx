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

type ThemeKind = "app" | "board" | "keyboard";

/** Satu kartu tema di halaman Pasar (model UI, independen dari sumber data). */
interface ThemeCardModel {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  swatches: { light: string[]; dark: string[] };
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

function rowToCard(kind: ThemeKind, row: ThemeCatalogRow): ThemeCardModel {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    isDefault: row.is_default,
    priceLabel: row.price_label,
    swatches: {
      light: pickSwatches(row.light, SWATCH_KEYS[kind]),
      dark: pickSwatches(row.dark, SWATCH_KEYS[kind]),
    },
  };
}

/** Fallback katalog dari registry lokal (offline-first) — bentuk sama dengan kartu DB. */
function localCards(kind: ThemeKind): ThemeCardModel[] {
  if (kind === "app") {
    return APP_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      isDefault: t.isDefault,
      priceLabel: t.priceLabel,
      swatches: {
        light: pickSwatches(t.light.colors as unknown as Record<string, unknown>, SWATCH_KEYS.app),
        dark: pickSwatches(t.dark.colors as unknown as Record<string, unknown>, SWATCH_KEYS.app),
      },
    }));
  }
  if (kind === "board") {
    return BOARD_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      isDefault: t.isDefault,
      priceLabel: t.priceLabel,
      swatches: {
        light: pickSwatches(t.light as unknown as Record<string, unknown>, SWATCH_KEYS.board),
        dark: pickSwatches(t.dark as unknown as Record<string, unknown>, SWATCH_KEYS.board),
      },
    }));
  }
  return KEYBOARD_THEMES.map((t) => ({
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    isDefault: t.isDefault,
    priceLabel: t.priceLabel,
    swatches: {
      light: pickSwatches(t.light as unknown as Record<string, unknown>, SWATCH_KEYS.keyboard),
      dark: pickSwatches(t.dark as unknown as Record<string, unknown>, SWATCH_KEYS.keyboard),
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
  onActivate: (id: string) => void;
}

function ThemeCard({ card, active, accent, onActivate }: ThemeCardProps) {
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
  );
}

interface SectionConfig {
  kind: ThemeKind;
  title: string;
  emoji: string;
  subtitle: string;
}

const SECTIONS: SectionConfig[] = [
  {
    kind: "app",
    title: "Tema Aplikasi",
    emoji: "🎨",
    subtitle: "Palet global untuk semua halaman — terang & gelap penuh.",
  },
  {
    kind: "board",
    title: "Tema Papan",
    emoji: "🧩",
    subtitle: "Desain halaman game: papan, soal (clue pill) & panel petunjuk.",
  },
  {
    kind: "keyboard",
    title: "Tema Keyboard",
    emoji: "⌨️",
    subtitle: "Tampilan keyboard virtual saat mengisi jawaban.",
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
  const {
    theme,
    appThemeId,
    setAppThemeId,
    boardThemeId,
    setBoardThemeId,
    keyboardThemeId,
    setKeyboardThemeId,
  } = useTheme();
  const C = theme.colors;

  const [catalog, setCatalog] = useState<ThemeCatalogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCloud, setFromCloud] = useState(false);

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

  const activeIdFor = (kind: ThemeKind): string =>
    kind === "app" ? appThemeId : kind === "board" ? boardThemeId : keyboardThemeId;

  const activateFor = (kind: ThemeKind, id: string): void => {
    if (kind === "app") void setAppThemeId(id);
    else if (kind === "board") void setBoardThemeId(id);
    else void setKeyboardThemeId(id);
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
            Ganti tampilan KotaKata sesukamu: tema aplikasi, desain papan, dan
            keyboard — masing-masing mendukung mode terang & gelap.
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
  activeButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  activeButtonText: { fontSize: 12, fontWeight: "800" },
  activateButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
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
