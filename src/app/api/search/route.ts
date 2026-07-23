import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

/** GET /api/search?q= — palette search across the user's intelligence. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ competitors: [], signals: [], decisions: [], reports: [] });
  }

  // Escape LIKE wildcards — "100%" must match literally, not as a pattern.
  const literal = q.replace(/[\\%_]/g, "\\$&");
  const contains = { contains: literal, mode: "insensitive" as const };
  const [competitors, signals, decisions, reports] = await Promise.all([
    db.competitor.findMany({
      where: { company: { userId: user.id }, status: { not: "DISMISSED" }, name: contains },
      select: { id: true, name: true },
      take: 5,
    }),
    db.signal.findMany({
      where: { company: { userId: user.id }, title: contains },
      orderBy: { detectedAt: "desc" },
      select: { id: true, title: true, competitorId: true },
      take: 5,
    }),
    db.decision.findMany({
      where: { company: { userId: user.id }, title: contains },
      select: { id: true, title: true },
      take: 5,
    }),
    db.report.findMany({
      where: { company: { userId: user.id }, title: contains },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ competitors, signals, decisions, reports });
}
