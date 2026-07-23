import { db } from "@/lib/db";
import { ai } from "@/lib/ai";

/**
 * Conversational market query — a one-shot, grounded answer to a founder's
 * question about their own market. Reuses the same intelligence grounding as
 * the strategist chat but returns a concise, scannable answer + cited
 * sources (Perplexity-style), and never persists a conversation.
 */

export interface AskSource {
  type: "signal" | "competitor";
  id: string;
  label: string;
}

export async function answerMarketQuestion(
  userId: string,
  question: string
): Promise<{ answer: string; sources: AskSource[] }> {
  const company = await db.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { name: true, industry: true, description: true },
  });

  const [signals, competitors, decisions] = await Promise.all([
    db.signal.findMany({
      where: { company: { userId } },
      orderBy: { detectedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        whyItMatters: true,
        category: true,
        severity: true,
        competitor: { select: { name: true } },
      },
    }),
    db.competitor.findMany({
      where: { company: { userId }, status: { not: "DISMISSED" } },
      orderBy: { threatScore: { sort: "desc", nulls: "last" } },
      take: 20,
      select: { id: true, name: true, description: true, threatScore: true, status: true },
    }),
    db.decision.findMany({
      where: { company: { userId } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { title: true, status: true, choice: true },
    }),
  ]);

  const grounding =
    `COMPANY: ${company?.name ?? "not analyzed yet"} — ${company?.industry ?? ""}. ${company?.description ?? ""}\n\n` +
    `COMPETITORS:\n${
      competitors
        .map(
          (c) =>
            `[C:${c.id}] ${c.name} (${c.status.toLowerCase()}, threat ${c.threatScore ?? "?"}): ${c.description ?? ""}`
        )
        .join("\n") || "(none yet)"
    }\n\n` +
    `RECENT SIGNALS:\n${
      signals
        .map(
          (s) =>
            `[S:${s.id}] (${s.category}/${s.severity}${s.competitor ? `, ${s.competitor.name}` : ""}) ${s.title} — ${s.whyItMatters ?? ""}`
        )
        .join("\n") || "(none yet)"
    }\n\n` +
    `DECISIONS:\n${
      decisions.map((d) => `- [${d.status}] ${d.title}${d.choice ? ` → ${d.choice}` : ""}`).join("\n") ||
      "(none yet)"
    }`;

  const res = await ai.complete({
    task: "chat",
    temperature: 0.3,
    maxTokens: 650,
    messages: [
      {
        role: "system",
        content:
          "You are the founder's market-intelligence engine. Answer like a research answer, NOT a chatbot: " +
          "lead with a direct one-line answer, then 2–4 tight supporting points (each ideally naming a specific " +
          "competitor or signal). Cite inline as [C:id] or [S:id] using ONLY the ids provided below. Ground every " +
          "claim strictly in the intelligence below; if it doesn't cover the question, say so in one line and " +
          "suggest what to track. No greetings, no sign-offs, no 'as an AI', no filler.\n\n" +
          grounding,
      },
      { role: "user", content: question },
    ],
  });

  const text = res.text ?? "";
  const ids = (re: RegExp) =>
    [...new Set([...text.matchAll(re)].map((m) => m[1]).filter((x): x is string => Boolean(x)))];
  const signalIds = ids(/\[S:([a-z0-9]+)\]/gi);
  const competitorIds = ids(/\[C:([a-z0-9]+)\]/gi);

  const sources: AskSource[] = [
    ...competitors
      .filter((c) => competitorIds.includes(c.id))
      .map((c) => ({ type: "competitor" as const, id: c.id, label: c.name })),
    ...signals
      .filter((s) => signalIds.includes(s.id))
      .map((s) => ({ type: "signal" as const, id: s.id, label: s.title.slice(0, 80) })),
  ];

  const answer = text.replace(/\s*\[(S|C):[a-z0-9]+\]/gi, "").trim();
  return { answer, sources };
}
