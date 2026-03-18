"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SignUpData = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emailRedirectTo?: string;
};

export function useAuth() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (error) {
        throw error;
      }

      return data;
    },
    [supabase]
  );

  const signUp = useCallback(
    async ({ email, password, fullName, phone, emailRedirectTo }: SignUpData) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: "customer",
          },
          emailRedirectTo,
        },
      });
      setLoading(false);

      if (error) {
        throw error;
      }

      return data;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      throw error;
    }
  }, [supabase]);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
