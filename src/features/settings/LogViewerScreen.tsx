import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Share,
} from "react-native";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { buttonShadow, textOnPrimary } from "../../utils/skin";
import TopBar from "../../presentation/components/common/TopBar";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { timeAgo } from "../../utils/timeAgo";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import {
  getLogs,
  getLogCounts,
  clearLogs,
  initLogDb,
  type LogEntry,
  type LogLevel,
} from "../../utils/logDb";
import { logReportRepository } from "../../data/repositories/logReportRepository";
import { useAuth } from "../auth/useAuth";

type LogFilter = "all" | LogLevel;

const FILTERS: { key: LogFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "error", label: "Error" },
  { key: "warn", label: "Warning" },
  { key: "info", label: "Info" },
  { key: "debug", label: "Debug" },
];

/** Pilihan jumlah baris per halaman (bisa di-custom lewat chip di bawah). */
const PAGE_SIZES = [25, 50, 100, 200];

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "Debug",
  info: "Info",
  warn: "Warning",
  error: "Error",
};

export default function LogViewerScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ total: 0, debug: 0, info: 0, warn: 0, error: 0 });
  const [filter, setFilter] = useState<LogFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logDbMode, setLogDbMode] = useState<"sqlite" | "fallback" | "loading">("loading");
  const [showClearLogConfirm, setShowClearLogConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  // ─── Kirim log (error/warning saja) ke Supabase untuk debugging ───
  const [sendConfirm, setSendConfirm] = useState<{ count: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const { user } = useAuth();

  // ─── Paging: tampilkan log per halaman (jumlah baris bisa di-custom) ───
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLogs = useMemo(
    () => logs.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [logs, currentPage, pageSize],
  );

  // Ganti filter / jumlah baris per halaman → kembali ke halaman 1.
  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  const refreshLogs = useCallback(async () => {
    try {
      const dbMode = (await initLogDb()) ? "sqlite" : "fallback";
      setLogDbMode(dbMode);
      const [entries, stats] = await Promise.all([
        getLogs({ level: filter === "all" ? undefined : filter, limit: 200 }),
        getLogCounts(),
      ]);
      setLogs(entries);
      setCounts(stats);
    } catch {
      // biarkan state lama
    } finally {
      setLogsLoading(false);
    }
  }, [filter]);

  // Muat ulang saat layar fokus, lalu poll ringan selama halaman terbuka.
  useFocusEffect(
    useCallback(() => {
      void refreshLogs();
      const timer = setInterval(() => {
        void refreshLogs();
      }, 3000);
      return () => clearInterval(timer);
    }, [refreshLogs]),
  );

  const handleClearLogs = useCallback(async () => {
    await clearLogs();
    setExpandedId(null);
    setShowClearLogConfirm(false);
    await refreshLogs();
  }, [refreshLogs]);

  // Kumpulkan SEMUA entri error/warning (bukan cuma halaman aktif) utk dikirim.
  const collectReportableLogs = useCallback(async (): Promise<LogEntry[]> => {
    const [errs, warns] = await Promise.all([
      getLogs({ level: "error", limit: 500 }),
      getLogs({ level: "warn", limit: 500 }),
    ]);
    return [...errs, ...warns];
  }, []);

  // Tahap 1: hitung berapa error/warning yang akan dikirim → tampilkan konfirmasi.
  const handlePrepareSendLogs = useCallback(async () => {
    if (!user?.id) {
      setSendStatus({ ok: false, msg: "Masuk dulu agar log bisa dikirim ke server." });
      return;
    }
    setSendStatus(null);
    try {
      const entries = await collectReportableLogs();
      if (entries.length === 0) {
        setSendStatus({ ok: true, msg: "Tidak ada error/warning untuk dikirim." });
        return;
      }
      setSendConfirm({ count: entries.length });
    } catch {
      setSendStatus({ ok: false, msg: "Gagal membaca log untuk dikirim." });
    }
  }, [user?.id, collectReportableLogs]);

  // Tahap 2: benar-benar kirim setelah user konfirmasi.
  const handleSendLogs = useCallback(async () => {
    if (!user?.id) return;
    setSending(true);
    setSendStatus(null);
    try {
      const entries = await collectReportableLogs();
      const sent = await logReportRepository.send(user.id, entries);
      setSendStatus({
        ok: true,
        msg: sent > 0 ? `Berhasil mengirim ${sent} entri log ke server.` : "Tidak ada yang dikirim.",
      });
    } catch (err: any) {
      setSendStatus({
        ok: false,
        msg: err?.message ?? "Gagal mengirim log. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setSending(false);
      setSendConfirm(null);
    }
  }, [user?.id, collectReportableLogs]);

  const handleCopyLogs = useCallback(async () => {
    // Salin SEMUA log yang cocok filter (paging hanya untuk tampilan — kalau
    // user mau mengirim data log, harus lengkap, bukan cuma halaman aktif).
    const text =
      logs
        .map(
          (l) =>
            `[${l.level.toUpperCase()}] ${new Date(l.createdAt).toLocaleString()} ${l.source}: ${l.message}${l.details ? `\n${l.details}` : ""}`,
        )
        .join("\n\n") || "(belum ada log)";
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard?.writeText(text);
      } else {
        await Share.share({ message: text });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // batal / gagal — abaikan
    }
  }, [logs]);

  const levelColor = useMemo(
    () => ({
      error: theme.colors.error,
      warn: theme.colors.gold,
      info: theme.colors.tertiary,
      debug: theme.colors.textSecondary,
    }),
    [theme],
  );

  const toggleExpanded = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Log Aplikasi</Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Setiap issue (error / warning) otomatis tercatat di sini.
            </Text>
          </View>
          <View style={[styles.dbBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Text style={[styles.dbBadgeText, { color: theme.colors.secondary }]}>
              {logDbMode === "sqlite" ? "SQLite lokal" : logDbMode === "fallback" ? "Cadangan" : "…"}
            </Text>
          </View>
        </View>

        {/* Ringkasan */}
        <View style={styles.logStatsRow}>
          <Text style={[styles.logStat, { color: theme.colors.textSecondary }]}>
            Total: <Text style={styles.logStatValue}>{counts.total}</Text>
          </Text>
          <Text style={[styles.logStat, { color: theme.colors.error }]}>
            Error: <Text style={styles.logStatValue}>{counts.error}</Text>
          </Text>
          <Text style={[styles.logStat, { color: theme.colors.gold }]}>
            Warn: <Text style={styles.logStatValue}>{counts.warn}</Text>
          </Text>
        </View>

        {/* Aksi — DI ATAS supaya Muat Ulang / Salin / Hapus tidak perlu di-scroll */}
        <View style={styles.logActionsRow}>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: theme.colors.secondaryContainer }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={() => {
              setLogsLoading(true);
              void refreshLogs();
            }}
          >
            <Text style={[styles.logBtnText, { color: theme.colors.secondary }]}>🔄 Muat Ulang</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: theme.colors.secondaryContainer }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={handleCopyLogs}
          >
            <Text style={[styles.logBtnText, { color: theme.colors.secondary }]}>
              {copied ? "✅ Tersalin" : "📋 Salin"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: theme.colors.tertiaryContainer }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={() => {
              void handlePrepareSendLogs();
            }}
            disabled={sending}
          >
            <Text style={[styles.logBtnText, { color: theme.colors.tertiary }]}>
              {sending ? "⏳ Mengirim…" : "📤 Kirim Log"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: theme.colors.error + "1A" }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={() => setShowClearLogConfirm(true)}
          >
            <Text style={[styles.logBtnText, { color: theme.colors.error }]}>🗑 Hapus Log</Text>
          </TouchableOpacity>
        </View>

        {/* Status kirim log (sukses / gagal / perlu login) */}
        {sendStatus && (
          <Text
            style={[
              styles.logSendStatus,
              { color: sendStatus.ok ? theme.colors.secondary : theme.colors.error },
            ]}
          >
            {sendStatus.ok ? "✅ " : "⚠️ "}
            {sendStatus.msg}
          </Text>
        )}

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.7}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.secondaryContainer,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                  buttonShadow(theme),
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? textOnPrimary(theme) : theme.colors.textSecondary },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Daftar log */}
        <View style={styles.logList}>
          {logsLoading ? (
            <Text style={[styles.logEmpty, { color: theme.colors.textSecondary }]}>Memuat log…</Text>
          ) : logs.length === 0 ? (
            <Text style={[styles.logEmpty, { color: theme.colors.textSecondary }]}>
              Belum ada log. Log akan muncul otomatis saat ada error atau warning.
            </Text>
          ) : (
            visibleLogs.map((entry) => {
              const color = levelColor[entry.level];
              const expanded = expandedId === entry.id;
              return (
                <TouchableOpacity
                  key={entry.id}
                  activeOpacity={0.7}
                  onPress={() => toggleExpanded(entry.id)}
                  style={[
                    styles.logItem,
                    { backgroundColor: theme.colors.secondaryContainer, borderLeftColor: color },
                  ]}
                >
                  <View style={styles.logItemTop}>
                    <View style={styles.logLevelWrap}>
                      <View style={[styles.logDot, { backgroundColor: color }]} />
                      <Text style={[styles.logLevel, { color }]}>{LEVEL_LABEL[entry.level]}</Text>
                    </View>
                    <Text style={[styles.logTime, { color: theme.colors.textSecondary }]}>
                      {timeAgo(entry.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.logMessage, { color: theme.colors.text }]}
                    numberOfLines={expanded ? undefined : 2}
                  >
                    {entry.message}
                  </Text>
                  <Text style={[styles.logSource, { color: theme.colors.textSecondary }]}>
                    {entry.source}
                  </Text>
                  {expanded && entry.details ? (
                    <Text style={[styles.logDetails, { color: theme.colors.textSecondary }]}>
                      {entry.details}
                    </Text>
                  ) : null}
                  {expanded ? (
                    <Text style={[styles.logTimestamp, { color: theme.colors.textSecondary }]}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Paging — navigasi halaman + jumlah baris per halaman (custom) */}
        {logs.length > 0 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              style={[
                styles.pagerBtn,
                {
                  backgroundColor: theme.colors.secondaryContainer,
                  opacity: currentPage <= 1 ? 0.4 : 1,
                },
                buttonShadow(theme),
              ]}
              activeOpacity={0.7}
              disabled={currentPage <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Text style={[styles.pagerBtnText, { color: theme.colors.secondary }]}>‹</Text>
            </TouchableOpacity>

            <View style={styles.pagerInfoCol}>
              <Text style={[styles.pagerInfo, { color: theme.colors.textSecondary }]}>
                Halaman {currentPage} / {totalPages}
              </Text>
              <Text style={[styles.pagerCount, { color: theme.colors.textSecondary }]}>
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, logs.length)} dari {logs.length}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.pagerBtn,
                {
                  backgroundColor: theme.colors.secondaryContainer,
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                },
                buttonShadow(theme),
              ]}
              activeOpacity={0.7}
              disabled={currentPage >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Text style={[styles.pagerBtnText, { color: theme.colors.secondary }]}>›</Text>
            </TouchableOpacity>

            {/* Jumlah baris per halaman (custom) */}
            <View style={styles.pageSizeGroup}>
              {PAGE_SIZES.map((size) => {
                const active = size === pageSize;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pageSizeChip,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.secondaryContainer,
                      },
                      buttonShadow(theme),
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setPageSize(size)}
                  >
                    <Text
                      style={[
                        styles.pageSizeChipText,
                        { color: active ? textOnPrimary(theme) : theme.colors.textSecondary },
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showClearLogConfirm}
        title="Hapus Semua Log"
        message={`Hapus ${counts.total} entri log dari perangkat ini? Tindakan ini tidak bisa dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearLogConfirm(false)}
        variant="danger"
        emoji="🗑"
      />

      {/* Konfirmasi kirim log ke server */}
      <ConfirmDialog
        visible={sendConfirm !== null}
        title="Kirim Log ke Server"
        message={`Kirim ${sendConfirm?.count ?? 0} entri error/warning ke server untuk membantu pengembangan? Hanya level error/warning yang dikirim, dan detail teknis (stacktrace) tidak akan ditampilkan di aplikasi.`}
        confirmText="Kirim"
        cancelText="Batal"
        onConfirm={() => {
          void handleSendLogs();
        }}
        onCancel={() => setSendConfirm(null)}
        emoji="📤"
      />
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerTitleCol: { flex: 1 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  dbBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  dbBadgeText: { fontSize: 11, fontWeight: "700" },
  logStatsRow: { flexDirection: "row", gap: 16 },
  logStat: { fontSize: 13, fontWeight: "500" },
  logStatValue: { fontWeight: "800" },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  logList: { gap: 8 },
  logEmpty: { fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  logItem: { borderRadius: 10, padding: 12, gap: 4, borderLeftWidth: 4 },
  logItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logLevelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logLevel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  logTime: { fontSize: 11, fontWeight: "500" },
  logMessage: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  logSource: { fontSize: 11 },
  logDetails: { fontSize: 12, lineHeight: 16, fontFamily: "monospace", marginTop: 4 },
  logTimestamp: { fontSize: 11, fontStyle: "italic", marginTop: 2 },
  logActionsRow: { flexDirection: "row", gap: 8 },
  logBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  logBtnText: { fontSize: 12, fontWeight: "700" },
  logSendStatus: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
  pagerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnText: { fontSize: 20, fontWeight: "800", lineHeight: 22 },
  pagerInfoCol: { flex: 1, alignItems: "center", gap: 1 },
  pagerInfo: { fontSize: 13, fontWeight: "700" },
  pagerCount: { fontSize: 11, fontWeight: "500" },
  pageSizeGroup: { flexDirection: "row", gap: 4 },
  pageSizeChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  pageSizeChipText: { fontSize: 11, fontWeight: "700" },
});
