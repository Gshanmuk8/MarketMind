"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/** Client-side auth actions and current-user hook (Supabase Auth). */
export function useAuth() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const signInWithEmail = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUpWithEmail = (name: string, email: string, password: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        // The confirmation email must land on a route that can complete the
        // sign-in (code exchange), then go straight to onboarding.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

  const signInWithOAuth = async (provider: "google" | "github") => {
    // Preflight: a disabled provider makes Supabase return a raw 400 JSON
    // page after redirect — catch it here and fail with a readable message.
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=${provider}`,
        { redirect: "manual" }
      );
      if (res.status === 400) {
        return {
          data: null,
          error: new Error(
            `${provider === "google" ? "Google" : "GitHub"} sign-in isn't enabled for this project yet — use email, or enable the provider in the Supabase dashboard (Authentication → Providers).`
          ),
        };
      }
    } catch {
      // Network/CORS hiccup — proceed with the normal redirect flow.
    }
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = () => supabase.auth.signOut();

  return { supabase, signInWithEmail, signUpWithEmail, signInWithOAuth, signOut };
}

/** Current Supabase user for client components (topbar avatar, menus). */
export function useCurrentUser() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });
}
