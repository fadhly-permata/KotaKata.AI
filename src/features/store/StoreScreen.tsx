import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { buttonShadow, contrastText } from "../../utils/skin";
import TopBar from "../../presentation/components/common/TopBar";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import { neumorphicShadow } from "../../utils/neumorphic";
import {
  APP_THEMES,
  BOARD_THEMES,
  KEYBOARD_THEMES,
  type ThemeTier,
} from "../../presentation/themes/themeData";
import {
  themeRepository,
  type ThemeCatalogRow,
} from "../../data/repositories/themeRepository";
import ThemePreviewModal, {
  type ThemeKind,
  type ThemePreviewPalettes,
} from "./ThemePreviewModal";
import { loggerWarn } from "../../utils/logger";

/** Satu kartu tema di halaman Pasar (model UI, independen dari sumber data). */
interface ThemeCardModel {
  id: string;
  kind: ThemeKind;
  name: string;
  tagline: string;
  description: string;
  isDefault: boolean;
  priceLabel: string;
  /** Jenis tema (PLAN-052): "free" / "premium" — menentukan tab di Pasar. */
  themeType: ThemeTier;
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
    themeType: row.theme_type,
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
      themeType: t.themeType,
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
      themeType: "free" as const,
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
    themeType: "free" as const,
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

function ThemeSwatches({ swatches }: { swatches: ThemeCardModel["swatches"] }) {
  const { theme } = useTheme();
  return (
    <View style={styles.swatchWrap}>
      <View style={styles.swatchRow}>
        <Text style={[styles.swatchLabel, { color: theme.colors.textSecondary }]}>Terang</Text>
        <View style={styles.swatchDots}>
          {swatches.light.map((color) => (
            <View
              key={`l-${color}`}
              style={[styles.swatchDot, { backgroundColor: color, borderColor: theme.colors.border }]}
            />
          ))}
        </View>
      </View>
      <View style={styles.swatchRow}>
        <Text style={[styles.swatchLabel, { color: theme.colors.textSecondary }]}>Gelap</Text>
        <View style={styles.swatchDots}>
          {swatches.dark.map((color) => (
            <View
              key={`d-${color}`}
              style={[styles.swatchDot, { backgroundColor: color, borderColor: theme.colors.border }]}
            />
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
  const isModern = card.themeType === "premium";

  return (
    <View
      style={[
        styles.themeCard,
        {
          backgroundColor: C.surface,
          borderColor: active ? accent : C.border,
        },
        neumorphicShadow(theme.shadow),
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
          {isModern ? (
            <View style={[styles.modernChip, { backgroundColor: C.gold + "26" }]}>
              <Text style={[styles.modernChipText, { color: C.gold }]}>✨ Modern</Text>
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
            style={[styles.previewButton, { backgroundColor: C.secondaryContainer }, buttonShadow(theme)]}
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
              style={[styles.activateButton, { backgroundColor: accent }, buttonShadow(theme)]}
            >
              <Text style={[styles.activateButtonText, { color: contrastText(accent) }]}>Aktifkan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PLAN-053: Tab bar yang bisa di-swipe — "Gratis" & "Modern".
 * Tab horizontal, konten berubah berdasarkan tab aktif (pager).
 * ═══════════════════════════════════════════════════════════════════════════ */

interface TabDef {
  key: ThemeTier;
  label: string;
  emoji: string;
}

const TABS: TabDef[] = [
  { key: "free", label: "Gratis", emoji: "🆓" },
  { key: "premium", label: "Modern", emoji: "✨" },
];

/** Tab bar horizontal — bisa di-tap, item aktif menonjol. */
function ThemeTabBar({
  activeTab,
  onSelect,
  counts,
  colors,
}: {
  activeTab: ThemeTier;
  onSelect: (key: ThemeTier) => void;
  counts: Record<ThemeTier, number>;
  colors: { text: string; textSecondary: string; primary: string; border: string; secondaryContainer: string };
}) {
  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onSelect(tab.key)}
            style={[
              styles.tabItem,
              isActive && { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <Text style={[styles.tabEmoji]}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
            {counts[tab.key] > 0 ? (
              <View
                style={[
                  styles.tabCount,
                  { backgroundColor: isActive ? colors.primary + "22" : colors.secondaryContainer },
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {counts[tab.key]}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Halaman Pasar (Store): katalog tema dari DATABASE (tabel `themes`) dengan
 * tab Gratis & Modern (PLAN-053). Tiap tema bisa langsung diaktifkan.
 *
 * Tab didukung swipe/geser (ScrollView pagingEnabled) supaya siap menerima
 * tab/tema baru di masa depan.
 *
 * Saat katalog cloud tidak bisa dijangkau (offline), layar jatuh ke registry
 * lokal (themeData.ts) — katalog yang sama, jadi pengalaman tetap utuh.
 */
export default function StoreScreen() {
  const { theme, appThemeId, setAppThemeId } = useTheme();
  const C = theme.colors;
  const { width: winW } = useWindowDimensions();

  const [catalog, setCatalog] = useState<ThemeCatalogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCloud, setFromCloud] = useState(false);
  const [previewCard, setPreviewCard] = useState<ThemeCardModel | null>(null);

  /* Tab state — PLAN-053 */
  const [activeTab, setActiveTab] = useState<ThemeTier>("free");
  const tabPagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    let disposed = false;
    themeRepository
      .getCatalog()
      .then((rows) => {
        if (disposed) return;
        setCatalog(rows);
        setFromCloud(true);
      })
      .catch((err) => {
        loggerWarn("Gagal mengambil katalog tema dari cloud", err);
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

  const allAppCards = cardsFor("app");
  const activeId = appThemeId;

  const activateFor = (_kind: ThemeKind, id: string): void => {
    void setAppThemeId(id);
  };

  const freeCards = allAppCards.filter((c) => c.themeType === "free");
  const modernCards = allAppCards.filter((c) => c.themeType === "premium");
  const counts: Record<ThemeTier, number> = { free: freeCards.length, premium: modernCards.length };

  /* Tab pager */
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const onTabPress = useCallback(
    (key: ThemeTier) => {
      setActiveTab(key);
      const idx = TABS.findIndex((t) => t.key === key);
      tabPagerRef.current?.scrollTo({ x: idx * winW, animated: true });
    },
    [winW],
  );

  const onTabScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / winW);
      if (idx >= 0 && idx < TABS.length && TABS[idx].key !== activeTab) {
        setActiveTab(TABS[idx].key);
      }
    },
    [winW, activeTab],
  );

  const renderTabContent = (tier: ThemeTier) => {
    const cards = tier === "free" ? freeCards : modernCards;
    return (
      <View style={[styles.tabContent, { width: winW }]}>
        {cards.length === 0 ? (
          <View style={[styles.emptyTab, { backgroundColor: C.secondaryContainer }]}>
            <Text style={[styles.emptyTabText, { color: C.textSecondary }]}>
              Belum ada tema di kategori ini.
            </Text>
          </View>
        ) : (
          cards.map((card) => (
            <ThemeCard
              key={`app-${card.id}`}
              card={card}
              active={card.id === activeId}
              accent={C.primary}
              onPreview={() => setPreviewCard(card)}
              onActivate={(id) => activateFor("app", id)}
            />
          ))
        )}
      </View>
    );
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
            Ganti tampilan KotaKata sesukamu — tema gratis & modern pilihanmu.
            Papan & keyboard otomatis mengikuti tema yang sama.
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
          <>
            {/* ═══ Tab Bar (PLAN-053) ═══ */}
            <ThemeTabBar
              activeTab={activeTab}
              onSelect={onTabPress}
              counts={counts}
              colors={C}
            />

            {/* ═══ Tab Pager (swipeable) ═══ */}
            <ScrollView
              ref={tabPagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onTabScroll}
              scrollEventThrottle={16}
              style={styles.tabPager}
            >
              {TABS.map((tab) => (
                <View key={tab.key} style={{ width: winW }}>
                  {renderTabContent(tab.key)}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ═══ Catatan ═══ */}
        <View style={[styles.comingSoon, { backgroundColor: C.secondaryContainer }]}>
          <Text style={[styles.comingSoonEmoji, { color: C.secondary }]}>✨</Text>
          <Text style={[styles.comingSoonTitle, { color: C.text }]}>Koleksi tema terus bertambah</Text>
          <Text style={[styles.comingSoonText, { color: C.textSecondary }]}>
            Geser ke tab Modern untuk melihat koleksi eksklusif. Mekanisme
            pembelian akan segera hadir!
          </Text>
        </View>
      </ScrollView>

      {/* Preview tema */}
      <ThemePreviewModal
        visible={previewCard !== null}
        kind={previewCard?.kind ?? "app"}
        name={previewCard?.name ?? ""}
        tagline={previewCard?.tagline ?? ""}
        palettes={previewCard?.palettes ?? { light: {}, dark: {} }}
        onClose={() => setPreviewCard(null)}
      />
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },

  /* ─── Hero ─── */
  hero: { alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 16 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 330, paddingHorizontal: 16 },

  /* ─── Status katalog ─── */
  offlineNote: { borderRadius: 12, padding: 10, alignItems: "center", marginHorizontal: 16 },
  offlineNoteText: { fontSize: 12, fontWeight: "700" },
  loading: { marginVertical: 48 },

  /* ─── Tab Bar (PLAN-053) ─── */
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 14, fontWeight: "800" },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  tabCountText: { fontSize: 10, fontWeight: "800" },

  /* ─── Tab Pager ─── */
  tabPager: { flexGrow: 0 },
  tabContent: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyTab: { borderRadius: 12, padding: 24, alignItems: "center" },
  emptyTabText: { fontSize: 13, fontWeight: "600" },

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
  modernChip: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modernChipText: { fontSize: 11, fontWeight: "800" },
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
    marginTop: 8,
    marginHorizontal: 16,
  },
  comingSoonEmoji: { fontSize: 30 },
  comingSoonTitle: { fontSize: 15, fontWeight: "800" },
  comingSoonText: { fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 300 },
});
