import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTimelineForUser, isStale, isTimelineEmpty } from "@/features/competitor-timeline/service";
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
  // An empty cache (e.g. an older weak generation) is treated like stale so a
  // fresh, richer generation replaces it and the client keeps polling for it.
  const empty = isTimelineEmpty(cache);
  const needsRefresh = isStale(cache) || empty;

  if (needsRefresh) {
    // Kick a generation; harmless if one is already running (serialized +
    // freshness/empty-cooldown-guarded server-side). Best-effort.
    await inngest
      .send({ name: Events.timelineGenerateRequested, data: { competitorId: id } })
      .catch(() => undefined);
  }

  const body: TimelineResponse = {
    status: !cache ? "generating" : needsRefresh ? "refreshing" : "ready",
    timeline: cache?.data ?? null,
    generatedAt: cache?.generatedAt ?? null,
  };
  return NextResponse.json(body);
}
