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
import { useState, useCallback, useMemo } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import { useGameStore } from "../../presentation/stores/gameStore";
import { useAuth } from "../auth/useAuth";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { timeAgo } from "../../utils/timeAgo";
import {
  getLogs,
  getLogCounts,
  clearLogs,
  initLogDb,
  type LogEntry,
  type LogLevel,
} from "../../utils/logDb";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type LogFilter = "all" | LogLevel;

const FILTERS: { key: LogFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "error", label: "Error" },
  { key: "warn", label: "Warning" },
  { key: "info", label: "Info" },
  { key: "debug", label: "Debug" },
];

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "Debug",
  info: "Info",
  warn: "Warning",
  error: "Error",
};

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);
  const { signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ---- Log Aplikasi ----
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ total: 0, debug: 0, info: 0, warn: 0, error: 0 });
  const [filter, setFilter] = useState<LogFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logDbMode, setLogDbMode] = useState<"sqlite" | "fallback" | "loading">("loading");
  const [showClearLogConfirm, setShowClearLogConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDark = themeMode === "dark" || (themeMode === "system" && theme.mode === "dark");

  const toggleTheme = () => {
    setThemeMode(isDark ? "light" : "dark");
  };

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

  const handleCopyLogs = useCallback(async () => {
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

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      reset();
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    } catch (e: any) {
      // Silently fail — user stays on settings
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  }, [signOut, reset, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Tampilan */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tampilan</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Mode Gelap</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#ccc", true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Efek Suara</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#ccc", true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Akun */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Akun</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.6}
            onPress={() => setShowSignOutConfirm(true)}
            disabled={signingOut}
          >
            <Text style={[styles.actionText, { color: theme.colors.error }]}>
              {signingOut ? "Keluar..." : "Keluar Akun"}
            </Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>
              Kembali ke halaman login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data</Text>
          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            Total XP tersimpan: {totalXp}
          </Text>
          <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.6}>
            <Text style={styles.dangerText}>Hapus Data Lokal</Text>
          </TouchableOpacity>
        </View>

        {/* Log Aplikasi */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.logHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Log Aplikasi</Text>
            <View style={[styles.dbBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.dbBadgeText, { color: theme.colors.secondary }]}>
                {logDbMode === "sqlite" ? "SQLite lokal" : logDbMode === "fallback" ? "Cadangan" : "…"}
              </Text>
            </View>
          </View>

          <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
            Setiap issue (error / warning) otomatis tercatat di sini.
          </Text>

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
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? "#fff" : theme.colors.textSecondary },
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
              <Text style={[styles.logEmpty, { color: theme.colors.textSecondary }]}>
                Memuat log…
              </Text>
            ) : logs.length === 0 ? (
              <Text style={[styles.logEmpty, { color: theme.colors.textSecondary }]}>
                Belum ada log. Log akan muncul otomatis saat ada error atau warning.
              </Text>
            ) : (
              logs.map((entry) => {
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

          {/* Aksi */}
          <View style={styles.logActionsRow}>
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={() => {
                setLogsLoading(true);
                void refreshLogs();
              }}
            >
              <Text style={[styles.logBtnText, { color: theme.colors.secondary }]}>🔄 Muat Ulang</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: theme.colors.secondaryContainer }]}
              activeOpacity={0.7}
              onPress={handleCopyLogs}
            >
              <Text style={[styles.logBtnText, { color: theme.colors.secondary }]}>
                {copied ? "✅ Tersalin" : "📋 Salin"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: "rgba(231, 76, 60, 0.1)" }]}
              activeOpacity={0.7}
              onPress={() => setShowClearLogConfirm(true)}
            >
              <Text style={[styles.logBtnText, { color: theme.colors.error }]}>🗑 Hapus Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tentang */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tentang</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Versi</Text>
            <Text style={[styles.settingValue, { color: theme.colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Aplikasi</Text>
            <Text style={[styles.settingValue, { color: theme.colors.text }]}>KotaKata.AI</Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Keluar Akun"
        message="Apakah kamu yakin ingin keluar? Progres game akan tetap tersimpan."
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
        variant="danger"
        emoji="🚪"
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingValue: { fontSize: 14, fontWeight: "600" },
  settingHint: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1 },
  actionRow: { paddingVertical: 8 },
  actionText: { fontSize: 15, fontWeight: "600" },
  actionHint: { fontSize: 12, marginTop: 2 },
  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
  },
  dangerText: { color: "#E74C3C", fontSize: 14, fontWeight: "600" },

  // ---- Log Aplikasi ----
  logHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dbBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dbBadgeText: { fontSize: 11, fontWeight: "700" },
  logStatsRow: { flexDirection: "row", gap: 16 },
  logStat: { fontSize: 13, fontWeight: "500" },
  logStatValue: { fontWeight: "800" },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  logList: { gap: 8 },
  logEmpty: { fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  logItem: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderLeftWidth: 4,
  },
  logItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logLevelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logLevel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  logTime: { fontSize: 11, fontWeight: "500" },
  logMessage: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  logSource: { fontSize: 11 },
  logDetails: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "monospace",
    marginTop: 4,
  },
  logTimestamp: { fontSize: 11, fontStyle: "italic", marginTop: 2 },
  logActionsRow: { flexDirection: "row", gap: 8 },
  logBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  logBtnText: { fontSize: 12, fontWeight: "700" },
});
