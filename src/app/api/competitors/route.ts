import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listCompetitors } from "@/features/competitors/service";

/** GET /api/competitors — the user's competitive landscape (non-dismissed). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const competitors = await listCompetitors(user.id);
  return NextResponse.json({ competitors });
}
