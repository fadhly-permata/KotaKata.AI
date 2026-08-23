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
  preview: string[];
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
      setItems((prev) => {
        const next = rows.map((r) => ({
          code: r.code,
          creator_name: r.creator_name,
          created_at: r.created_at,
          wordCount: r.words.length,
          preview: r.words.slice(0, 5).map((w) => w.word),
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
        if (!set || set.words.length < 6) {
          throw new Error("Set soal tidak ditemukan atau katanya kurang dari 6.");
        }
        let dbDocs: Awaited<ReturnType<typeof vocabularyRepository.getByWords>> = [];
        try {
          dbDocs = await vocabularyRepository.getByWords(set.words.map((w) => w.word));
        } catch (err) {
          loggerWarn("Gagal resolve kata dari DB — pakai clue pembuat", err);
        }
        const dbByWord = new Map(dbDocs.map((d) => [d.word.toLowerCase(), d]));
        const resolved = set.words.map((w) => {
          const db = dbByWord.get(w.word.toLowerCase());
          // Versi DB menang (teraudit); fallback ke clue dari pembuat.
          if (db?.clue_1 && !db.clue_1.toLowerCase().includes(db.word.toLowerCase())) {
            return { word: db.word, clue_1: db.clue_1, clue_2: db.clue_2 };
          }
          return {
            word: w.word,
            clue_1: w.clue_1 ?? `(kata: ${w.word.length} huruf)`,
            clue_2: w.clue_2,
          };
        });
        useGameStore.getState().reset();
        useGameStore.getState().setAiWords(resolved);
        loggerInfo(`Memainkan papan bagikan ${code} (${resolved.length} kata)`);
        navigation.navigate("Game" as never);
      } catch (err) {
        loggerError("Gagal memainkan papan bagikan", err);
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
