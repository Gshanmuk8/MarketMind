import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTimelineForUser, isStale } from "@/features/competitor-timeline/service";
import type { TimelineResponse } from "@/features/competitor-timeline/types";
import { inngest, Events } from "@/jobs/client";

/**
 * GET /api/competitors/:id/timeline — the Activity Timeline cache for a
 * competitor the user owns. Returns whatever is cached and, when stale or
 * missing, enqueues a background refresh; the client polls until fresh.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getTimelineForUser(user.id, id);
  if (!result.found) {
    return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
  }

  const cache = result.cache;
  const stale = isStale(cache);

  if (stale) {
    // Kick a generation; harmless if one is already running (serialized +
    // freshness-guarded server-side). Best-effort — never fail the read.
    await inngest
      .send({ name: Events.timelineGenerateRequested, data: { competitorId: id } })
      .catch(() => undefined);
  }

  const body: TimelineResponse = {
    status: cache ? (stale ? "refreshing" : "ready") : "generating",
    timeline: cache?.data ?? null,
    generatedAt: cache?.generatedAt ?? null,
  };
  return NextResponse.json(body);
}
