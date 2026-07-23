import { db } from "@/lib/db";
import { ai } from "@/lib/ai";

/**
 * Strategy Chat (doc 13): every answer is grounded in the user's own
 * intelligence — company profile, competitors, recent signals, decisions —
 * with citations back to the signals used. The AI never sees other users'
 * data and never mutates anything.
 */

export interface ChatSource {
  type: "signal" | "competitor";
  id: string;
  label: string;
}

/**
 * One default thread per user keeps the MVP simple; threads can multiply
 * later. Oldest-first selection is deterministic: even if a race ever
 * creates a duplicate thread, the same one wins forever after (latest-
 * updated selection made history appear to split between threads).
 */
async function findDefaultThread(userId: string) {
  return db.chatThread.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
}

async function getDefaultThread(userId: string) {
  const existing = await findDefaultThread(userId);
  return existing ?? db.chatThread.create({ data: { userId, title: "Strategy" } });
}

export async function listMessages(userId: string) {
  // Read-only: a GET must not create rows — the thread is minted on first ask.
  const thread = await findDefaultThread(userId);
  if (!thread) return { threadId: null, messages: [] };
  // Newest 50, presented oldest-first — old threads must not freeze the UI.
  const messages = await db.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { threadId: thread.id, messages: messages.reverse() };
}

export async function askStrategist(userId: string, question: string) {
  const thread = await getDefaultThread(userId);

  const company = await db.company.findFirst({
    where: { userId },
    // Same selection rule as the dashboard — the strategist must describe
    // the company the rest of the product shows.
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, industry: true, description: true, keywords: true },
  });
  const [signals, competitors, decisions, history] = await Promise.all([
    db.signal.findMany({
      where: { company: { userId } },
      orderBy: { detectedAt: "desc" },
      take: 25,
      select: { id: true, title: true, whyItMatters: true, category: true, severity: true, competitor: { select: { name: true } } },
    }),
    db.competitor.findMany({
      where: { company: { userId }, status: { not: "DISMISSED" } },
      select: { id: true, name: true, description: true, threatScore: true, status: true },
    }),
    db.decision.findMany({
      where: { company: { userId } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { title: true, status: true, choice: true, rationale: true },
    }),
    db.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { role: true, content: true },
    }),
  ]);

  const userMessage = await db.chatMessage.create({
    data: { threadId: thread.id, role: "USER", content: question },
  });

  const grounding =
    `COMPANY: ${company?.name ?? "not analyzed yet"} — ${company?.industry ?? ""}. ${company?.description ?? ""}\n\n` +
    `COMPETITORS:\n${competitors.map((c) => `[C:${c.id}] ${c.name} (${c.status.toLowerCase()}, threat ${c.threatScore ?? "?"}): ${c.description ?? ""}`).join("\n") || "(none yet)"}\n\n` +
    `RECENT SIGNALS:\n${signals.map((s) => `[S:${s.id}] (${s.category}/${s.severity}${s.competitor ? `, ${s.competitor.name}` : ""}) ${s.title} — ${s.whyItMatters ?? ""}`).join("\n") || "(none yet)"}\n\n` +
    `PAST DECISIONS:\n${decisions.map((d) => `- [${d.status}] ${d.title}${d.choice ? ` → ${d.choice}` : ""}${d.rationale ? ` (why: ${d.rationale})` : ""}`).join("\n") || "(none yet)"}`;

  let res;
  try {
    res = await ai.complete({
      task: "chat",
      temperature: 0.4,
      maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are the founder's strategy analyst. Answer ONLY from the provided intelligence; when you rely on a " +
          "signal or competitor, cite it inline as [S:id] or [C:id]. If the intelligence doesn't cover the question, " +
          "say so plainly — never invent facts. Recommendations must be labeled as recommendations. Be concise and " +
          "direct: a founder's time is the scarcest resource. " +
          "The COMPANY/COMPETITORS/SIGNALS below are the CURRENT truth — if earlier conversation messages describe a " +
          "different company, the user has since switched companies; disregard that history entirely.\n\n" +
          grounding,
      },
      ...history.reverse().map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user", content: question },
    ],
    });
  } catch (error) {
    // Unanswered questions must not pile up in history (and get replayed as
    // grounding on the next successful ask) — retract on failure.
    await db.chatMessage.delete({ where: { id: userMessage.id } }).catch(() => undefined);
    throw error;
  }

  // Resolve inline citations into structured sources for the UI.
  const signalIds = [...new Set([...res.text.matchAll(/\[S:([a-z0-9]+)\]/gi)].map((m) => m[1]))];
  const competitorIds = [...new Set([...res.text.matchAll(/\[C:([a-z0-9]+)\]/gi)].map((m) => m[1]))];
  const sources: ChatSource[] = [
    ...signals.filter((s) => signalIds.includes(s.id)).map((s) => ({ type: "signal" as const, id: s.id, label: s.title.slice(0, 80) })),
    ...competitors.filter((c) => competitorIds.includes(c.id)).map((c) => ({ type: "competitor" as const, id: c.id, label: c.name })),
  ];
  // Citations read better as clean prose in the UI.
  const answer = res.text.replace(/\s*\[(S|C):[a-z0-9]+\]/gi, "").trim();

  const message = await db.chatMessage.create({
    data: { threadId: thread.id, role: "ASSISTANT", content: answer, sources: sources as unknown as object },
  });
  await db.chatThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

  return { threadId: thread.id, message };
}
