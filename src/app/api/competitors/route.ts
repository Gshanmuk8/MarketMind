import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCompetitorMomentum, listCompetitors } from "@/features/competitors/service";

/** GET /api/competitors — the user's competitive landscape (non-dismissed) + momentum. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [competitors, momentum] = await Promise.all([
    listCompetitors(user.id),
    getCompetitorMomentum(user.id),
  ]);
  return NextResponse.json({ competitors, momentum });
}
