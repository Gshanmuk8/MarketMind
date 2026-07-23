import { ai } from "@/lib/ai";
import { aiText, parseAiJson } from "@/lib/ai/json";
import type { SignalSeverity } from "@prisma/client";

/**
 * The Intelligence Layer — the heart of the product.
 *
 * Raw Event → Context → Business Impact → Strategic Meaning → Recommendation.
 *
 * Every monitor calls enrichSignal() before recordSignal(), so no raw
 * event ever reaches a user without "why it matters" and "what to do".
 * The output is always an AI inference and must be labeled as such.
 */

export interface SignalEnrichment {
  severity: SignalSeverity;
  whyItMatters: string;
  recommendation: string;
  /** 0–1 confidence in the reasoning */
  confidence: number;
}

export interface RawEvent {
  title: string;
  summary: string;
  category: string;
  competitorName?: string;
}

export interface CompanyContext {
  name?: string | null;
  industry?: string | null;
  description?: string | null;
  keywords?: string[];
}

const NEUTRAL_ENRICHMENT: SignalEnrichment = {
  severity: "INFO",
  whyItMatters: "",
  recommendation: "",
  confidence: 0.3,
};

export async function enrichSignal(
  event: RawEvent,
  company: CompanyContext
): Promise<SignalEnrichment> {
  try {
    const res = await ai.complete({
    task: "scoring",
    json: true,
    temperature: 0.2,
    // Reasoning models (gpt-oss/GLM lead the scoring chain) spend hidden
    // tokens; too small a budget truncates the JSON and throws. Give it room.
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You are a competitive-intelligence analyst. Given a market event and the user's company, assess its " +
          "strategic relevance. Return strict JSON: { \"severity\": one of INFO|NOTABLE|IMPORTANT|CRITICAL, " +
          "\"whyItMatters\": one sentence tying the event to THIS company's position, " +
          "\"recommendation\": one concrete action or 'No action needed.', " +
          "\"confidence\": 0-1 }. " +
          "Be conservative with severity: CRITICAL is reserved for events demanding same-week attention.",
      },
      {
        role: "user",
        content:
          `User's company: ${company.name ?? "unknown"} — ${company.industry ?? ""}. ` +
          `${company.description ?? ""}\n\n` +
          `Event (${event.category}${event.competitorName ? `, from ${event.competitorName}` : ""}): ` +
          `${event.title}\n${event.summary}`,
      },
    ],
  });

    const parsed = parseAiJson<Partial<SignalEnrichment>>(res.text);
    const severities: SignalSeverity[] = ["INFO", "NOTABLE", "IMPORTANT", "CRITICAL"];

    return {
      severity: severities.includes(parsed.severity as SignalSeverity)
        ? (parsed.severity as SignalSeverity)
        : "INFO",
      // aiText: a model returning an object/array here must degrade to "",
      // not crash the Prisma write after the watermark already advanced.
      whyItMatters: aiText(parsed.whyItMatters),
      recommendation: aiText(parsed.recommendation),
      confidence: Math.min(
        1,
        Math.max(0, typeof parsed.confidence === "number" ? parsed.confidence : 0.5)
      ),
    };
  } catch {
    // Enrichment must never lose the signal — a truncated/failed AI call
    // records it neutral+labeled rather than throwing out of the monitor loop.
    return NEUTRAL_ENRICHMENT;
  }
}
