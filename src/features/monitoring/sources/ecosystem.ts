import { db } from "@/lib/db";
import { ai } from "@/lib/ai";
import { aiText, parseAiJson } from "@/lib/ai/json";
import { enrichSignal } from "@/features/signals/intelligence";
import { recordSignal } from "@/features/signals/service";
import type { SignalCategory } from "@prisma/client";

/**
 * Ecosystem source (doc 09) — market-wide technology and science updates
 * from public feeds: tech press, AI provider announcements, and fresh AI
 * research. Items are AI-filtered per company for relevance, then run
 * through the mandatory Intelligence Layer. Signals are market-wide
 * (competitorId null) with topics like "tech.openai".
 */

interface Feed {
  url: string;
  source: string;
  topic: string;
  category: SignalCategory;
}

const FEEDS: Feed[] = [
  { url: "https://hnrss.org/frontpage", source: "Hacker News", topic: "tech.trends", category: "TECHNOLOGY" },
  {
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=12",
    source: "arXiv cs.AI",
    topic: "science.ai",
    category: "AI_MODELS",
  },
  { url: "https://openai.com/news/rss.xml", source: "OpenAI", topic: "tech.openai", category: "AI_MODELS" },
  { url: "https://blog.google/technology/ai/rss/", source: "Google AI", topic: "tech.google", category: "AI_MODELS" },
  { url: "https://huggingface.co/blog/feed.xml", source: "Hugging Face", topic: "tech.huggingface", category: "AI_MODELS" },
  // Frontier technology — feeds the Technology page
  {
    url: "https://www.technologyreview.com/feed/",
    source: "MIT Technology Review",
    topic: "tech.frontier",
    category: "TECHNOLOGY",
  },
  {
    url: "https://export.arxiv.org/api/query?search_query=cat:quant-ph&sortBy=submittedDate&sortOrder=descending&max_results=8",
    source: "arXiv Quantum",
    topic: "science.quantum",
    category: "TECHNOLOGY",
  },
  { url: "https://arstechnica.com/ai/feed/", source: "Ars Technica", topic: "tech.ai", category: "TECHNOLOGY" },
];

export interface EcosystemItem {
  title: string;
  link: string;
  source: string;
  topic: string;
  category: SignalCategory;
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#0*34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Minimal RSS/Atom item extraction — resilient, dependency-free. */
function parseFeed(xml: string, feed: Feed, max = 10): EcosystemItem[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  const items: EcosystemItem[] = [];

  for (const block of blocks.slice(0, max)) {
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    // RSS: <link>url</link> · Atom: <link href="url"/>
    const link =
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ??
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    if (!title || !link) continue;
    items.push({
      title: decodeEntities(title).slice(0, 200),
      link: decodeEntities(link),
      source: feed.source,
      topic: feed.topic,
      category: feed.category,
    });
  }
  return items;
}

/** Fetch every feed; a dead feed never breaks the sweep. */
export async function collectEcosystemItems(): Promise<EcosystemItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "MarketMindBot/0.1 (+https://marketmind.ai)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return [];
      return parseFeed(await res.text(), feed);
    })
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

interface Pick {
  index: number;
  summary: string;
}

/**
 * For one company: AI-select the few ecosystem items that actually matter
 * to it, enrich each, and record market-wide signals. Dedupes on sourceUrl.
 */
export async function sweepEcosystemForCompany(companyId: string, items: EcosystemItem[]) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, industry: true, description: true, keywords: true },
  });
  if (!company || items.length === 0) return { companyId, signalsRecorded: 0 };

  // Skip anything this company has already seen.
  const seen = await db.signal.findMany({
    where: { companyId, sourceUrl: { in: items.map((i) => i.link) } },
    select: { sourceUrl: true },
  });
  const seenUrls = new Set(seen.map((s) => s.sourceUrl));
  const fresh = items.filter((i) => !seenUrls.has(i.link));
  if (fresh.length === 0) return { companyId, signalsRecorded: 0 };

  const res = await ai.complete({
    task: "extraction",
    json: true,
    temperature: 0.1,
    maxTokens: 600,
    messages: [
      {
        role: "system",
        content:
          "You curate a market-intelligence briefing. From the numbered headlines, pick AT MOST 6 that matter: " +
          "(a) anything strategically relevant to the given company (its stack, market, or the AI ecosystem it depends on), and " +
          "(b) major frontier-technology developments — new AI models, AGI progress, quantum computing breakthroughs, " +
          "significant OpenAI/Anthropic/Google announcements — which count as relevant for every technology company. " +
          'Return strict JSON: { "picks": [{ "index": <number from the list>, "summary": "1-2 factual sentences on what happened" }] }. ' +
          "Skip consumer fluff, listicles, and marketing posts — potent news only.",
      },
      {
        role: "user",
        content:
          `Company: ${company.name ?? "unknown"} — ${company.industry ?? ""}. ${company.description ?? ""}\n` +
          `Keywords: ${company.keywords.join(", ")}\n\nHeadlines:\n` +
          fresh.map((item, i) => `${i}. [${item.source}] ${item.title}`).join("\n"),
      },
    ],
  });

  const { picks } = parseAiJson<{ picks?: Pick[] }>(res.text);
  let signalsRecorded = 0;

  for (const pick of (picks ?? []).slice(0, 6)) {
    const item = typeof pick?.index === "number" ? fresh[pick.index] : undefined;
    const summary = aiText(pick?.summary);
    if (!item || !summary) continue;

    const enrichment = await enrichSignal(
      { title: item.title, summary, category: item.category },
      company
    );

    await recordSignal({
      companyId: company.id,
      category: item.category,
      severity: enrichment.severity,
      topic: item.topic,
      title: item.title,
      summary,
      whyItMatters: enrichment.whyItMatters,
      recommendation: enrichment.recommendation,
      sourceName: item.source,
      sourceUrl: item.link,
      // The summary is model-written from the headline alone (the article
      // body is never fetched) — that's an inference, not a verified fact.
      isInference: true,
      confidence: enrichment.confidence,
    });
    signalsRecorded += 1;
  }

  return { companyId, signalsRecorded };
}
