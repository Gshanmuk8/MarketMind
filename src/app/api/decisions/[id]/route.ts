import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateDecisionSchema } from "@/features/decisions/types";
import {
  deleteDecision,
  NotFoundError,
  updateDecision,
} from "@/features/decisions/service";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/decisions/:id — edit, decide, transition status/outcome. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    // Clients render `error` only when it's a string — a flattened object
    // would surface as the generic "Request failed."
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Invalid request." },
      { status: 400 }
    );
  }

  try {
    const decision = await updateDecision(user.id, id, parsed.data);
    return NextResponse.json({ decision });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

/** DELETE /api/decisions/:id */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await deleteDecision(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
