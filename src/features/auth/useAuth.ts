import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../data/sources/supabase";
import type { Session, AuthError } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email?: string;
  displayName?: string;
  isAnonymous: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapSession(session));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSession(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Sign in anonymously — no credentials needed */
  const signInAnonymously = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  }, []);

  /** Sign in with email + password */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    [],
  );

  /** Sign up with email + password */
  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
    [],
  );

  /** Sign in with Google OAuth */
  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) throw error;
    return data;
  }, []);

  /** Link anonymous account to email/password (identity linking) */
  const linkEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    [],
  );

  /** Sign out */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    loading,
    signInAnonymously,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    linkEmail,
    signOut,
  };
}

function mapSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? undefined,
    displayName: session.user.user_metadata?.display_name ?? undefined,
    isAnonymous: session.user.is_anonymous ?? false,
  };
}
