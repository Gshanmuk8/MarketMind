import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * The single server-side auth entry point. API routes and server components
 * get the current user from here and nowhere else — swapping the auth
 * provider is a change to this file only.
 *
 * Uses supabase.auth.getUser() (verifies the JWT against Supabase) rather
 * than getSession() (trusts the cookie), and lazily mirrors the auth user
 * into the public `profiles` table so Prisma relations always resolve.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  await db.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, name, avatarUrl },
    update: { email: user.email, name, avatarUrl },
  });

  return { id: user.id, email: user.email, name };
}

/** Like getSessionUser but throws a typed error for route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}
