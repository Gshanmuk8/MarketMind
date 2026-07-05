import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { extractDomain } from "@/lib/utils";
import { inngest, Events } from "@/jobs/client";

const patchSchema = z.union([
  z.object({ action: z.literal("reanalyze") }),
  z.object({ url: z.string().min(3) }),
]);

/**
 * PATCH /api/companies/:id
 *  { action: "reanalyze" } — re-run the understanding + discovery pipeline.
 *  { url }                — point the company at a new website: derived
 *  intelligence (competitors, signals, reports) belongs to the old market
 *  and is cleared; decisions are the founder's own and are kept.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported request." }, { status: 400 });
  }

  const company = await db.company.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  if ("url" in parsed.data) {
    let domain: string;
    try {
      domain = extractDomain(parsed.data.url);
    } catch {
      return NextResponse.json(
        { error: "That doesn't look like a website. Try something like yourcompany.com" },
        { status: 400 }
      );
    }

    try {
      await db.$transaction([
        db.competitor.deleteMany({ where: { companyId: id } }),
        db.signal.deleteMany({ where: { companyId: id } }),
        db.insight.deleteMany({ where: { companyId: id } }),
        db.report.deleteMany({ where: { companyId: id } }),
        // The old market's conversation would poison the strategist's
        // grounding — a new company starts with fresh counsel.
        db.chatThread.deleteMany({ where: { userId: user.id } }),
        db.company.update({
          where: { id },
          data: {
            url: `https://${domain}`,
            domain,
            name: null,
            industry: null,
            description: null,
            businessModel: null,
            targetAudience: null,
            keywords: [],
            analysis: Prisma.DbNull,
            analysisStatus: "PENDING",
          },
        }),
      ]);
    } catch (error) {
      // @@unique([userId, domain]) — another of the user's companies already
      // points at this domain.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "You're already tracking this website." }, { status: 409 });
      }
      throw error;
    }
  } else {
    await db.company.update({ where: { id }, data: { analysisStatus: "PENDING" } });
  }

  await inngest.send({ name: Events.companyAnalyzeRequested, data: { companyId: id } });
  return NextResponse.json({ queued: true }, { status: 202 });
}

/** DELETE /api/companies/:id — remove the company and all derived intelligence. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { count } = await db.company.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  return NextResponse.json({ deleted: true });
}
