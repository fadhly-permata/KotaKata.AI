import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import AppModal from "../../presentation/components/common/AppModal";
import { sharedWordSetRepository } from "../../data/repositories/sharedWordSetRepository";
import { vocabularyRepository } from "../../data/repositories/vocabularyRepository";
import { useGameStore } from "../../presentation/stores/gameStore";
import { loggerError, loggerInfo, loggerWarn } from "../../utils/logger";

const PAGE_SIZE = 25;

/** Satu kartu papan bagikan di daftar. */
interface SharedCard {
  code: string;
  creator_name: string | null;
  created_at: string;
  wordCount: number;
  /** Teks kata untuk preview (diresolve dari vocabulary via word_id). */
  preview: string[];
}

/** Ambil teks kata untuk preview kartu dari array word_id (chunked). */
async function resolveWords(wordIds: string[]): Promise<string[]> {
  if (wordIds.length === 0) return [];
  try {
    const docs = await vocabularyRepository.getByIds(wordIds);
    const byId = new Map(docs.map((d) => [d.word_id, d.word]));
    return wordIds.map((id) => byId.get(id) ?? "?");
  } catch (err) {
    loggerWarn("Gagal memuat preview kata papan bagikan", err);
    return [];
  }
}

function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function SharedBoardsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<SharedCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingCode, setStartingCode] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  /** Muat satu halaman daftar (paging saat scroll). */
  const loadPage = useCallback(async (offset: number) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const { items: rows, total: totalCount } = await sharedWordSetRepository.list(
        PAGE_SIZE,
        offset,
      );
      setTotal(totalCount);
      // Preview teks kata dibaca dari vocabulary via word_id — tanpa duplikasi.
      const previews = await Promise.all(rows.map((r) => resolveWords(r.word_ids)));
      setItems((prev) => {
        const next = rows.map((r, i) => ({
          code: r.code,
          creator_name: r.creator_name,
          created_at: r.created_at,
          wordCount: r.word_ids.length,
          preview: previews[i].slice(0, 5),
        }));
        return offset === 0 ? next : [...prev, ...next];
      });
      setError(null);
    } catch (err) {
      loggerError("Gagal memuat daftar papan bagikan", err);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  /**
   * Mainkan set: kata yang sudah ada di vocabulary dipakai versi DB-nya
   * (word_id + clue hasil audit pemilik); kata baru memakai clue dari
   * pembuatnya. Papan tetap digenerate acak oleh GameScreen.
   */
  const playSharedSet = useCallback(
    async (code: string) => {
      if (startingCode) return;
      setStartingCode(code);
      setStartError(null);
      try {
        const set = await sharedWordSetRepository.getByCode(code);
        if (!set || set.word_ids.length < 6) {
          throw new Error("Set soal tidak ditemukan atau katanya kurang dari 6.");
        }
        // Kata & clue SELALU dari vocabulary (versi teraudit). Baris yang sudah
        // dihapus dari vocabulary dilewati.
        const docs = await vocabularyRepository.getByIds(set.word_ids);
        const resolved = docs
          .filter((d) => !!d.clue_1 && !d.clue_1.toLowerCase().includes(d.word.toLowerCase()))
          .map((d) => ({ word: d.word, clue_1: d.clue_1, clue_2: d.clue_2 }));
        useGameStore.getState().reset();
        // PLAN-107: papan buatan pemain lain TIDAK mengakumulasi XP.
        useGameStore.getState().setNoXpMode(true);
        useGameStore.getState().setAiWords(resolved);
        loggerInfo(`Memainkan papan bagikan ${code} (${resolved.length} kata)`);
        navigation.navigate("Game" as never);
      } catch (err) {
        // Kondisi validasi yang ditangani (kode tidak ada / <6 kata) — UI sudah
        // menampilkan pesannya; catat sebagai warn agar log error bersih.
        loggerWarn("Gagal memainkan papan bagikan", err instanceof Error ? err : new Error(String(err)));
        setStartError(err instanceof Error ? err.message : "Gagal memulai permainan.");
      } finally {
        setStartingCode(null);
      }
    },
    [navigation, startingCode],
  );

  const renderCard = ({ item }: { item: SharedCard }) => (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.codeText, { color: C.primary }]}>{item.code}</Text>
        <Text style={[styles.dateText, { color: C.textSecondary }]}>
          {formatTanggal(item.created_at)}
        </Text>
      </View>
      <Text style={[styles.metaText, { color: C.textSecondary }]}>
        🧩 {item.wordCount} kata · oleh {item.creator_name ?? "Anonim"}
      </Text>
      <Text numberOfLines={2} style={[styles.previewText, { color: C.text }]}>
        {item.preview.join(" · ")}
        {item.wordCount > item.preview.length ? " · …" : ""}
      </Text>
      <TouchableOpacity
        style={[
          styles.playBtn,
          startingCode === item.code && { opacity: 0.6 },
        ]}
        disabled={!!startingCode}
        onPress={() => void playSharedSet(item.code)}
      >
        {startingCode === item.code ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.playBtnText}>▶ Main</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const hasMore = items.length < total;

  return (
    <ScreenFade>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar />
        <Text style={[styles.title, { color: C.text }]}>🤝 Papan Bagikan</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          Soal buatan pemain lain — siapa pun bisa memainkannya. Tiap pemain dapat
          susunan papan acak sendiri.
        </Text>

        {error ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: C.primary }]}
              onPress={() => void loadPage(0)}
            >
              <Text style={styles.playBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Memuat…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary, textAlign: "center" }]}>
              Belum ada soal yang dibagikan. Jadilah yang pertama lewat fitur
              {" "}
              &quot;Buat Soalmu Sendiri&quot;! 🤖
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.code}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (!loadingMore && hasMore) void loadPage(items.length);
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color={C.primary} />
              ) : hasMore ? null : (
                <Text style={[styles.endLabel, { color: C.textSecondary }]}>
                  — Semua papan sudah tampil ({total}) —
                </Text>
              )
            }
          />
        )}
      </View>

      {/* Error mulai permainan */}
      <AppModal visible={!!startError} title="Gagal Memulai" onClose={() => setStartError(null)}>
        <Text style={[styles.errorText, { color: C.error, textAlign: "center" }]}>
          {startError}
        </Text>
      </AppModal>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", paddingHorizontal: 16, marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeText: { fontSize: 17, fontWeight: "800", letterSpacing: 1.5 },
  dateText: { fontSize: 11 },
  metaText: { fontSize: 12, fontWeight: "600" },
  previewText: { fontSize: 12, lineHeight: 17 },
  playBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#22C55E",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  playBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText: { fontSize: 13 },
  errorText: { fontSize: 13, lineHeight: 19 },
  retryBtn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40 },
  endLabel: { fontSize: 11, textAlign: "center", marginVertical: 16 },
});
