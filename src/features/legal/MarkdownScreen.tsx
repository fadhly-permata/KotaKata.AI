import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown, { type MarkdownProps } from "react-native-markdown-display";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Props = NativeStackScreenProps<RootStackParamList, "Markdown">;

/**
 * Layar dokumen legal (Ketentuan Layanan / Kebijakan Privasi).
 *
 * Markdown dimuat dari URL raw GitHub (raw.githubusercontent.com —
 * pengganti rawgit yang sudah berhenti), lalu di-render sebagai preview
 * markdown. Berjalan di web (react-native-web) dan native.
 */
export default function MarkdownScreen({ route }: Props) {
  const { title, url } = route.params;
  const { theme } = useTheme();

  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Gagal memuat dokumen (HTTP ${res.status})`);
      }
      setContent(await res.text());
    } catch (e: any) {
      setError(e?.message || "Gagal memuat dokumen. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  const C = theme.colors;

  // Gaya markdown mengikuti tema aplikasi (terang/gelap).
  const markdownStyle = {
    body: { color: C.text, fontSize: 15, lineHeight: 23 },
    heading1: {
      color: C.primary,
      fontSize: 22,
      fontWeight: "800" as const,
      marginTop: 4,
      marginBottom: 10,
      lineHeight: 30,
    },
    heading2: {
      color: C.text,
      fontSize: 17,
      fontWeight: "700" as const,
      marginTop: 22,
      marginBottom: 6,
      lineHeight: 24,
    },
    heading3: {
      color: C.text,
      fontSize: 15,
      fontWeight: "700" as const,
      marginTop: 16,
      marginBottom: 4,
      lineHeight: 21,
    },
    paragraph: { color: C.text, marginVertical: 6, lineHeight: 23 },
    strong: { color: C.text, fontWeight: "700" as const },
    em: { color: C.text },
    link: { color: C.tertiary },
    bullet_list: { color: C.text },
    ordered_list: { color: C.text },
    list_item: { color: C.text, marginVertical: 2, lineHeight: 22 },
    blockquote: {
      backgroundColor: C.secondaryContainer,
      borderLeftColor: C.secondary,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginVertical: 8,
      borderRadius: 6,
    },
    code_inline: {
      backgroundColor: C.border,
      color: C.text,
      fontSize: 13,
    },
    code_block: {
      backgroundColor: C.surface,
      color: C.text,
      fontSize: 13,
      padding: 10,
      borderRadius: 8,
    },
    table: { borderColor: C.border },
    th: { color: C.text, fontWeight: "700" as const },
    td: { color: C.text },
  } as MarkdownProps["style"];

  return (
    <ScreenFade style={{ backgroundColor: C.background }}>
      <View style={[styles.container, { backgroundColor: C.background }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={[styles.hint, { color: C.textSecondary }]}>Memuat {title}…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.error, { color: C.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: C.primary }]}
              activeOpacity={0.8}
              onPress={() => void load()}
            >
              <Text style={styles.retryText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : content ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Markdown style={markdownStyle}>{content}</Markdown>
          </ScrollView>
        ) : null}
      </View>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  hint: { fontSize: 14 },
  error: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
});
