import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { extractDomain } from "@/lib/utils";
import { inngest, Events } from "@/jobs/client";

const createCompanySchema = z.object({
  url: z.string().min(3),
});

/** POST /api/companies — register the user's company and queue analysis. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid company URL is required." }, { status: 400 });
  }

  let domain: string;
  try {
    domain = extractDomain(parsed.data.url);
  } catch {
    return NextResponse.json(
      { error: "That doesn't look like a website. Try something like yourcompany.com" },
      { status: 400 }
    );
  }

  // One company per user: the whole product (dashboard, reports, chat
  // grounding) reads "the" company — a second one would be invisible and
  // silently split the user's intelligence. Point the existing company at a
  // new site via Settings instead.
  const existing = await db.company.findFirst({
    where: { userId: user.id },
    select: { domain: true },
  });
  if (existing && existing.domain !== domain) {
    return NextResponse.json(
      { error: `You're already tracking ${existing.domain}. Change your website in Settings.` },
      { status: 409 }
    );
  }

  // Best-effort kick of the Company Understanding Engine + discovery pipeline.
  // A queue failure must not lose the company — analysis stays PENDING and the
  // client sees `queued: false`, which lets onboarding re-submit to re-queue.
  async function queueAnalysis(companyId: string) {
    try {
      await inngest.send({ name: Events.companyAnalyzeRequested, data: { companyId } });
      return true;
    } catch (error) {
      console.error("[companies] failed to queue analysis:", error);
      return false;
    }
  }

  let company;
  try {
    company = await db.company.create({
      data: {
        userId: user.id,
        url: `https://${domain}`,
        domain,
        analysisStatus: "PENDING",
      },
    });
  } catch (error) {
    // @@unique([userId, domain]) — same company re-submitted. Treat it as an
    // idempotent retry: re-queue analysis so a prior queue failure recovers,
    // rather than dead-ending the user on "already tracking".
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingCompany = await db.company.findFirst({ where: { userId: user.id, domain } });
      if (existingCompany) {
        const queued = await queueAnalysis(existingCompany.id);
        return NextResponse.json({ company: existingCompany, queued }, { status: 200 });
      }
    }
    throw error;
  }

  const queued = await queueAnalysis(company.id);
  return NextResponse.json({ company, queued }, { status: 201 });
}

/** GET /api/companies — list the current user's companies. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await db.company.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ companies });
}
