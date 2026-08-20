import { useState, useEffect, useCallback } from "react";
import { Linking, Platform } from "react-native";
import { loggerWarn } from "../../utils/logger";
import Constants from "expo-constants";
import { supabase } from "../../data/sources/supabase";
import { displayNameFromMetadata, avatarUrlFromMetadata } from "../../utils/userMetadata";
import type { Session } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isAnonymous: boolean;
  isAdmin: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {      supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapSession(session));
      setLoading(false);
    }).catch((err) => {
      loggerWarn("Gagal mengambil sesi auth", err);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSession(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in with Google OAuth.
   *
   * Web: popup flow (supaya tetap jalan di dalam iframe preview — Google
   * menolak dirender di iframe (403), jadi iframe sendiri tidak pernah dinavigasi).
   * Native: buka browser via deep link `kotakata://auth-callback` (PKCE) — kode
   * ditukar otomatis oleh handler di src/data/sources/supabase.ts, session
   * masuk lewat onAuthStateChange.
   */
  const signInWithGoogle = useCallback(async () => {
    const isWeb = Platform.OS === "web";

    if (!isWeb) {
      const scheme = Constants.expoConfig?.scheme ?? "kotakata";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${scheme}://auth-callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
      return data;
    }

    // Open the popup synchronously (inside the tap gesture) so popup blockers allow it.
    const popup = window.open("", "_blank", "width=520,height=640,popup=yes");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Always return to the app's own origin instead of Supabase's default Site URL
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      popup?.close();
      throw error;
    }

    if (data?.url && popup) {
      popup.location.assign(data.url);

      // Poll as a fallback in case cross-tab session sync doesn't fire.
      // The popup (same origin) stores the session, then we pick it up here.
      const deadline = Date.now() + 120_000;
      const timer = setInterval(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setUser(mapSession(session));
          clearInterval(timer);
          // Tutup popup bila belum menutup diri sendiri (lihat supabase.ts) —
          // mencegah popup tertinggal sebagai "jendela game" kedua.
          try {
            popup?.close();
          } catch {
            // Popup lintas-origin (masih di Google) tidak bisa ditutup dari sini;
            // popup akan menutup dirinya sendiri setelah callback selesai.
          }
          return;
        }
        if (Date.now() > deadline || popup.closed) {
          clearInterval(timer);
        }
      }, 800);
    } else if (!popup) {
      throw new Error("Popup diblokir browser. Izinkan popup untuk melanjutkan login Google.");
    }

    return data;
  }, []);

  /** Sign out */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };
}

const ADMIN_EMAIL = "fadhly.permata@gmail.com";
const ADMIN_NAME = "Fadhly Permata";

function mapSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const email = session.user.email ?? undefined;
  const displayName = displayNameFromMetadata(session.user.user_metadata);
  return {
    id: session.user.id,
    email,
    displayName,
    avatarUrl: avatarUrlFromMetadata(session.user.user_metadata),
    isAnonymous: session.user.is_anonymous ?? false,
    isAdmin: email === ADMIN_EMAIL && displayName === ADMIN_NAME,
  };
}




