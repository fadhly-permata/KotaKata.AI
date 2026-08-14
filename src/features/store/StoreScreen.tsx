import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import { THEME_PRODUCTS, type ThemeProduct } from "../../presentation/themes/themeCatalog";

/**
 * Preview swatch satu tema: dua baris warna (mode terang & gelap) supaya
 * pembeli langsung melihat bagaimana tema tampil di kedua mode.
 */
function ThemeSwatches({ product }: { product: ThemeProduct }) {
  return (
    <View style={styles.swatchWrap}>
      <View style={styles.swatchRow}>
        <Text style={styles.swatchLabel}>Terang</Text>
        <View style={styles.swatchDots}>
          {product.swatches.light.map((color) => (
            <View key={color} style={[styles.swatchDot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
      <View style={styles.swatchRow}>
        <Text style={styles.swatchLabel}>Gelap</Text>
        <View style={styles.swatchDots}>
          {product.swatches.dark.map((color) => (
            <View key={color} style={[styles.swatchDot, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Halaman Pasar (Store): katalog tema KotaKata.
 *
 * Saat ini baru ada 1 tema bawaan ("Puitis") yang mendukung terang/gelap dan
 * dipilih sebagai default. Ke depan tema baru akan ditambahkan di sini dan
 * menjadi konten berbayar — struktur katalog sudah siap dikembangkan.
 */
export default function StoreScreen() {
  const { theme } = useTheme();
  const C = theme.colors;

  return (
    <ScreenFade style={[styles.container, { backgroundColor: C.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ═══ Hero Pasar ═══ */}
        <View style={styles.hero}>
          <Text style={[styles.heroEmoji, { color: C.primary }]}>🛍️</Text>
          <Text style={[styles.heroTitle, { color: C.text }]}>Pasar</Text>
          <Text style={[styles.heroSubtitle, { color: C.textSecondary }]}>
            Ganti tampilan KotaKata dengan tema baru. Tema aktif berlaku di
            seluruh halaman, terang maupun gelap.
          </Text>
        </View>

        {/* ═══ Daftar Tema ═══ */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Tema Tersedia</Text>
        {THEME_PRODUCTS.map((product) => (
          <View
            key={product.id}
            style={[
              styles.themeCard,
              {
                backgroundColor: C.surface,
                borderColor: product.isDefault ? C.primary : C.border,
              },
            ]}
          >
            <View style={styles.themeCardHeader}>
              <View style={styles.themeCardTitleCol}>
                <Text style={[styles.themeName, { color: C.text }]}>{product.name}</Text>
                <Text style={[styles.themeTagline, { color: C.textSecondary }]}>
                  {product.tagline}
                </Text>
              </View>
              {product.isDefault && (
                <View style={[styles.defaultBadge, { backgroundColor: C.primary + "1A" }]}>
                  <Text style={[styles.defaultBadgeText, { color: C.primary }]}>
                    ✓ Tema Aktif
                  </Text>
                </View>
              )}
            </View>

            <ThemeSwatches product={product} />

            <Text style={[styles.themeDescription, { color: C.textSecondary }]}>
              {product.description}
            </Text>

            <View style={[styles.priceRow, { borderTopColor: C.border }]}>
              <Text style={[styles.priceLabel, { color: C.text }]}>{product.priceLabel}</Text>
              <Text style={[styles.priceBadge, { color: C.secondary }]}>Default</Text>
            </View>
          </View>
        ))}

        {/* ═══ Segera Hadir ═══ */}
        <View style={[styles.comingSoon, { backgroundColor: C.secondaryContainer }]}>
          <Text style={[styles.comingSoonEmoji, { color: C.secondary }]}>🎨</Text>
          <Text style={[styles.comingSoonTitle, { color: C.text }]}>Tema baru segera hadir</Text>
          <Text style={[styles.comingSoonText, { color: C.textSecondary }]}>
            Kami sedang menyiapkan koleksi tema baru yang bisa kamu pakai untuk
            mempercantik papanku. Pantau terus Pasar ini!
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
  heroSubtitle: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 320 },

  /* ─── Daftar Tema ─── */
  sectionTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
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
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: "800" },

  /* ─── Swatch Preview ─── */
  swatchWrap: { gap: 6 },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatchLabel: { width: 44, fontSize: 11, fontWeight: "700", color: "#8a6d90" },
  swatchDots: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  swatchDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },

  themeDescription: { fontSize: 13, lineHeight: 19 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  priceLabel: { fontSize: 13, fontWeight: "800" },
  priceBadge: { fontSize: 12, fontWeight: "700" },

  /* ─── Segera Hadir ─── */
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
