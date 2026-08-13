import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import { loggerWarn } from "../../utils/logger";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: detect OAuth tokens in the URL after Google redirects back.
    // Native: no URL-based callback — handled via deep-link (lihat di bawah).
    detectSessionInUrl: Platform.OS === "web",
    // PKCE: OAuth native mengembalikan `code` (bukan token di fragment URL),
    // lalu ditukar dengan exchangeCodeForSession. Di Hermes tanpa WebCrypto,
    // supabase-js otomatis fallback ke code challenge "plain".
    flowType: "pkce",
  },
});

// Native OAuth callback (Google → deep link `kotakata://auth-callback?code=...`):
// tukar kode PKCE dengan session. Listener dipasang sekali saat modul dimuat,
// jadi deep link selalu tertangkap (termasuk app yang baru kembali ke depan).
if (Platform.OS !== "web") {
  const scheme = Constants.expoConfig?.scheme ?? "kotakata";
  const callbackPrefix = `${scheme}://auth-callback`;

  const handleAuthUrl = (url: string | null): void => {
    if (!url || !url.startsWith(callbackPrefix)) return;
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");
    if (!code) {
      // Redirect tanpa code (mis. user membatalkan / error provider) — abaikan.
      loggerWarn("OAuth callback tanpa kode PKCE", url.slice(0, 120));
      return;
    }
    void supabase.auth.exchangeCodeForSession(code).catch((err) => {
      loggerWarn("Gagal menukar kode OAuth", err);
    });
  };

  Linking.addEventListener("url", (event) => handleAuthUrl(event.url));
  void Linking.getInitialURL().then(handleAuthUrl);
}

// Web OAuth popup (Google): setelah Google redirect balik, token OAuth mendarat
// di URL popup, supabase menyimpan session ke localStorage (shared, same-origin
// dengan opener), lalu memicu event SIGNED_IN. Tugas popup selesai — tutup
// jendelanya. Opener mengambil session via cross-tab sync (storage/BroadcastChannel)
// + polling fallback di useAuth.signInWithGoogle, jadi tanpa popup ini pun login
// tetap terdeteksi. Tanpa penutupan ini, popup malah memuat seluruh aplikasi
// ("2 jendela game") dan tidak pernah menutup.
if (
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.opener &&
  window.opener !== window
) {
  let closing = false;
  supabase.auth.onAuthStateChange((event) => {
    // SIGNED_IN hanya muncul saat OAuth callback selesai diproses (bukan session
    // lama), jadi aman sebagai sinyal "popup sudah selesai bertugas".
    if (closing || event !== "SIGNED_IN") return;
    closing = true;
    // Beri waktu storage event menjalar ke opener sebelum jendela ditutup.
    setTimeout(() => window.close(), 500);
  });
}
