import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { loggerWarn } from "../../utils/logger";
import { solidSurfaceColor, contrastText, textOnPrimary, buttonShadow } from "../../utils/skin";
import { neumorphicShadow } from "../../utils/neumorphic";
import AppModal from "../../presentation/components/common/AppModal";
import ScreenFade from "../../presentation/components/common/ScreenFade";

type Nav = NativeStackNavigationProp<RootStackParamList, "QuestionEditor">;

const VOCAB_COLUMNS = "word_id, word, clue_1, clue_2, clue_3, tier_level";
const PAGE_SIZE = 50;

type NotifType = "success" | "error" | "warning" | "info";

interface Notification {
  type: NotifType;
  message: string;
}

const NOTIF_COLORS: Record<NotifType, { bg: string; border: string; text: string }> = {
  success: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
  error: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  warning: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  info: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
};

export default function QuestionEditorScreen() {
  const { theme } = useTheme();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  // ─── State ───
  const [words, setWords] = useState<VocabularyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWords, setTotalWords] = useState(0);
  const [selectedWord, setSelectedWord] = useState<VocabularyDoc | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editClue1, setEditClue1] = useState("");
  const [editClue2, setEditClue2] = useState("");
  const [editClue3, setEditClue3] = useState("");
  const [editTier, setEditTier] = useState("1");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // ─── PLAN-084: Automasi revisi via AI ───
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProcessed, setAutoProcessed] = useState(0);
  /** Flag stop — dibaca antar iterasi loop agar responsif tanpa re-render. */
  const autoStopRef = useRef(false);
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState("");

  // ─── PLAN-078: Tambah Soal (+) ───
  const [addVisible, setAddVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newClue1, setNewClue1] = useState("");
  const [newClue2, setNewClue2] = useState("");
  const [newClue3, setNewClue3] = useState("");
  const [newTier, setNewTier] = useState("1");

  // ─── PLAN-079: Filter collapsible (kata + tier) ───
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterWord, setFilterWord] = useState("");
  const [filterTier, setFilterTier] = useState("0"); // "0" = semua tier
  const activeFilters = (filterWord.trim() ? 1 : 0) + (filterTier !== "0" ? 1 : 0);
  // ─── Fetch vocabulary (PLAN-081: paging di SERVER) ───
  // Tiap halaman UI hanya menarik PAGE_SIZE baris via .range() + count exact.
  // Filter kata/tikor dikirim sebagai klausa query (ilike/eq), bukan difilter
  // di client. Ini menggantikan pendekatan "tarik semua ±10.000 baris" yang
  // membuat load awal sangat lambat.
  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vocabulary")
        .select(VOCAB_COLUMNS, { count: "exact" })
        .order("tier_level", { ascending: true })
        .order("word", { ascending: true });
      const fw = filterWord.trim();
      if (fw) query = query.ilike("word", `%${fw}%`);
      if (filterTier !== "0") query = query.eq("tier_level", parseInt(filterTier, 10));
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      setWords((data ?? []) as VocabularyDoc[]);
      setTotalWords(count ?? 0);
    } catch (err) {
      loggerWarn("Gagal mengambil daftar vocabulary", err);
      setWords([]);
      setTotalWords(0);
    } finally {
      setLoading(false);
    }
  }, [page, filterWord, filterTier]);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  // Reset ke halaman 1 saat filter berubah.
  useEffect(() => {
    setPage(1);
  }, [filterWord, filterTier]);

  const totalPages = Math.max(1, Math.ceil(totalWords / PAGE_SIZE));
  // Server sudah mengirim tepat halaman aktif — tidak perlu slicing lagi.
  const paged = words;

  // ─── PLAN-078: Tambah soal baru via RPC insert_vocabulary_admin ───
  const handleAdd = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (!word || !newClue1.trim()) {
      setNotification({ type: "warning", message: "⚠️ Kata dan Clue 1 wajib diisi." });
      return;
    }
    setAdding(true);
    setNotification(null);
    try {
      const { data, error } = await supabase.rpc("insert_vocabulary_admin", {
        p_word: word,
        p_clue_1: newClue1.trim(),
        p_clue_2: newClue2.trim(),
        p_clue_3: newClue3.trim(),
        p_tier_level: parseInt(newTier, 10) || 1,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; message?: string; word_id?: string };
      if (!result?.ok) throw new Error(result?.error ?? "Gagal menambah soal");
      const created: VocabularyDoc = {
        word_id: result.word_id ?? `admin-${Date.now()}`,
        word,
        clue_1: newClue1.trim(),
        clue_2: newClue2.trim() || undefined,
        clue_3: newClue3.trim() || undefined,
        tier_level: parseInt(newTier, 10) || 1,
        created_at: new Date().toISOString(),
      };
      // Sisipkan ke daftar lokal (urut tier sudah terjaga karena tier sama
      // dikelompokkan — tampilkan paling atas tier-nya saja).
      setWords((prev) => [created, ...prev]);
      setNotification({ type: "success", message: `✅ ${result.message ?? "Soal berhasil ditambahkan!"}` });
      setAddVisible(false);
      setNewWord("");
      setNewClue1("");
      setNewClue2("");
      setNewClue3("");
      setNewTier("1");
    } catch (err: any) {
      setNotification({ type: "error", message: `❌ Gagal: ${err.message}` });
    } finally {
      setAdding(false);
    }
  }, [newWord, newClue1, newClue2, newClue3, newTier]);

  // ─── PLAN-081: Bantuan AI di modal Tambah Soal — buatkan/perbaiki clue ───
  const handleAddAi = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) {
      setNotification({ type: "warning", message: "⚠️ Isi dulu kata jawaban, lalu tekan Bantuan AI." });
      return;
    }
    setAiLoading(true);
    setNotification(null);
    try {
      const config = await getAiProviderConfig();
      if (!config) {
        setNotification({
          type: "error",
          message: "Provider AI belum dikonfigurasi. Silakan atur di Pengaturan → Provider AI.",
        });
        return;
      }
      const revised = await requestAiRevision(config, {
        word,
        // Kalau clue masih kosong, minta AI membuatkan dari nol.
        clue_1: newClue1.trim() || "(belum ada — buatkan clue yang baik untuk kata ini)",
        clue_2: newClue2.trim() || undefined,
        clue_3: newClue3.trim() || undefined,
        tier_level: parseInt(newTier, 10) || 1,
      });
      if (revised) {
        setNewClue1(revised.clue_1);
        setNewClue2(revised.clue_2 ?? "");
        setNewClue3(revised.clue_3 ?? "");
        if (revised.leaks && revised.leaks.length > 0) {
          setNotification({
            type: "warning",
            message: `⚠️ AI mengisi clue, tapi ${revised.leaks.join(", ")} masih bocor. Silakan perbaiki manual.`,
          });
        } else {
          setNotification({ type: "info", message: "🤖 Clue dibantu AI. Review & simpan jika sudah sesuai." });
        }
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Gagal meminta bantuan AI" });
    } finally {
      setAiLoading(false);
    }
  }, [newWord, newClue1, newClue2, newClue3, newTier]);

  // ─── Current index in current page (for prev/next) ───
  const currentIdx = useMemo(() => {
    if (!selectedWord) return -1;
    return words.findIndex((w) => w.word_id === selectedWord.word_id);
  }, [words, selectedWord]);

  // ─── Select word for editing ───
  const handleSelect = useCallback((word: VocabularyDoc) => {
    setSelectedWord(word);
    setEditWord(word.word);
    setEditClue1(word.clue_1);
    setEditClue2(word.clue_2 ?? "");
    setEditClue3(word.clue_3 ?? "");
    setEditTier(String(word.tier_level));
    setNotification(null);
  }, []);

  // ─── Navigate to word at given index ───
  const navigateToWord = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= words.length) return;
      const w = words[idx];
      setSelectedWord(w);
      setEditWord(w.word);
      setEditClue1(w.clue_1);
      setEditClue2(w.clue_2 ?? "");
      setEditClue3(w.clue_3 ?? "");
      setEditTier(String(w.tier_level));
      setNotification(null);
    },
    [words],
  );

  // ─── Save changes via RPC ───
  const handleSave = useCallback(async () => {
    if (!selectedWord) return;
    setSaving(true);
    setNotification(null);
    try {
      const { data, error } = await supabase.rpc("update_vocabulary_admin", {
        p_word_id: selectedWord.word_id,
        p_word: editWord.trim(),
        p_clue_1: editClue1.trim(),
        p_clue_2: editClue2.trim(),
        p_clue_3: editClue3.trim(),
        p_tier_level: parseInt(editTier, 10) || 1,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; message?: string };
      if (!result?.ok) throw new Error(result?.error ?? "Gagal menyimpan");
      setNotification({ type: "success", message: `✅ ${result.message ?? "Berhasil disimpan!"}` });
      // Update local state — tanpa re-fetch dari database
      const updated = {
        ...selectedWord,
        word: editWord.trim(),
        clue_1: editClue1.trim(),
        clue_2: editClue2.trim() || undefined,
        clue_3: editClue3.trim() || undefined,
        tier_level: parseInt(editTier, 10) || 1,
      };
      setWords((prev) => prev.map((w) => (w.word_id === selectedWord.word_id ? updated : w)));
      setSelectedWord(updated);
    } catch (err: any) {
      setNotification({ type: "error", message: `❌ Gagal: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }, [selectedWord, editWord, editClue1, editClue2, editClue3, editTier]);

  // ─── AI Revision ───
  const handleAiRevision = useCallback(async () => {
    if (!selectedWord) return;
    setAiLoading(true);
    setNotification(null);
    try {
      const config = await getAiProviderConfig();
      if (!config) {
        setNotification({
          type: "error",
          message: "Provider AI belum dikonfigurasi. Silakan atur di Pengaturan → Provider AI.",
        });
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
        if (revised.leaks && revised.leaks.length > 0) {
          setNotification({
            type: "warning",
            message: `⚠️ AI merevisi clue, tapi ${revised.leaks.join(", ")} masih bocor. Silakan perbaiki manual.`,
          });
        } else {
          setNotification({ type: "info", message: "🤖 AI merevisi clue. Review & simpan jika sudah sesuai." });
        }
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Gagal merevisi via AI" });
    } finally {
      setAiLoading(false);
    }
  }, [selectedWord, editWord, editClue1, editClue2, editClue3, editTier]);

  // ─── PLAN-084: Automasi revisi via AI (revisi → cek bocor → simpan → next) ───
  /** Cek anti-bocor manual: kata jawaban tidak boleh muncul di clue. */
  const clueLeaks = (word: string, clues: (string | undefined)[]): string[] => {
    const w = word.trim().toLowerCase();
    if (!w) return [];
    return clues.filter((c) => c && c.toLowerCase().includes(w)) as string[];
  };

  const toggleAutoRevision = useCallback(async () => {
    if (autoRunning) {
      // Tekan lagi = hentikan setelah iterasi berjalan selesai.
      autoStopRef.current = true;
      setNotification({ type: "info", message: "⏹ Menghentikan automasi…" });
      return;
    }
    if (!selectedWord) return;
    const config = await getAiProviderConfig();
    if (!config) {
      setNotification({
        type: "error",
        message: "Provider AI belum dikonfigurasi. Silakan atur di Pengaturan → Provider AI.",
      });
      return;
    }

    const list = words; // snapshot halaman aktif
    const startIdx = list.findIndex((w) => w.word_id === selectedWord.word_id);
    if (startIdx < 0) return;

    setAutoRunning(true);
    setAutoProcessed(0);
    autoStopRef.current = false;

    let processed = 0;
    let consecutiveErrors = 0;
    let stopReason = "";

    try {
      for (let i = startIdx; i < list.length; i++) {
        if (autoStopRef.current) {
          stopReason = "dihentikan manual";
          break;
        }
        const w = list[i];
        // Tampilkan soal aktif di form supaya user melihat progres.
        navigateToWord(i);

        // 1) Revisi via AI
        let revised: Awaited<ReturnType<typeof requestAiRevision>>;
        try {
          revised = await requestAiRevision(config, {
            word: w.word,
            clue_1: w.clue_1,
            clue_2: w.clue_2,
            clue_3: w.clue_3,
            tier_level: w.tier_level,
          });
        } catch (err) {
          loggerWarn("Automasi AI: gagal revisi", err);
          consecutiveErrors += 1;
          if (consecutiveErrors >= 3) {
            stopReason = "3 error AI beruntun";
            break;
          }
          continue;
        }
        if (autoStopRef.current) {
          stopReason = "dihentikan manual";
          break;
        }
        consecutiveErrors = 0;

        // 2) STOP kalau bocor — hasil bocor TIDAK disimpan.
        const aiLeaks = revised?.leaks ?? [];
        const manualLeaks = revised ? clueLeaks(w.word, [revised.clue_1, revised.clue_2, revised.clue_3]) : [];
        if (aiLeaks.length > 0 || manualLeaks.length > 0) {
          const allLeaks = [...new Set([...aiLeaks, ...manualLeaks])];
          setEditClue1(revised?.clue_1 ?? w.clue_1);
          if (revised?.clue_2) setEditClue2(revised.clue_2);
          if (revised?.clue_3) setEditClue3(revised.clue_3);
          stopReason = `hasil AI bocor (${allLeaks.join(", ")}) — tidak disimpan`;
          break;
        }
        if (!revised) {
          stopReason = "AI tidak mengembalikan hasil";
          break;
        }

        // 3) Simpan langsung via RPC
        const { data, error } = await supabase.rpc("update_vocabulary_admin", {
          p_word_id: w.word_id,
          p_word: w.word,
          p_clue_1: revised.clue_1.trim(),
          p_clue_2: revised.clue_2?.trim() ?? "",
          p_clue_3: revised.clue_3?.trim() ?? "",
          p_tier_level: w.tier_level,
        });
        if (error) throw error;
        const result = data as { ok: boolean; error?: string };
        if (!result?.ok) throw new Error(result?.error ?? "Gagal menyimpan");

        // Sinkronkan state lokal (tanpa re-fetch)
        const updated: VocabularyDoc = {
          ...w,
          clue_1: revised.clue_1.trim(),
          clue_2: revised.clue_2?.trim() || undefined,
          clue_3: revised.clue_3?.trim() || undefined,
        };
        setWords((prev) => prev.map((x) => (x.word_id === w.word_id ? updated : x)));
        processed += 1;
        setAutoProcessed(processed);
        // 4) Next → iterasi berikutnya (loop)
      }
      if (!stopReason) stopReason = "halaman selesai";
      setNotification({
        type: processed > 0 ? "success" : "warning",
        message: `⚡ Automasi berhenti (${stopReason}). ${processed} soal direvisi & tersimpan.`,
      });
    } catch (err: any) {
      loggerWarn("Automasi AI: gagal", err);
      setNotification({
        type: "error",
        message: `❌ Automasi berhenti: ${err.message} (${processed} soal tersimpan).`,
      });
    } finally {
      setAutoRunning(false);
    }
  }, [autoRunning, selectedWord, words, navigateToWord]);

  // ─── Tier badge color ───
  const tierColor = (tier: number) => {
    const colors = [
      "#6B7280",
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#06B6D4",
    ];
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

  const notif = notification ? NOTIF_COLORS[notification.type] : null;

  return (
    <ScreenFade style={[styles.root, { backgroundColor: C.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
          {/* PLAN-078: tombol Tambah Soal */}
          <TouchableOpacity
            onPress={() => {
              play("tap");
              setNotification(null);
              setAddVisible(true);
            }}
            style={[styles.addBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, { color: textOnPrimary(theme) }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* ─── PLAN-079: Filter collapsible (kata + tier) ─── */}
        <View style={[styles.filterWrap, { borderColor: C.border, backgroundColor: solidSurfaceColor(theme) }]}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => {
              play("tap");
              setFilterOpen((v) => !v);
            }}
          >
            <Text style={{ fontSize: 15, marginRight: 6 }}>⚙️</Text>
            <Text style={[styles.filterToggleText, { color: C.text }]}>Filter</Text>
            {activeFilters > 0 && (
              <View style={[styles.filterCountBadge, { backgroundColor: C.primary }]}>
                <Text style={{ color: textOnPrimary(theme), fontSize: 10, fontWeight: "700" }}>{activeFilters}</Text>
              </View>
            )}
            <Text style={{ color: C.textSecondary, marginLeft: "auto", fontSize: 13 }}>{filterOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {filterOpen && (
            <View style={styles.filterBody}>
              <Text style={[styles.label, { color: C.text }]}>Filter Kata</Text>
              <View onStartShouldSetResponder={() => true}>
                <TextInput
                  style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                  placeholder="Hanya kata yang mengandung..."
                  placeholderTextColor={C.textSecondary}
                  value={filterWord}
                  onChangeText={setFilterWord}
                  autoCapitalize="none"
                />
              </View>
              <Text style={[styles.label, { color: C.text }]}>Filter Tier</Text>
              <View style={styles.tierChips}>
                {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((t) => {
                  const active = filterTier === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        play("tap");
                        setFilterTier(t);
                      }}
                      style={[
                        styles.tierChip,
                        {
                          backgroundColor: active ? C.primary : C.surface,
                          borderColor: active ? C.primary : C.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? textOnPrimary(theme) : C.textSecondary,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {t === "0" ? "Semua" : `T${t}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {activeFilters > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    play("tap");
                    setFilterWord("");
                    setFilterTier("0");
                  }}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ color: C.primary, fontSize: 13, fontWeight: "600" }}>✕ Reset filter</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ─── Stats ─── */}
        <Text style={[styles.stats, { color: C.textSecondary }]}>
          {totalWords} soal ditemukan · Halaman {page}/{totalPages}
        </Text>

        {/* ─── Top Pagination ─── */}
        {totalPages > 1 && (
          <View style={[styles.pagination, { marginBottom: 8 }]}>
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, { opacity: page <= 1 ? 0.4 : 1, backgroundColor: C.primary }]}
            >
              <Text style={{ color: textOnPrimary(theme), fontWeight: "600" }}>◀ Prev</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.jumpInput, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
              keyboardType="numeric"
              placeholder={`1-${totalPages}`}
              placeholderTextColor={C.textSecondary}
              value={jumpValue}
              onChangeText={setJumpValue}
              onSubmitEditing={() => {
                const num = parseInt(jumpValue, 10);
                if (!isNaN(num) && num >= 1 && num <= totalPages) {
                  setPage(num);
                }
                setJumpValue("");
              }}
              returnKeyType="go"
            />
            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, { opacity: page >= totalPages ? 0.4 : 1, backgroundColor: C.primary }]}
            >
              <Text style={{ color: textOnPrimary(theme), fontWeight: "600" }}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* ─── PLAN-078: Add Form Modal ─── */}
        <AppModal visible={addVisible} title="➕ Tambah Soal" onClose={() => setAddVisible(false)}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {notification && notif && (
              <View style={[styles.notifBlock, { backgroundColor: notif.bg, borderColor: notif.border }]}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: notif.text }}>{notification.message}</Text>
              </View>
            )}

            {/* Word */}
            <Text style={[styles.label, { color: C.text }]}>Kata</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                value={newWord}
                onChangeText={setNewWord}
                placeholder="Kata jawaban (a-z, 3-10 huruf)"
                placeholderTextColor={C.textSecondary}
                autoCapitalize="none"
              />
            </View>

            {/* Clue 1 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 1 (Utama)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={newClue1}
                onChangeText={setNewClue1}
                placeholder="Definisi utama"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Clue 2 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 2 (Tambahan, opsional)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={newClue2}
                onChangeText={setNewClue2}
                placeholder="Petunjuk tambahan"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Clue 3 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 3 (Sinonim/Deskripsi, opsional)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={newClue3}
                onChangeText={setNewClue3}
                placeholder="Sinonim atau deskripsi lengkap"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Tier */}
            <Text style={[styles.label, { color: C.text }]}>Tier (1-10)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                value={newTier}
                onChangeText={setNewTier}
                placeholder="1"
                placeholderTextColor={C.textSecondary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.primary }, buttonShadow(theme)]}
                activeOpacity={0.8}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={textOnPrimary(theme)} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>💾 Simpan Soal</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.aiBtn, { backgroundColor: C.secondary }, buttonShadow(theme)]}
                activeOpacity={0.8}
                onPress={handleAddAi}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color={textOnPrimary(theme)} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>🤖 Revisi Via AI</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </AppModal>

        {/* ─── Edit Form Modal ─── */}
        <AppModal
          visible={!!selectedWord}
          title="✏️ Edit Soal"
          onClose={() => {
            // Tutup modal = hentikan automasi yang sedang berjalan (PLAN-084).
            if (autoRunning) autoStopRef.current = true;
            setSelectedWord(null);
          }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* ─── Prev / Next navigation ─── */}
            {currentIdx >= 0 && (
              <View style={styles.navRow}>
                <TouchableOpacity
                  disabled={currentIdx <= 0}
                  onPress={() => navigateToWord(currentIdx - 1)}
                  style={[
                    styles.navBtn,
                    { opacity: currentIdx <= 0 ? 0.3 : 1, backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <Text style={{ color: C.text, fontWeight: "600" }}>◀ Prev</Text>
                </TouchableOpacity>
                <Text style={{ color: C.textSecondary, fontSize: 12 }}>
                  {currentIdx + 1} / {words.length}
                </Text>
                <TouchableOpacity
                  disabled={currentIdx >= words.length - 1}
                  onPress={() => navigateToWord(currentIdx + 1)}
                  style={[
                    styles.navBtn,
                    {
                      opacity: currentIdx >= words.length - 1 ? 0.3 : 1,
                      backgroundColor: C.surface,
                      borderColor: C.border,
                    },
                  ]}
                >
                  <Text style={{ color: C.text, fontWeight: "600" }}>Next ▶</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ─── Notification Block ─── */}
            {notification && notif && (
              <View style={[styles.notifBlock, { backgroundColor: notif.bg, borderColor: notif.border }]}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: notif.text }}>{notification.message}</Text>
              </View>
            )}

            {/* Word */}
            <Text style={[styles.label, { color: C.text }]}>Kata</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                value={editWord}
                onChangeText={setEditWord}
                placeholder="Kata jawaban"
                placeholderTextColor={C.textSecondary}
              />
            </View>

            {/* Clue 1 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 1 (Utama)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={editClue1}
                onChangeText={setEditClue1}
                placeholder="Definisi utama"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Clue 2 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 2 (Tambahan)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={editClue2}
                onChangeText={setEditClue2}
                placeholder="Petunjuk tambahan"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Clue 3 */}
            <Text style={[styles.label, { color: C.text }]}>Clue 3 (Sinonim/Deskripsi)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: C.text, backgroundColor: C.surface, borderColor: C.border },
                ]}
                value={editClue3}
                onChangeText={setEditClue3}
                placeholder="Sinonim atau deskripsi lengkap"
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Tier */}
            <Text style={[styles.label, { color: C.text }]}>Tier (1-10)</Text>
            <View onStartShouldSetResponder={() => true}>
              <TextInput
                style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                value={editTier}
                onChangeText={setEditTier}
                placeholder="1"
                placeholderTextColor={C.textSecondary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

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
                disabled={aiLoading || autoRunning}
              >
                {aiLoading ? (
                  <ActivityIndicator color={textOnPrimary(theme)} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>🤖 Revisi Via AI</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* ─── PLAN-084: Automasi revisi via AI ─── */}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.aiBtn,
                { backgroundColor: autoRunning ? "#EF4444" : C.secondary },
                buttonShadow(theme),
              ]}
              activeOpacity={0.8}
              onPress={() => void toggleAutoRevision()}
            >
              <Text style={[styles.btnText, { color: textOnPrimary(theme) }]}>
                {autoRunning ? `⏹ Hentikan Automasi (${autoProcessed} tersimpan)` : "⚡ Automasi Revisi AI"}
              </Text>
            </TouchableOpacity>
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
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  filterWrap: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterToggleText: { fontSize: 14, fontWeight: "600" },
  filterCountBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  filterBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  tierChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
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
  jumpInput: {
    width: 50,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 4,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
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
  notifBlock: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
});
