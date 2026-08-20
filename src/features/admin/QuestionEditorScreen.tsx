import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import type { VocabularyDoc } from "../../data/models/schemas";
import { supabase } from "../../data/sources/supabase";
import { getAiProviderConfig, requestAiRevision } from "../../utils/aiProvider";
import { useAuth } from "../auth/useAuth";
import { play } from "../../utils/sound";
import { solidSurfaceColor, contrastText, textOnPrimary, buttonShadow } from "../../utils/skin";
import { neumorphicShadow } from "../../utils/neumorphic";
import AppModal from "../../presentation/components/common/AppModal";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList, "QuestionEditor">;

const VOCAB_COLUMNS = "word_id, word, clue_1, clue_2, clue_3, tier_level";
const PAGE_SIZE = 50;

export default function QuestionEditorScreen() {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  // ─── State ───
  const [words, setWords] = useState<VocabularyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWord, setSelectedWord] = useState<VocabularyDoc | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editClue1, setEditClue1] = useState("");
  const [editClue2, setEditClue2] = useState("");
  const [editClue3, setEditClue3] = useState("");
  const [editTier, setEditTier] = useState("1");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [page, setPage] = useState(1);

  // ─── Fetch vocabulary ───
  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vocabulary")
        .select(VOCAB_COLUMNS)
        .order("tier_level", { ascending: true })
        .order("word", { ascending: true });
      if (error) throw error;
      setWords((data ?? []) as VocabularyDoc[]);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  // ─── Filter & paginate ───
  const filtered = useMemo(() => {
    if (!search.trim()) return words;
    const q = search.toLowerCase();
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.clue_1.toLowerCase().includes(q) ||
        (w.clue_2 ?? "").toLowerCase().includes(q) ||
        (w.clue_3 ?? "").toLowerCase().includes(q) ||
        String(w.tier_level).includes(q),
    );
  }, [words, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset page on search
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ─── Select word for editing ───
  const handleSelect = useCallback((word: VocabularyDoc) => {
    setSelectedWord(word);
    setEditWord(word.word);
    setEditClue1(word.clue_1);
    setEditClue2(word.clue_2 ?? "");
    setEditClue3(word.clue_3 ?? "");
    setEditTier(String(word.tier_level));
    setSaveMsg("");
    setAiError("");
  }, []);

  // ─── Save changes ───
  const handleSave = useCallback(async () => {
    if (!selectedWord) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const { error } = await supabase
        .from("vocabulary")
        .update({
          word: editWord.trim(),
          clue_1: editClue1.trim(),
          clue_2: editClue2.trim() || null,
          clue_3: editClue3.trim() || null,
          tier_level: parseInt(editTier, 10) || 1,
        })
        .eq("word_id", selectedWord.word_id);
      if (error) throw error;
      setSaveMsg("✅ Berhasil disimpan!");
      // Update local state
      setWords((prev) =>
        prev.map((w) =>
          w.word_id === selectedWord.word_id
            ? {
                ...w,
                word: editWord.trim(),
                clue_1: editClue1.trim(),
                clue_2: editClue2.trim() || undefined,
                clue_3: editClue3.trim() || undefined,
                tier_level: parseInt(editTier, 10) || 1,
              }
            : w,
        ),
      );
    } catch (err: any) {
      setSaveMsg(`❌ Gagal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [selectedWord, editWord, editClue1, editClue2, editClue3, editTier]);

  // ─── AI Revision ───
  const handleAiRevision = useCallback(async () => {
    if (!selectedWord) return;
    setAiLoading(true);
    setAiError("");
    try {
      const config = await getAiProviderConfig();
      if (!config) {
        setAiError("Provider AI belum dikonfigurasi. Silakan atur di Pengaturan → Provider AI.");
        return;
      }
      const revised = await requestAiRevision(config, {
        word: editWord.trim(),
        clue_1: editClue1.trim(),
        clue_2: editClue2.trim() || undefined,
        clue_3: editClue3.trim() || undefined,
        tier_level: parseInt(editTier, 10) || 1,
      });
      if (revised) {
        setEditClue1(revised.clue_1);
        if (revised.clue_2) setEditClue2(revised.clue_2);
        if (revised.clue_3) setEditClue3(revised.clue_3);
        setSaveMsg("🤖 AI merevisi clue. Review & simpan jika sudah sesuai.");
      }
    } catch (err: any) {
      setAiError(err.message || "Gagal merevisi via AI");
    } finally {
      setAiLoading(false);
    }
  }, [selectedWord, editWord, editClue1, editClue2, editClue3, editTier]);

  // ─── Tier badge color ───
  const tierColor = (tier: number) => {
    const colors = ["#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#06B6D4"];
    return colors[Math.min(tier - 1, colors.length - 1)] ?? "#6B7280";
  };

  // ─── Redirect non-admin ───
  if (!user?.isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Text style={{ color: C.text, fontSize: 16 }}>Akses ditolak. Hanya admin yang dapat membuka halaman ini.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.primary, fontSize: 16 }}>← Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenFade style={[styles.root, { backgroundColor: C.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ─── Header ─── */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: solidSurfaceColor(theme) }]}>
          <TouchableOpacity
            onPress={() => {
              play("tap");
              navigation.goBack();
            }}
            style={styles.backBtn}
          >
            <Text style={[styles.backText, { color: C.primary }]}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>📝 Editor Soal</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* ─── Search bar ─── */}
        <View style={[styles.searchWrap, { backgroundColor: solidSurfaceColor(theme), borderColor: C.border }]}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Cari kata, clue, atau tier..."
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ fontSize: 16, color: C.textSecondary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Stats ─── */}
        <Text style={[styles.stats, { color: C.textSecondary }]}>
          {filtered.length} soal ditemukan · Halaman {page}/{totalPages}
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color: C.textSecondary, marginTop: 12 }}>Memuat soal...</Text>
          </View>
        ) : (
          <>
            {/* ─── Word list ─── */}
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
              {paged.map((w) => (
                <TouchableOpacity
                  key={w.word_id}
                  style={[
                    styles.wordCard,
                    {
                      backgroundColor: solidSurfaceColor(theme),
                      borderColor: C.border,
                    },
                    selectedWord?.word_id === w.word_id && { borderColor: C.primary, borderWidth: 2 },
                    ...(theme.shadow ? [neumorphicShadow(theme.shadow)] : []),
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    play("tap");
                    handleSelect(w);
                  }}
                >
                  <View style={styles.wordRow}>
                    <View style={[styles.tierBadge, { backgroundColor: tierColor(w.tier_level) }]}>
                      <Text style={styles.tierText}>T{w.tier_level}</Text>
                    </View>
                    <Text style={[styles.wordText, { color: C.text }]} numberOfLines={1}>
                      {w.word}
                    </Text>
                  </View>
                  <Text style={[styles.cluePreview, { color: C.textSecondary }]} numberOfLines={1}>
                    {w.clue_1}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* ─── Pagination ─── */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    style={[styles.pageBtn, { opacity: page <= 1 ? 0.4 : 1, backgroundColor: C.primary }]}
                  >
                    <Text style={{ color: textOnPrimary(theme), fontWeight: "600" }}>◀ Prev</Text>
                  </TouchableOpacity>
                  <Text style={{ color: C.textSecondary, marginHorizontal: 12 }}>
                    {page} / {totalPages}
                  </Text>
                  <TouchableOpacity
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    style={[styles.pageBtn, { opacity: page >= totalPages ? 0.4 : 1, backgroundColor: C.primary }]}
                  >
                    <Text style={{ color: textOnPrimary(theme), fontWeight: "600" }}>Next ▶</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* ─── Edit Form Modal ─── */}
        <AppModal
          visible={!!selectedWord}
          title="✏️ Edit Soal"
          onClose={() => setSelectedWord(null)}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Word */}
            <Text style={[styles.label, { color: C.text }]}>Kata</Text>
            <TextInput
              style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
              value={editWord}
              onChangeText={setEditWord}
              placeholder="Kata jawaban"
              placeholderTextColor={C.textSecondary}
            />

            {/* Clue 1 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 1 (Utama)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
              value={editClue1}
              onChangeText={setEditClue1}
              placeholder="Definisi utama"
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Clue 2 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 2 (Tambahan)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
              value={editClue2}
              onChangeText={setEditClue2}
              placeholder="Petunjuk tambahan"
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Clue 3 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 3 (Sinonim/Deskripsi)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
              value={editClue3}
              onChangeText={setEditClue3}
              placeholder="Sinonim atau deskripsi lengkap"
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Tier */}
            <Text style={[styles.label, { color: C.text }]}>Tier (1-10)</Text>
            <TextInput
              style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
              value={editTier}
              onChangeText={setEditTier}
              placeholder="1"
              placeholderTextColor={C.textSecondary}
              keyboardType="numeric"
              maxLength={2}
            />

            {/* Save + AI Revision buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.primary }, buttonShadow(theme)]}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={textOnPrimary(theme)} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>💾 Simpan</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.aiBtn, { backgroundColor: C.secondary }, buttonShadow(theme)]}
                activeOpacity={0.8}
                onPress={handleAiRevision}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color={textOnPrimary(theme)} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>🤖 Revisi Via AI</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Messages */}
            {saveMsg ? (
              <Text style={[styles.msg, { color: saveMsg.startsWith("✅") ? "#10B981" : saveMsg.startsWith("❌") ? "#EF4444" : C.primary }]}>
                {saveMsg}
              </Text>
            ) : null}
            {aiError ? <Text style={[styles.msg, { color: "#EF4444" }]}>{aiError}</Text> : null}
          </ScrollView>
        </AppModal>
      </KeyboardAvoidingView>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  stats: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  list: { flex: 1 },
  wordCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  wordRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  tierBadge: {
    width: 28,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  tierText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  wordText: { fontSize: 15, fontWeight: "600", flex: 1 },
  cluePreview: { fontSize: 13, marginLeft: 36 },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBtn: {},
  btnText: { fontSize: 14, fontWeight: "700" },
  msg: { fontSize: 13, marginTop: 10, textAlign: "center" },
});
