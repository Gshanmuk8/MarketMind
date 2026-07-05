"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Confirmation/OAuth links can land with session tokens in the URL hash,
 * which only the browser client can consume. Mounted on public pages
 * (landing, login, signup): the moment a session exists — freshly minted
 * from the URL or already in cookies — move the user into the product.
 */
export function SessionRedirect({ to = "/dashboard" }: { to?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  useEffect(() => {
    let cancelled = false;

    // Creating the client triggers detectSessionInUrl; getSession() resolves
    // after any hash tokens have been consumed into cookies.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        router.replace(to);
        router.refresh();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace(to);
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, router, to]);

  return null;
}
