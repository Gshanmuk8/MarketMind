import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase server client for Server Components, Route Handlers, and
 * Server Actions. Used for AUTH ONLY — all database access goes through
 * Prisma (`@/lib/db`), never through supabase.from().
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — session refresh is handled
          // by middleware, so ignoring the write is safe.
        }
      },
    },
  });
}
