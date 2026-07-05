import { db } from "@/lib/db";
import type { Decision } from "@prisma/client";
import type { CreateDecisionInput, EvidenceRef, UpdateDecisionInput } from "./types";

/**
 * Decision Memory service (docs 14–15).
 *
 * Rules enforced here:
 *  • Decisions are owned through Company — every operation is user-scoped.
 *  • Evidence refs (signal/insight ids) must belong to the same user's
 *    companies; invalid refs are rejected, never silently dropped
 *    (doc 07, design decision 5).
 *  • Moving to DECIDED stamps decidedAt; only callers (the founder via
 *    the API) trigger transitions — AI never mutates decisions.
 */

export async function listDecisions(userId: string): Promise<Decision[]> {
  return db.decision.findMany({
    where: { company: { userId } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }], // CONSIDERING first
  });
}

export async function createDecision(
  userId: string,
  input: CreateDecisionInput
): Promise<Decision> {
  const company = await db.company.findFirst({
    where: { id: input.companyId, userId },
    select: { id: true },
  });
  if (!company) throw new NotFoundError("Company not found");

  await assertEvidenceOwned(userId, input.evidence);

  return db.decision.create({
    data: {
      companyId: company.id,
      title: input.title,
      context: input.context,
      evidence: input.evidence,
    },
  });
}

export async function updateDecision(
  userId: string,
  decisionId: string,
  input: UpdateDecisionInput
): Promise<Decision> {
  const existing = await db.decision.findFirst({
    where: { id: decisionId, company: { userId } },
  });
  if (!existing) throw new NotFoundError("Decision not found");

  if (input.evidence) await assertEvidenceOwned(userId, input.evidence);

  const becomingDecided = input.status === "DECIDED" && existing.status !== "DECIDED";

  return db.decision.update({
    where: { id: existing.id },
    data: {
      ...input,
      ...(becomingDecided ? { decidedAt: new Date() } : {}),
    },
  });
}

export async function deleteDecision(userId: string, decisionId: string): Promise<void> {
  const { count } = await db.decision.deleteMany({
    where: { id: decisionId, company: { userId } },
  });
  if (count === 0) throw new NotFoundError("Decision not found");
}

/** Every evidence ref must resolve to a signal/insight in the user's companies. */
async function assertEvidenceOwned(userId: string, refs: EvidenceRef[]): Promise<void> {
  if (refs.length === 0) return;

  const signalIds = refs.filter((r) => r.type === "signal").map((r) => r.id);
  const insightIds = refs.filter((r) => r.type === "insight").map((r) => r.id);

  const [signals, insights] = await Promise.all([
    signalIds.length
      ? db.signal.count({ where: { id: { in: signalIds }, company: { userId } } })
      : Promise.resolve(0),
    insightIds.length
      ? db.insight.count({ where: { id: { in: insightIds }, company: { userId } } })
      : Promise.resolve(0),
  ]);

  if (signals !== signalIds.length || insights !== insightIds.length) {
    throw new NotFoundError("One or more evidence references were not found");
  }
}

export class NotFoundError extends Error {}
