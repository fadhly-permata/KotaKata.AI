import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import TopBar from "../../presentation/components/common/TopBar";
import TierBadge from "../../presentation/components/common/TierBadge";
import ConfirmDialog from "../../presentation/components/common/ConfirmDialog";
import { useGameStore } from "../../presentation/stores/gameStore";
import UserAvatar from "../../presentation/components/common/UserAvatar";
import { useAuth } from "../auth/useAuth";
import { calcTier, TIER_NAMES } from "../../domain/usecases/xpEngine";
import { userRepository } from "../../data/repositories/userRepository";
import { wordDiscoveryRepository } from "../../data/repositories/wordDiscoveryRepository";
import { clearDeviceId } from "../../utils/deviceIdentity";
import { play } from "../../utils/sound";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList, "Profile">;

/** Kode konfirmasi hapus akun: 10 huruf acak (tanpa I & O agar tidak ambigu). */
const CODE_POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateDeleteCode(): string {
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)];
  }
  return out;
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const totalXp = useGameStore((s) => s.totalXp);
  const reset = useGameStore((s) => s.reset);
  const { user, signOut } = useAuth();

  // ─── Jumlah kata terpecahkan: baca dari cloud (countByUser) ───
  // Dulu memakai useGameStore(wordsSolved) yang hanya menghitung kata di sesi
  // game aktif → selalu 0 di halaman Profil (padahal "Kata Ditemukan" sudah
  // menampilkan 404 kata). Sumber kebenaran adalah tabel word_discoveries.
  const [wordsSolved, setWordsSolved] = useState(0);
  const [wordsSolvedLoading, setWordsSolvedLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setWordsSolvedLoading(true);
      if (!user?.id) {
        setWordsSolved(0);
        setWordsSolvedLoading(false);
        return () => {
          active = false;
        };
      }
      wordDiscoveryRepository
        .countByUser(user.id)
        .then((n) => {
          if (active) setWordsSolved(n);
        })
        .catch(() => {
          // Offline/gagal — biarkan nilai terakhir; tidak mengganggu profil.
        })
        .finally(() => {
          if (active) setWordsSolvedLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  // ─── Keluar Akun ───
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ─── Hapus Akun (Permanen) — konfirmasi 2 level ───
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // level 1: peringatan
  const [showDeleteCode, setShowDeleteCode] = useState(false); // level 2: ketik kode
  const [deleteCode, setDeleteCode] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const tier = calcTier(totalXp);
  const tierName = TIER_NAMES[Math.max(0, tier - 1)];
  const displayName = user?.displayName ?? "Pemain";

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      reset();
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    } catch {
      // Gagal keluar (mis. offline) — user tetap di halaman profil.
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  }, [signOut, reset, navigation]);

  // Level 1 → level 2: generate kode acak baru setiap kali dialog dibuka.
  const openDeleteCode = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteCode(generateDeleteCode());
    setTypedCode("");
    setDeleteError(null);
    setShowDeleteCode(true);
  }, []);

  // Tombol hapus hanya aktif kalau kode yang diketik sama persis (case-insensitive).
  const codeMatches =
    deleteCode.length > 0 && typedCode.trim().toUpperCase() === deleteCode;

  const handleDeleteAccount = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      // 1) Hapus semua data + user auth lewat RPC security definer.
      await userRepository.deleteAccount();
      // 2) Reset identitas device — guest berikutnya di device ini mulai nol.
      await clearDeviceId();
      // 3) Bersihkan sesi lokal (user auth sudah terhapus — error diabaikan).
      await signOut().catch(() => {});
      // 4) Reset store game & kembali ke layar Auth.
      reset();
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    } catch (err: any) {
      setDeleteError(err?.message ?? "Gagal menghapus akun. Coba lagi nanti.");
      setDeleting(false);
    }
  }, [reset, navigation, signOut]);

  return (
    <ScreenFade style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface }]}>
          <UserAvatar name={displayName} avatarUrl={user?.avatarUrl} size={64} />
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
          {!!user?.email && (
            <Text style={[styles.email, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {user.email}
            </Text>
          )}
          <Text style={[styles.tierSubtitle, { color: theme.colors.textSecondary }]}>
            Tier {tier} — {tierName}
          </Text>
        </View>

        {/* Tier badge with XP progress */}
        <TierBadge totalXp={totalXp} />

        {/* Stats grid */}
        <View style={[styles.statsGrid, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            {wordsSolvedLoading ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{wordsSolved}</Text>
            )}
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Kata Terpecahkan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalXp}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total XP</Text>
          </View>
        </View>

        {/* Account actions — hubungkan akun hanya relevan untuk guest */}
        <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
          {user?.isAnonymous ? (
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.6}>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>Hubungkan Akun</Text>
              <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>
                Simpan progres ke cloud
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: theme.colors.text }]}>✓ Akun Terhubung</Text>
              <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {user?.email ?? "Masuk sebagai pemain terdaftar"}
              </Text>
            </View>
          )}
        </View>

        {/* Keluar Akun + Hapus Akun (Permanen) */}
        <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.6}
            onPress={() => setShowSignOutConfirm(true)}
            disabled={signingOut}
          >
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              {signingOut ? "Keluar..." : "Keluar Akun"}
            </Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>
              Kembali ke halaman login
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.6}
            onPress={() => {
              play("tap");
              setShowDeleteConfirm(true);
            }}
          >
            <Text style={[styles.actionText, { color: "#E74C3C" }]}>Hapus Akun (Permanen)</Text>
            <Text style={[styles.actionHint, { color: theme.colors.textSecondary }]}>
              Hapus semua data & akun ini selamanya
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Konfirmasi Keluar Akun ─── */}
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

      {/* ─── Konfirmasi Hapus Akun — level 1 (peringatan) ─── */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Hapus Akun (Permanen)?"
        message="Semua progres, XP, riwayat kata, dan board akan dihapus SELAMANYA dan tidak bisa dikembalikan. Lanjutkan?"
        confirmText="Lanjutkan"
        cancelText="Batal"
        onConfirm={openDeleteCode}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
        emoji="⚠️"
      />

      {/* ─── Konfirmasi Hapus Akun — level 2 (ketik kode acak) ─── */}
      <Modal
        visible={showDeleteCode}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setShowDeleteCode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.deleteEmoji}>🛑</Text>
            <Text style={[styles.deleteTitle, { color: theme.colors.text }]}>Konfirmasi Terakhir</Text>
            <Text style={[styles.deleteHint, { color: theme.colors.textSecondary }]}>
              Ketik 10 huruf berikut untuk menghapus akun secara permanen:
            </Text>

            <View style={[styles.codeBox, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.codeText, { color: theme.colors.primary }]}>{deleteCode}</Text>
            </View>

            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.colors.secondaryContainer, color: theme.colors.text }]}
              value={typedCode}
              onChangeText={(t) => {
                setTypedCode(t.toUpperCase());
                setDeleteError(null);
              }}
              placeholder="Ketik kode di atas"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              editable={!deleting}
            />

            {typedCode.length > 0 && !codeMatches && !deleting && (
              <Text style={styles.mismatchText}>
                Kode belum cocok — periksa kembali hurufnya.
              </Text>
            )}
            {deleteError && <Text style={styles.mismatchText}>{deleteError}</Text>}

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: codeMatches && !deleting ? "#E74C3C" : theme.colors.border },
              ]}
              activeOpacity={0.8}
              disabled={!codeMatches || deleting}
              onPress={() => {
                play("tap");
                void handleDeleteAccount();
              }}
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteBtnText}>Hapus Akun Permanen</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.6}
              onPress={() => setShowDeleteCode(false)}
              disabled={deleting}
            >
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  avatarContainer: { alignItems: "center", padding: 24, borderRadius: 16, gap: 8 },
  name: { fontSize: 20, fontWeight: "700" },
  email: { fontSize: 13, fontWeight: "500", maxWidth: "90%" },
  tierSubtitle: { fontSize: 13, fontWeight: "500" },
  statsGrid: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 12,
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  actions: { borderRadius: 12, overflow: "hidden" },
  actionRow: { padding: 16 },
  actionText: { fontSize: 15, fontWeight: "600" },
  actionHint: { fontSize: 12, marginTop: 2 },
  divider: { height: 1 },

  /* ─── Modal konfirmasi hapus akun (level 2) ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  deleteEmoji: { fontSize: 40 },
  deleteTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  deleteHint: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  codeBox: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  codeText: { fontSize: 22, fontWeight: "900", letterSpacing: 6 },
  codeInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
    letterSpacing: 4,
  },
  mismatchText: { fontSize: 12, color: "#E74C3C", textAlign: "center", lineHeight: 17 },
  deleteBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  deleteBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 24 },
  cancelText: { fontSize: 14, fontWeight: "600" },
});
