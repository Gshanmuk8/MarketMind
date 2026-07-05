import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { NotFoundError, updateCompetitorStatus } from "@/features/competitors/service";
import { inngest, Events } from "@/jobs/client";

const patchSchema = z.object({
  status: z.enum(["TRACKING", "DISMISSED", "SUGGESTED"]),
});

/** PATCH /api/competitors/:id — curate a discovered competitor (track/dismiss). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const competitor = await updateCompetitorStatus(user.id, id, parsed.data.status);

    // Newly tracked → sweep now so the baseline and first threat score land
    // quickly instead of waiting for the next cron. Best-effort: a queue
    // failure must not fail the curation itself.
    if (parsed.data.status === "TRACKING") {
      await inngest.send({ name: Events.monitorTick, data: {} }).catch((error) => {
        console.error("[competitors] failed to queue monitor tick:", error);
      });
    }

    return NextResponse.json({ competitor });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
    }
    throw error;
  }
}
