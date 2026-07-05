import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createDecisionSchema } from "@/features/decisions/types";
import {
  createDecision,
  listDecisions,
  NotFoundError,
} from "@/features/decisions/service";

/** GET /api/decisions — the user's decisions, open questions first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decisions = await listDecisions(user.id);
  return NextResponse.json({ decisions });
}

/** POST /api/decisions — open a strategic question (status CONSIDERING). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const decision = await createDecision(user.id, parsed.data);
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
