import { useEffect } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../components/providers/ThemeProvider";
import { supabase } from "../../data/sources/supabase";
import { displayNameFromMetadata } from "../../utils/userMetadata";
import { userRepository } from "../../data/repositories/userRepository";
import { syncAiProviderConfigWithCloud } from "../../utils/aiProvider";
import { loggerWarn } from "../../utils/logger";
import { useGameStore } from "../stores/gameStore";
import AuthScreen from "../../features/auth/AuthScreen";
import MainMenuScreen from "../../features/game/MainMenuScreen";
import GameScreen from "../../features/game/GameScreen";
import HistoryScreen from "../../features/history/HistoryScreen";
import GameHistoryScreen from "../../features/history/GameHistoryScreen";
import BoardViewerScreen from "../../features/history/BoardViewerScreen";
import ProfileScreen from "../../features/profile/ProfileScreen";
import SettingsScreen from "../../features/settings/SettingsScreen";
import LogViewerScreen from "../../features/settings/LogViewerScreen";
import AiProviderScreen from "../../features/ai/AiProviderScreen";
import MarkdownScreen from "../../features/legal/MarkdownScreen";
import StoreScreen from "../../features/store/StoreScreen";

export type RootStackParamList = {
  Auth: undefined;
  MainMenu: undefined;
  Game: undefined;
  History: undefined;
  GameHistory: undefined;
  BoardViewer: { boardId: string };
  LogViewer: undefined;
  Markdown: { title: string; url: string };
  Profile: undefined;
  Settings: undefined;
  AiProvider: undefined;
  Store: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Title tab browser (web) ───
// Halaman web menampilkan "KotaKata AI - <Nama Halaman>" di title tab, mis.
// "KotaKata AI - Beranda" (lihat PLAN-031). Native tidak memakai ini.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const ROUTE_TITLES: Partial<Record<keyof RootStackParamList, string>> = {
  Auth: "Masuk",
  MainMenu: "Beranda",
  Game: "Bermain",
  History: "Kata Ditemukan",
  GameHistory: "Sejarah Permainan",
  BoardViewer: "Detail Papan",
  Profile: "Profil",
  Settings: "Pengaturan",
  AiProvider: "Provider AI",
  LogViewer: "Log Aplikasi",
  Markdown: "Dokumen",
  Store: "Pasar",
};

/** Set judul tab browser sesuai rute aktif (web). No-op di native. */
function updateDocumentTitle(): void {
  if (typeof document === "undefined" || !navigationRef.isReady()) return;
  const route = navigationRef.getCurrentRoute();
  const page = route ? ROUTE_TITLES[route.name as keyof RootStackParamList] : undefined;
  document.title = page ? `KotaKata AI - ${page}` : "KotaKata AI";
}

export default function RootNavigator() {
  const { theme } = useTheme();

  // Bootstrap data layer: on every session (login / restore) pull the player's
  // cloud profile so XP survives across devices — then push it back up if it
  // doesn't exist yet. Semua data disimpan langsung di Supabase, tidak ada
  // database lokal / scheduler sync.
  useEffect(() => {
    let disposed = false;

    // Session anonim yang tersisa dari build lama (PLAN-030: game hanya untuk
    // login Google) langsung dikeluarkan saat app dibuka.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (disposed) return;
      if (session?.user?.is_anonymous) {
        void supabase.auth.signOut().catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        useGameStore.getState().reset();
        // Profil berikutnya (session baru) harus dianggap BELUM siap — kalau
        // tidak, notifikasi tier di menu bisa salah membandingkan tier sebelum
        // XP profil sejati dimuat.
        useGameStore.getState().setProfileReady(false);
        return;
      }
      // Sejak PLAN-030 game hanya boleh dimainkan user yang login Google —
      // session anonim (tamu) tidak diterima: langsung dikeluarkan kembali ke
      // halaman login. Data guest lama tidak dipulihkan lagi.
      if (session.user.is_anonymous) {
        void supabase.auth.signOut().catch(() => {});
        useGameStore.getState().setProfileReady(false);
        return;
      }
      const uid = session.user.id;
      (async () => {
        try {
          const { data: profile, error } = await supabase
            .from("users")
            .select("user_id, display_name, email, total_xp, current_tier, coins, updated_at")
            .eq("user_id", uid)
            .maybeSingle();

          // Nama asli dari provider (Google → user_metadata.full_name / name).
          const realName = displayNameFromMetadata(session.user.user_metadata);

          if (!error && profile) {
            // Pemain lama — pulihkan XP dari cloud. Kalau nama masih default
            // "Pemain" padahal session punya nama asli, backfill sekalian.
            const nameMissing = !profile.display_name || profile.display_name === "Pemain";
            if (nameMissing && realName) {
              await userRepository.upsert({
                user_id: profile.user_id,
                display_name: realName,
                email: profile.email ?? undefined,
                total_xp: profile.total_xp ?? 0,
                current_tier: profile.current_tier ?? 1,
                coins: profile.coins ?? 0,
                updated_at: new Date().toISOString(),
              });
            } else {
              await userRepository.upsert({
                user_id: profile.user_id,
                display_name: profile.display_name ?? "Pemain",
                email: profile.email ?? undefined,
                total_xp: profile.total_xp ?? 0,
                current_tier: profile.current_tier ?? 1,
                coins: profile.coins ?? 0,
                updated_at: profile.updated_at ?? new Date().toISOString(),
              });
            }
            if (!disposed) useGameStore.getState().setTotalXp(profile.total_xp ?? 0);
          } else {
            // Pemain baru — buat profil (nama asli provider kalau ada).
            const now = new Date().toISOString();
            await userRepository.upsert({
              user_id: uid,
              display_name: realName ?? "Pemain",
              email: session.user.email ?? undefined,
              total_xp: 0,
              current_tier: 1,
              coins: 0,
              updated_at: now,
            });
            if (!disposed) useGameStore.getState().setTotalXp(0);
          }
          // Sinkronkan config provider AI dari cloud: login akun sama di device
          // lain tetap bisa Main Mode AI. Gagal sync tidak menghalangi profil.
          try {
            await syncAiProviderConfigWithCloud(uid);
          } catch (err) {
            loggerWarn("Gagal sinkron config provider AI", err);
          }
          // Profil sudah siap — notifikasi tier (main menu & in-game) baru boleh
          // membandingkan tier sekarang (seed tanpa toast saat pertama kali).
          if (!disposed) useGameStore.getState().setProfileReady(true);
        } catch (err) {
          loggerWarn("Gagal memuat profil pemain", err);
        }
      })();
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer
      theme={navTheme}
      ref={navigationRef}
      onReady={updateDocumentTitle}
      onStateChange={updateDocumentTitle}
    >
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          animation: "fade_from_bottom",
          animationDuration: 320,
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: "700", fontSize: 16 },
          orientation: "portrait",
        }}
      >
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false, animation: "fade_from_bottom", animationDuration: 400 }}
        />
        <Stack.Screen
          name="MainMenu"
          component={MainMenuScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            headerShown: false,
            animation: "fade",
            animationDuration: 250,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GameHistory"
          component={GameHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BoardViewer"
          component={BoardViewerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LogViewer"
          component={LogViewerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Markdown"
          component={MarkdownScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AiProvider"
          component={AiProviderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Store"
          component={StoreScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
