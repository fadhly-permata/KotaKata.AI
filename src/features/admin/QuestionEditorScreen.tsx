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
import {
  getAiProviderConfig,
  requestAiRevision,
  type AiStreamCallback,
} from "../../utils/aiProvider";
import { useAuth } from "../auth/useAuth";
import { play } from "../../utils/sound";
import { loggerError, loggerInfo, loggerWarn } from "../../utils/logger";
import { aiPhaseLabel, useAiThinking, type AiPhase } from "../../utils/aiStatus";

/** PLAN-108 revisi UI: strip streaming thinking DI DALAM modal form (bukan
 *  halaman daftar) supaya terbaca jelas saat AI sedang merevisi soal. */
function AiThinkingStrip({ phase, elapsed, tail, textColor, bg }: {
  phase: AiPhase;
  elapsed: number;
  tail: string;
  textColor: string;
  bg: string;
}) {
  if (!phase) return null;
  return (
    <View
      style={{
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: bg,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12 }}>
        {aiPhaseLabel(phase, elapsed)} ({elapsed} dtk)
      </Text>
      {tail.length > 0 && (
        <Text numberOfLines={4} style={{ color: textColor, fontSize: 11, fontStyle: "italic", marginTop: 2 }}>
          {tail}
        </Text>
      )}
    </View>
  );
}
import { solidSurfaceColor, contrastText, textOnPrimary, buttonShadow } from "../../utils/skin";
import { neumorphicShadow } from "../../utils/neumorphic";
import AppModal from "../../presentation/components/common/AppModal";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
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
  // ─── Revisi urgent: streaming thinking ala aplikasi chat AI — kalimat utuh
  // mengalir sesuai keadaan model, bukan potongan acak yang terlihat absurd.
  const aiThink = useAiThinking();
  const makeOnThinking = useCallback(() => aiThink.onDelta, [aiThink.onDelta]);
  /** Format durasi singkat: "42 dtk" / "3m 15dtk". */
  const fmtDur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}dtk` : `${s} dtk`);
  const [notification, setNotification] = useState<Notification | null>(null);

  // ─── PLAN-084: Automasi revisi via AI ───
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProcessed, setAutoProcessed] = useState(0);
  /** Flag stop — dibaca antar iterasi loop agar responsif tanpa re-render. */
  const autoStopRef = useRef(false);
  // ─── PLAN-090: Automasi bulk seluruh soal per page (tombol header) ───
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  /** Fokus daftar: id soal yang SEDANG direvisi — kartu di-highlight & daftar
   *  otomatis scroll ke kartu itu supaya user tahu persis progresnya. */
  const [bulkFocusId, setBulkFocusId] = useState<string | null>(null);
  const listScrollRef = useRef<ScrollView | null>(null);
  /** Posisi-Y tiap kartu soal (dari onLayout) untuk scrollToIndex manual. */
  const cardYRef = useRef<Map<string, number>>(new Map());
  /** ── Stop/Pause automasi bulk ──
   *  Stop & pause baru BERLAKU setelah soal yang sedang direvisi selesai
   *  (request AI tidak bisa dipaksa putus di tengah tanpa membuang hasil).
   *  Flag ref dipakai loop antar iterasi; state utk tampilan tombol/banner. */
  const bulkPauseRef = useRef(false);
  const [bulkPaused, setBulkPaused] = useState(false);
  /** Controller request AI yang sedang berjalan — di-abort langsung saat Stop
   *  ditekan supaya stop terasa INSTAN (hasil soal aktif dibuang). */
  const bulkAbortRef = useRef<AbortController | null>(null);
  /** Flag retry manual (🔁): buang request AI yang sedang berjalan & mulai
   *  ulang SOAL YANG SAMA dari awal — hitungan gagal per soal ikut direset. */
  const bulkRetryRef = useRef(false);
  // ─── Revisi urgent: progress bar REAL per page (reset tiap page baru) ───
  // Fase terukur: ambil soal (2–10%) → kirim ke AI (10–50%) → menyimpan
  // (50–95% sesuai jumlah item tersimpan) → selesai page (100%).
  const [bulkPct, setBulkPct] = useState(0);
  // ── Revisi: dua timer — waktu page aktif (reset tiap pindah page) & total run.
  const [bulkPageSec, setBulkPageSec] = useState(0);
  const [bulkTotalSec, setBulkTotalSec] = useState(0);
  useEffect(() => {
    if (!bulkRunning) return;
    const iv = setInterval(() => {
      setBulkTotalSec((s) => s + 1);
      setBulkPageSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [bulkRunning]);
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
  // Query dasar vocabulary — dipakai fetchWords (UI) & automasi bulk (PLAN-090).
  const buildVocabQuery = useCallback(() => {
    let q = supabase
      .from("vocabulary")
      .select(VOCAB_COLUMNS, { count: "exact" })
      .order("tier_level", { ascending: true })
      .order("word", { ascending: true });
    const fw = filterWord.trim();
    if (fw) q = q.ilike("word", `%${fw}%`);
    if (filterTier !== "0") q = q.eq("tier_level", parseInt(filterTier, 10));
    return q;
  }, [filterWord, filterTier]);
  const fetchWords = useCallback(async (targetPage?: number) => {
    setLoading(true);
    try {
      // PLAN-091 revisi: boleh minta halaman eksplisit — dipakai automasi bulk
      // untuk refresh daftar di HALAMAN TERAKHIR yang diproses (bukan halaman
      // tempat tombol ditekan — penyebab bug "kelihatan tidak ada yang direvisi").
      const activePage = targetPage ?? page;
      const from = (activePage - 1) * PAGE_SIZE;
      const { data, error, count } = await buildVocabQuery().range(from, from + PAGE_SIZE - 1);
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
  }, [page, buildVocabQuery]);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  // Reset ke halaman 1 saat filter berubah.
  useEffect(() => {
    setPage(1);
  }, [filterWord, filterTier]);

  // ─── PLAN-094: popup konfirmasi stop 5 detik antar page bulk ───
  const [pauseVisible, setPauseVisible] = useState(false);
  const [pauseSeconds, setPauseSeconds] = useState(5);
  const pauseResolverRef = useRef<((stop: boolean) => void) | null>(null);

  /** Tampilkan popup 5 detik; resolve `true` = user minta stop, `false` = lanjut. */
  const requestPauseConfirmation = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        setPauseSeconds(5);
        setPauseVisible(true);
        pauseResolverRef.current = (stop) => {
          pauseResolverRef.current = null;
          setPauseVisible(false);
          resolve(stop);
        };
      }),
    [],
  );

  // Hitung mundur saat popup tampil.
  useEffect(() => {
    if (!pauseVisible) return;
    const iv = setInterval(() => {
      setPauseSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [pauseVisible]);

  // Waktu habis tanpa aksi → lanjutkan automasi (bukan stop).
  useEffect(() => {
    if (pauseVisible && pauseSeconds === 0) {
      pauseResolverRef.current?.(false);
    }
  }, [pauseSeconds, pauseVisible]);

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
    aiThink.reset(); // timer mulai dari 0 untuk run ini
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
      const revised = await requestAiRevision(
        config,
        {
          word,
          // Kalau clue masih kosong, minta AI membuatkan dari nol.
          clue_1: newClue1.trim() || "(belum ada — buatkan clue yang baik untuk kata ini)",
          clue_2: newClue2.trim() || undefined,
          clue_3: newClue3.trim() || undefined,
          tier_level: parseInt(newTier, 10) || 1,
        },
        undefined,
        { onThinking: makeOnThinking() },
      );
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
      aiThink.reset(); // reset timer thinking — jangan bawa hitungan run sebelumnya
      setAiLoading(false);
    }
  }, [newWord, newClue1, newClue2, newClue3, newTier, aiThink]);

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
    aiThink.reset(); // timer mulai dari 0 untuk run ini
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
      const revised = await requestAiRevision(
        config,
        {
          word: editWord.trim(),
          clue_1: editClue1.trim(),
          clue_2: editClue2.trim() || undefined,
          clue_3: editClue3.trim() || undefined,
          tier_level: parseInt(editTier, 10) || 1,
        },
        undefined,
        { onThinking: makeOnThinking() },
      );
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
      aiThink.reset(); // reset timer thinking — jangan bawa hitungan run sebelumnya
      setAiLoading(false);
    }
  }, [selectedWord, editWord, editClue1, editClue2, editClue3, editTier, aiThink]);

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
    if (bulkRunning) return; // jangan dobel jalan bersama automasi bulk
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
        // Timer thinking di-reset per soal — tiap kata dapat hitungan sendiri.
        aiThink.reset();

        // 1) Revisi via AI
        let revised: Awaited<ReturnType<typeof requestAiRevision>>;
        try {
          revised = await requestAiRevision(
            config,
            {
              word: w.word,
              clue_1: w.clue_1,
              clue_2: w.clue_2,
              clue_3: w.clue_3,
              tier_level: w.tier_level,
            },
            undefined,
            { onThinking: makeOnThinking() },
          );
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
        // Jeda antar iterasi — provider lambat (deepseek-v4-flash dll.) butuh
        // waktu agar request berikutnya tidak ditolak/race. (PLAN-089)
        await new Promise((r) => setTimeout(r, 2_000));
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
      aiThink.reset(); // reset timer thinking automasi per-soal (PLAN-108 revisi)
      setAutoRunning(false);
    }
  }, [autoRunning, selectedWord, words, navigateToWord, bulkRunning, aiThink]);

  // ─── Automasi bulk — SATU soal = SATU request AI + simpan langsung.
  // Sebelumnya batch per-page sering macet di provider reasoning dan seluruh
  // halaman harus diulang. Sekarang: macet/error hanya mengulang SOAL ITU
  // (retry di soal yang sama), gagal berulang → stop total. Tombol header
  // jadi ⏹ Stop saat berjalan.
  const BULK_MAX_TOKENS = 200_000;
  /** Retry maksimum per soal (di soal yang SAMA) sebelum stop total. */
  const BULK_WORD_RETRIES = 3;
  /** Batas waktu satu request AI — lebih lama dianggap macet → abort. */
  const WORD_TIMEOUT_MS = 150_000;
  const toggleBulkAutomation = useCallback(async () => {
    if (bulkRunning) {
      autoStopRef.current = true;
      // Langsung buang request yang sedang berjalan — stop terasa instan,
      // tanpa teks penjelasan tambahan.
      bulkAbortRef.current?.abort();
      return;
    }
    if (autoRunning) return;
    const config = await getAiProviderConfig();
    if (!config) {
      setNotification({
        type: "error",
        message: "Provider AI belum dikonfigurasi. Silakan atur di Pengaturan → Provider AI.",
      });
      return;
    }

    setBulkRunning(true);
    autoStopRef.current = false;
    bulkPauseRef.current = false;
    setBulkPaused(false);
    setBulkPageSec(0);
    setBulkTotalSec(0);

    let processed = 0;
    let stopReason = "";
    /** Halaman terakhir yang benar-benar diproses — dipakai refresh daftar di
     *  finally supaya UI tidak menampilkan halaman lama yang belum direvisi. */
    let lastProcessedPage = page;
    /** Soal bocor / gagal — dilaporkan di notifikasi akhir, tidak disimpan. */
    const finalLeaks: string[] = [];
    const lastPage = Math.max(totalPages, page);

    try {
      for (let p = page; p <= lastPage; p++) {
        if (autoStopRef.current) {
          stopReason = "dihentikan manual";
          break;
        }
        // Ambil isi halaman ini langsung dari server (filter aktif ikut).
        // Timer page & strip thinking direset tiap page baru.
        lastProcessedPage = p;
        setPage(p);
        setBulkPageSec(0);
        aiThink.reset();
        setBulkPct(2);
        setBulkStatus(`Page ${p}/${lastPage} · mengambil ${PAGE_SIZE} soal…`);
        const from = (p - 1) * PAGE_SIZE;
        const { data, error } = await buildVocabQuery().range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const list = (data ?? []) as VocabularyDoc[];
        if (list.length === 0) {
          stopReason = "halaman kosong";
          break;
        }

        // ── SATU SOAL = SATU request AI + simpan langsung. Kalau provider
        // macet/error, yang diulang cuma soal itu (retry di soal yang sama),
        // bukan seluruh halaman. Gagal berulang → stop total.
        for (let i = 0; i < list.length; i++) {
          if (autoStopRef.current) {
            stopReason = "dihentikan manual";
            break;
          }
          // ── Pause: tunggu di sini sampai user menekan Lanjut. Berlaku di
          // ANTARA soal — soal yang sedang berjalan tetap diselesaikan dulu.
          while (bulkPauseRef.current && !autoStopRef.current) {
            setBulkStatus(
              `⏸ DIJEDA — tekan ▶️ Lanjut di header untuk melanjutkan (soal berikutnya: ${i + 1}/${list.length})`,
            );
            await new Promise((r) => setTimeout(r, 500));
          }
          if (autoStopRef.current) {
            stopReason = "dihentikan manual";
            break;
          }
          const w = list[i];
          // Info jelas: soal mana yang SEDANG direvisi + berapa yang selesai.
          setBulkStatus(
            `Page ${p}/${lastPage} · revisi "${w.word}" — soal ${i + 1}/${list.length} (${processed} tersimpan)`,
          );
          // Fokuskan daftar: highlight kartu soal ini & scroll ke situ.
          setBulkFocusId(w.word_id);
          const cardY = cardYRef.current.get(w.word_id);
          if (cardY !== undefined) {
            listScrollRef.current?.scrollTo({ y: Math.max(0, cardY - 80), animated: true });
          }

          let revised: Awaited<ReturnType<typeof requestAiRevision>> | undefined;
          // Retry manual berlaku per-soal — flag dibersihkan di awal soal baru.
          bulkRetryRef.current = false;
          let attempt = 0;
          while (true) {
            if (autoStopRef.current) break;
            // ── Retry manual (🔁): mulai ulang SOAL YANG SAMA — hitungan gagal
            // direset supaya user bisa terus mencoba tanpa menghabiskan jatah.
            if (bulkRetryRef.current) {
              bulkRetryRef.current = false;
              attempt = 0;
              loggerInfo(`Automasi bulk: retry manual "${w.word}" — request sebelumnya dibuang`);
              setBulkStatus(
                `Page ${p}/${lastPage} · 🔁 retry manual "${w.word}" — soal ${i + 1}/${list.length}`,
              );
            }
            attempt++;
            aiThink.reset(); // tiap percobaan punya hitungan thinking sendiri
            const ac = new AbortController();
            bulkAbortRef.current = ac;
            const timeoutId = setTimeout(() => ac.abort(), WORD_TIMEOUT_MS);
            try {
              revised = await requestAiRevision(
                config,
                {
                  word: w.word,
                  clue_1: w.clue_1,
                  clue_2: w.clue_2,
                  clue_3: w.clue_3,
                  tier_level: w.tier_level,
                },
                ac.signal,
                { maxCompletionTokens: BULK_MAX_TOKENS, onThinking: makeOnThinking() },
              );
              break;
            } catch (err: any) {
              // Tombol 🔁 ditekan saat request ini berjalan → request dibuang,
              // loop ulang SOAL YANG SAMA TANPA dihitung sebagai kegagalan.
              if (bulkRetryRef.current && ac.signal.aborted) {
                revised = undefined;
                continue;
              }
              // Dibatalkan karena tombol Stop → jangan retry, langsung berhenti
              // tanpa log error (memang disengaja oleh user).
              if (autoStopRef.current) {
                revised = undefined;
                break;
              }
              const timedOut = err?.name === "AbortError" || ac.signal.aborted;
              loggerWarn(
                `Automasi bulk: gagal revisi "${w.word}" — percobaan ${attempt}/${BULK_WORD_RETRIES}${timedOut ? " (macet/timeout)" : ""}`,
                err instanceof Error ? err : new Error(String(err)),
              );
              revised = undefined;
              if (attempt >= BULK_WORD_RETRIES) {
                stopReason = `soal "${w.word}" gagal ${BULK_WORD_RETRIES}×${timedOut ? " (AI macet/timeout)" : ""} — dihentikan total`;
                break;
              }
              // Jeda sebelum retry SOAL YANG SAMA.
              await new Promise((r) => setTimeout(r, 3_000));
            } finally {
              clearTimeout(timeoutId);
            }
          }
          if (!stopReason && autoStopRef.current) stopReason = "dihentikan manual";
          aiThink.reset(); // revisi soal ini selesai/gagal → strip thinking dibersihkan
          if (stopReason || !revised) break;

          // STOP kalau bocor — hasil bocor TIDAK disimpan; catat & lanjut soal berikutnya.
          const aiLeaks = revised.leaks ?? [];
          const manualLeaks = clueLeaks(w.word, [revised.clue_1, revised.clue_2, revised.clue_3]);
          const allLeaks = [...new Set([...aiLeaks, ...manualLeaks])];
          if (allLeaks.length > 0) {
            finalLeaks.push(`${w.word} (${allLeaks.join(", ")})`);
            // Soal ini dianggap selesai diproses → progress bar maju satu langkah.
            setBulkPct(5 + Math.round(((i + 1) / list.length) * 90));
            continue;
          }

          // Simpan LANGSUNG via RPC — satu soal aman tersimpan sebelum lanjut.
          const rev = revised;
          const { data: saveData, error: saveError } = await supabase.rpc("update_vocabulary_admin", {
            p_word_id: w.word_id,
            p_word: w.word,
            p_clue_1: rev.clue_1.trim(),
            p_clue_2: rev.clue_2?.trim() ?? "",
            p_clue_3: rev.clue_3?.trim() ?? "",
            p_tier_level: w.tier_level,
          });
          if (saveError) throw saveError;
          const result = saveData as { ok: boolean; error?: string };
          if (!result?.ok) throw new Error(result?.error ?? "Gagal menyimpan");
          processed += 1;
          // Progress bar maju REAL per soal yang selesai dikerjakan.
          setBulkPct(5 + Math.round(((i + 1) / list.length) * 90));

          // Update daftar yang TAMPIL secara live — clue baru langsung kelihatan.
          setWords((prev) =>
            prev.map((x) =>
              x.word_id === w.word_id
                ? {
                    ...x,
                    clue_1: rev.clue_1.trim(),
                    clue_2: rev.clue_2?.trim() ?? "",
                    clue_3: rev.clue_3?.trim() ?? "",
                  }
                : x,
            ),
          );

          // Jeda antar soal — hindari rate-limit provider.
          await new Promise((r) => setTimeout(r, 1_000));
        }
        if (stopReason) break;

        // PLAN-094: sebelum pindah page berikutnya — konfirmasi stop 5 detik.
        // Tidak ditekan apa pun dalam 5 detik → lanjut otomatis.
        if (p < lastPage && !autoStopRef.current) {
          setBulkPct(100);
          setBulkStatus(`Page ${p}/${lastPage} selesai · ${processed} tersimpan · konfirmasi lanjut…`);
          const wantsStop = await requestPauseConfirmation();
          if (wantsStop || autoStopRef.current) {
            stopReason = "dihentikan manual";
            break;
          }
        }
      }
      if (!stopReason) stopReason = "semua halaman selesai";
      let msg = `🤖 Automasi bulk berhenti (${stopReason}). ${processed} soal direvisi & tersimpan.`;
      if (finalLeaks.length > 0) {
        msg += `\n⚠️ ${finalLeaks.length} soal masih bocor (tidak disimpan): ${finalLeaks.slice(0, 5).join("; ")}${finalLeaks.length > 5 ? "; …" : ""}`;
      }
      setNotification({
        type: processed > 0 ? "success" : "warning",
        message: msg,
      });
    } catch (err: any) {
      loggerError("Automasi bulk: berhenti karena error", err instanceof Error ? err : new Error(String(err)));
      setNotification({
        type: "error",
        message: `❌ Automasi bulk berhenti: ${err.message} (${processed} soal tersimpan).`,
      });
    } finally {
      setBulkRunning(false);
      setBulkStatus("");
      setBulkFocusId(null);
      bulkPauseRef.current = false;
      bulkRetryRef.current = false;
      bulkAbortRef.current = null;
      setBulkPaused(false);
      setBulkPct(0);
      setBulkPageSec(0);
      setBulkTotalSec(0);
      aiThink.reset();
      // Revisi urgent: refresh daftar di HALAMAN TERAKHIR yang diproses —
      // bukan halaman tempat tombol ditekan (stale closure penyebab bug
      // "kelihatan tidak ada yang direvisi / page tidak pindah").
      void fetchWords(lastProcessedPage);
    }
  }, [bulkRunning, autoRunning, page, totalPages, buildVocabQuery, fetchWords, requestPauseConfirmation, aiThink]);

  // ── Pause/Lanjut automasi bulk — berlaku di antara soal; soal yang sedang
  // berjalan selalu diselesaikan dulu supaya hasilnya tidak terbuang.
  const toggleBulkPause = useCallback(() => {
    if (!bulkRunning) return;
    const next = !bulkPauseRef.current;
    bulkPauseRef.current = next;
    setBulkPaused(next);
  }, [bulkRunning]);

  // ── Retry automasi bulk (🔁): buang request AI yang sedang berjalan dan
  // mulai ulang SOAL YANG SAMA dari awal — progres soal sebelumnya tetap aman.
  const retryBulkWord = useCallback(() => {
    if (!bulkRunning) return;
    bulkRetryRef.current = true;
    bulkAbortRef.current?.abort();
  }, [bulkRunning]);

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
          {/* PLAN-078 + PLAN-090: tombol Tambah Soal & Automasi Bulk */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {bulkRunning && (
              <>
                {/* PLAN bulk UX: dua tombol saat berjalan — Stop & Pause/Lanjut.
                    Keduanya memberi info langsung bahwa efek baru terasa setelah
                    soal berjalan selesai. */}
                <TouchableOpacity
                  onPress={() => {
                    play("tap");
                    toggleBulkPause();
                  }}
                  style={[styles.bulkBtn, { backgroundColor: bulkPaused ? "#10B981" : "#F59E0B" }]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>{bulkPaused ? "▶️" : "⏸"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    play("tap");
                    retryBulkWord();
                  }}
                  style={[styles.bulkBtn, { backgroundColor: "#6366F1" }]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>🔁</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    play("tap");
                    void toggleBulkAutomation();
                  }}
                  style={[styles.bulkBtn, { backgroundColor: "#EF4444" }]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>⏹</Text>
                </TouchableOpacity>
              </>
            )}
            {!bulkRunning && (
              <TouchableOpacity
                onPress={() => {
                  play("tap");
                  void toggleBulkAutomation();
                }}
                style={[
                  styles.bulkBtn,
                  {
                    // PLAN-092: tombol 🤖 Automasi Bulk; saat berjalan diganti
                    // pasangan ⏸/⏹ di atas.
                    backgroundColor: C.secondary,
                    opacity: autoRunning ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15 }}>🤖</Text>
              </TouchableOpacity>
            )}
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
        </View>

        {/* ─── PLAN-090: indikator progres automasi bulk ─── */}
        {bulkRunning && (
          <View style={[styles.bulkBanner, { backgroundColor: solidSurfaceColor(theme), borderColor: C.border }]}>
            {/* Revisi urgent: progress bar REAL per page — reset tiap page baru.
                Fase terukur: ambil soal → request AI → menyimpan i/N. */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.border, overflow: "hidden", marginBottom: 6 }}>
              <View
                style={{
                  height: 6,
                  width: `${Math.max(2, Math.min(100, bulkPct))}%`,
                  backgroundColor: C.primary,
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 12 }}>
              🤖 Page ini: {bulkPct}% — {bulkStatus || "memulai…"}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 4 }}>
              ⏱ Page ini: {fmtDur(bulkPageSec)} · Total: {fmtDur(bulkTotalSec)}
            </Text>
            {aiThink.phase !== "" && (
              <Text style={{ color: C.textSecondary, fontSize: 11 }}>
                {aiPhaseLabel(aiThink.phase, aiThink.elapsed)}
              </Text>
            )}
            {aiThink.tail(220).length > 0 && (
              <Text numberOfLines={3} style={{ color: C.textSecondary, fontSize: 11, fontStyle: "italic", marginTop: 2 }}>
                {aiThink.tail(220)}
              </Text>
            )}
          </View>
        )}
        {/* PLAN-108 revisi UI: strip thinking non-bulk TIDAK lagi dirender di
            halaman daftar (tidak terbaca di belakang/terpisah dari form) —
            dipindah ke DALAM modal form via `thinkingStrip`. */}

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
            <ScrollView
              ref={listScrollRef}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            >
              {paged.map((w) => (
                <TouchableOpacity
                  key={w.word_id}
                  onLayout={(e) => cardYRef.current.set(w.word_id, e.nativeEvent.layout.y)}
                  style={[
                    styles.wordCard,
                    {
                      backgroundColor: solidSurfaceColor(theme),
                      borderColor: C.border,
                    },
                    selectedWord?.word_id === w.word_id && { borderColor: C.primary, borderWidth: 2 },
                    // Kartu soal yang SEDANG direvisi automasi bulk — highlight oranye
                    // supaya user langsung melihat progres di daftar.
                    bulkRunning && bulkFocusId === w.word_id && {
                      borderColor: "#F59E0B",
                      borderWidth: 2,
                    },
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

            <AiThinkingStrip
              phase={aiThink.phase}
              elapsed={aiThink.elapsed}
              tail={aiThink.tail(220)}
              textColor={C.textSecondary}
              bg={C.secondaryContainer}
            />
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

            <AiThinkingStrip
              phase={aiThink.phase}
              elapsed={aiThink.elapsed}
              tail={aiThink.tail(220)}
              textColor={C.textSecondary}
              bg={C.secondaryContainer}
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
                { marginTop: 16, marginBottom: 8 },
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

        {/* ─── PLAN-094: konfirmasi stop 5 detik antar page bulk ─── */}
        <ConfirmDialog
          visible={pauseVisible}
          emoji="🤖"
          title="Lanjut ke page berikutnya?"
          message={`Page selesai. Automasi lanjut otomatis dalam ${pauseSeconds} detik.`}
          confirmText="Stop Sekarang"
          confirmIcon="⏹"
          cancelText={`Lanjut (${pauseSeconds}s)`}
          cancelIcon="▶️"
          variant="danger"
          onConfirm={() => {
            play("tap");
            autoStopRef.current = true;
            pauseResolverRef.current?.(true);
          }}
          onCancel={() => {
            play("tap");
            pauseResolverRef.current?.(false);
          }}
        />
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
  bulkBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  bulkBanner: {
    marginHorizontal: 12,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
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
    gap: 16,
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
