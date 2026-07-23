import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { LAST_SEEN_COOKIE } from "@/features/dashboard/constants";

/**
 * POST /api/briefing/seen — stamp "now" as the last time the founder read
 * the briefing, so the dashboard can show "N new since your last visit".
 * Per-device by design (a cookie); intentionally lightweight — no DB write.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await cookies();
  store.set(LAST_SEEN_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
