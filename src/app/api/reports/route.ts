import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listReports } from "@/features/reports/service";
import { inngest, Events } from "@/jobs/client";

/** GET /api/reports — the user's report archive. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ reports: await listReports(user.id) });
}

/** POST /api/reports — generate a weekly report for the user's company now. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await db.company.findFirst({
    where: { userId: user.id, analysisStatus: "COMPLETE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json(
      { error: "Complete company analysis first — a report needs signals to summarize." },
      { status: 400 }
    );
  }

  await inngest.send({ name: Events.reportGenerate, data: { companyId: company.id } });
  return NextResponse.json({ queued: true }, { status: 202 });
}
