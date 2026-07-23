import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { parseAiJson } from "@/lib/ai/json";

/**
 * Decision revisit loop (doc 15). Runs daily per company:
 *
 *  1. Scheduled: DECIDED decisions whose `revisitAt` has passed are flagged
 *     REVISIT with a reminder Insight.
 *  2. Contradiction: recent IMPORTANT/CRITICAL signals are checked against
 *     each DECIDED decision's rationale; when the market has moved AGAINST a
 *     decision, it is flagged REVISIT and an Insight names the signal.
 *
 * The AI only recommends the revisit (status REVISIT + Insight); it never
 * reverses or re-decides — the founder owns those transitions. Insights
 * carry `data.source = "decision-revisit"` so strategy regeneration leaves
 * them intact and each nudge is created at most once.
 */

const REVISIT_SOURCE = "decision-revisit";

interface RevisitInsightData {
  source: typeof REVISIT_SOURCE;
  kind: "due" | "contradiction";
  decisionId: string;
  signalId?: string;
}

interface Contradiction {
  decisionId: string;
  signalId: string;
  explanation: string;
}

export async function runDecisionRevisit(companyId: string) {
  const decisions = await db.decision.findMany({
    where: { companyId, status: { in: ["DECIDED", "REVISIT"] } },
    select: { id: true, title: true, choice: true, rationale: true, status: true, revisitAt: true },
  });
  if (decisions.length === 0) return { companyId, flagged: 0, contradictions: 0 };

  // Existing revisit insights (incl. dismissed) so we never nag twice.
  const existing = await db.insight.findMany({
    where: { companyId, data: { path: ["source"], equals: REVISIT_SOURCE } },
    select: { data: true },
  });
  const seen = new Set(
    existing.map((i) => {
      const d = (i.data ?? {}) as Partial<RevisitInsightData>;
      return `${d.kind}:${d.decisionId}:${d.signalId ?? ""}`;
    })
  );

  let flagged = 0;
  let contradictions = 0;
  const now = Date.now();

  // 1. Scheduled revisits ------------------------------------------------
  for (const decision of decisions) {
    if (
      decision.status === "DECIDED" &&
      decision.revisitAt &&
      new Date(decision.revisitAt).getTime() <= now
    ) {
      const key = `due:${decision.id}:`;
      if (seen.has(key)) continue;
      await flagRevisit(companyId, decision.id, {
        source: REVISIT_SOURCE,
        kind: "due",
        decisionId: decision.id,
      }, {
        title: `Time to re-evaluate: ${decision.title}`.slice(0, 200),
        body: "You scheduled this decision for review and that date has arrived. Re-check it against the latest intelligence and either stand by it or reverse it.",
        competitorId: null,
      });
      seen.add(key);
      flagged += 1;
    }
  }

  // 2. Contradiction check ----------------------------------------------
  const decided = decisions.filter((d) => d.status === "DECIDED" && d.rationale);
  if (decided.length > 0) {
    const signals = await db.signal.findMany({
      where: {
        companyId,
        severity: { in: ["IMPORTANT", "CRITICAL"] },
        detectedAt: { gte: new Date(now - 21 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { detectedAt: "desc" },
      take: 25,
      select: { id: true, title: true, whyItMatters: true, competitorId: true, competitor: { select: { name: true } } },
    });

    if (signals.length > 0) {
      const found = await findContradictions(decided, signals);
      const signalById = new Map(signals.map((s) => [s.id, s]));
      const decisionById = new Map(decided.map((d) => [d.id, d]));

      for (const c of found) {
        const decision = decisionById.get(c.decisionId);
        const signal = signalById.get(c.signalId);
        if (!decision || !signal) continue; // model referenced something not in scope
        const key = `contradiction:${decision.id}:${signal.id}`;
        if (seen.has(key)) continue;

        await flagRevisit(companyId, decision.id, {
          source: REVISIT_SOURCE,
          kind: "contradiction",
          decisionId: decision.id,
          signalId: signal.id,
        }, {
          title: `Market moved against: ${decision.title}`.slice(0, 200),
          body: c.explanation.slice(0, 1000),
          competitorId: signal.competitorId,
        });
        seen.add(key);
        flagged += 1;
        contradictions += 1;
      }
    }
  }

  return { companyId, flagged, contradictions };
}

/** Create the reminder Insight and (idempotently) move DECIDED → REVISIT. */
async function flagRevisit(
  companyId: string,
  decisionId: string,
  data: RevisitInsightData,
  insight: { title: string; body: string; competitorId: string | null }
) {
  await db.$transaction([
    db.insight.create({
      data: {
        companyId,
        competitorId: insight.competitorId,
        type: "STRATEGY",
        title: insight.title,
        body: insight.body,
        impact: "HIGH",
        priority: 90,
        data: data as unknown as object,
      },
    }),
    // Only nudge status forward from DECIDED — never touch REVERSED/REVISIT.
    db.decision.updateMany({
      where: { id: decisionId, status: "DECIDED" },
      data: { status: "REVISIT" },
    }),
  ]);
}

async function findContradictions(
  decisions: { id: string; title: string; choice: string | null; rationale: string | null }[],
  signals: { id: string; title: string; whyItMatters: string | null; competitor: { name: string | null } | null }[]
): Promise<Contradiction[]> {
  try {
    const res = await ai.complete({
      task: "strategy",
      json: true,
      temperature: 0.2,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You audit a founder's recorded decisions against fresh market signals. Identify ONLY decisions the " +
            "recent evidence now CONTRADICTS or undermines — where the market has moved against the reasoning. " +
            'Return strict JSON: { "contradictions": [{ "decisionId": id from the list, "signalId": id from the ' +
            'list, "explanation": one or two sentences naming the tension and what to reconsider }] }. ' +
            "Be conservative: only flag a genuine, specific contradiction. Empty array if none. Never invent ids.",
        },
        {
          role: "user",
          content:
            "DECISIONS:\n" +
            decisions
              .map((d) => `[${d.id}] ${d.title} → chose: ${d.choice ?? "?"} because: ${d.rationale ?? "?"}`)
              .join("\n") +
            "\n\nRECENT SIGNALS:\n" +
            signals
              .map((s) => `[${s.id}] ${s.title}${s.competitor?.name ? ` (${s.competitor.name})` : ""} — ${s.whyItMatters ?? ""}`)
              .join("\n"),
        },
      ],
    });
    const parsed = parseAiJson<{ contradictions?: Partial<Contradiction>[] }>(res.text);
    return (parsed.contradictions ?? []).filter(
      (c): c is Contradiction =>
        typeof c.decisionId === "string" &&
        typeof c.signalId === "string" &&
        typeof c.explanation === "string" &&
        c.explanation.length > 0
    );
  } catch {
    // The scheduled-revisit half already ran; contradictions retry tomorrow.
    return [];
  }
}
