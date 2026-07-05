"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client — AUTH ONLY (sign in/up/out, OAuth, session).
 * Data always flows through our API routes → Prisma, never supabase.from().
 *
 * NEXT_PUBLIC_* vars are read directly here (not via @/lib/env) because
 * Next.js inlines them at build time only when the literal appears in code.
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
