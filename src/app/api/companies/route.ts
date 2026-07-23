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
    // @@unique([userId, domain]) — the company was already added.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "You're already tracking this company." },
        { status: 409 }
      );
    }
    throw error;
  }

  // Kick off the Company Understanding Engine + competitor discovery pipeline.
  // A queue failure must not lose the created company — analysis stays
  // PENDING and can be retried; the client sees `queued: false`.
  let queued = true;
  try {
    await inngest.send({
      name: Events.companyAnalyzeRequested,
      data: { companyId: company.id },
    });
  } catch (error) {
    queued = false;
    console.error("[companies] failed to queue analysis:", error);
  }

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
