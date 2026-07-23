import { db } from "@/lib/db";
import type { SignalSeverity } from "@prisma/client";
import { countSignalsLastDay, listRecentSignals } from "@/features/signals/service";
import {
  CATEGORY_LABEL,
  isCompetitiveTarget,
  type WebsiteCategory,
} from "@/features/company-analysis/service";

/** Read the site classification off the stored analysis JSON (if present). */
function readClassification(analysis: unknown) {
  const a = (analysis ?? {}) as {
    category?: string;
    confidence?: number;
    classification?: string;
    signals?: unknown;
  };
  const category =
    a.category && (a.category as WebsiteCategory) in CATEGORY_LABEL
      ? (a.category as WebsiteCategory)
      : null;
  if (!category) return null;
  const confidence =
    typeof a.confidence === "number" && Number.isFinite(a.confidence)
      ? Math.min(1, Math.max(0, a.confidence))
      : null;
  const signals = Array.isArray(a.signals)
    ? a.signals.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 6)
    : [];
  return {
    category,
    label: CATEGORY_LABEL[category],
    reason: a.classification ?? "",
    confidence,
    signals,
    competitive: isCompetitiveTarget({ category, confidence: a.confidence ?? 0 }),
  };
}

/**
 * The morning briefing — everything the dashboard needs, gathered in one
 * user-scoped read so the page stays a thin server component.
 */
export async function getBriefing(userId: string) {
  const company = await db.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!company) {
    return { company: null, classification: null, signalsLastDay: 0, trackedCount: 0, suggestedCount: 0, topThreat: null, topThreatBrief: null, signals: [] as Awaited<ReturnType<typeof listRecentSignals>> };
  }

  const classification = readClassification(company.analysis);

  const [signalsLastDay, trackedCount, suggestedCount, topThreat, signals] = await Promise.all([
    countSignalsLastDay(userId),
    db.competitor.count({ where: { company: { userId }, status: "TRACKING" } }),
    db.competitor.count({ where: { company: { userId }, status: "SUGGESTED" } }),
    db.competitor.findFirst({
      // Suggested rivals carry baseline scores too — the figure is never empty.
      where: { company: { userId }, status: { not: "DISMISSED" }, threatScore: { not: null } },
      orderBy: { threatScore: "desc" },
      select: {
        id: true,
        name: true,
        threatScore: true,
        similarityScore: true,
        marketPosition: true,
        // Why it ranks first — the composition behind the score.
        scoreSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { breakdown: true } },
        // What they're doing now — the newest observation.
        signals: {
          orderBy: { detectedAt: "desc" },
          take: 1,
          select: {
            title: true,
            whyItMatters: true,
            recommendation: true,
            severity: true,
            category: true,
            detectedAt: true,
            sourceUrl: true,
            sourceName: true,
            isInference: true,
            confidence: true,
          },
        },
        // How to compete — the strategic reads already synthesised for them.
        insights: {
          where: { dismissed: false },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 2,
          select: { title: true, body: true, type: true },
        },
      },
    }),
    listRecentSignals(userId, 8),
  ]);

  const topThreatBrief = topThreat ? buildTopThreatBrief(topThreat) : null;

  return { company, classification, signalsLastDay, trackedCount, suggestedCount, topThreat, topThreatBrief, signals };
}

/* ── Top-threat brief — why #1, what they're doing, how to compete ─────
   Pure assembly of intelligence we already store (score composition, newest
   signal, strategic insights). No new AI call runs on the dashboard read. */

export interface TopThreatBrief {
  id: string;
  name: string;
  threatScore: number;
  similarityPct: number | null;
  marketPosition: string | null;
  drivers: { label: string; value: number }[];
  latest: {
    title: string;
    whyItMatters: string | null;
    recommendation: string | null;
    severity: SignalSeverity;
    category: string;
    detectedAt: Date;
    sourceUrl: string | null;
    sourceName: string | null;
    isInference: boolean;
    confidence: number | null;
  } | null;
  plays: { title: string; body: string; type: string }[];
}

function humanizeFactor(key: string) {
  const s = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

type TopThreatRow = {
  id: string;
  name: string | null;
  threatScore: number | null;
  similarityScore: number | null;
  marketPosition: string | null;
  scoreSnapshots: { breakdown: unknown }[];
  signals: TopThreatBrief["latest"][];
  insights: { title: string; body: string; type: string }[];
};

function buildTopThreatBrief(t: TopThreatRow): TopThreatBrief {
  const breakdown = (t.scoreSnapshots[0]?.breakdown ?? null) as Record<string, number> | null;
  const drivers = breakdown
    ? Object.entries(breakdown)
        .filter(([, v]) => typeof v === "number")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => ({ label: humanizeFactor(k), value: Math.round(v) }))
    : [];
  return {
    id: t.id,
    name: t.name ?? "This competitor",
    threatScore: t.threatScore ?? 0,
    similarityPct: t.similarityScore != null ? Math.round(t.similarityScore * 100) : null,
    marketPosition: t.marketPosition ?? null,
    drivers,
    latest: t.signals[0] ?? null,
    plays: t.insights,
  };
}

/* ── Signal Momentum — severity-weighted signal intensity over time ──── */

const SEV_WEIGHT: Record<SignalSeverity, number> = {
  INFO: 1,
  NOTABLE: 2,
  IMPORTANT: 4,
  CRITICAL: 8,
};
const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

export interface MomentumDay {
  date: string; // YYYY-MM-DD (UTC)
  label: string; // "Nov 4"
  count: number;
  weight: number; // severity-weighted intensity
  reason?: string; // the day's most-important signal (for spike callouts)
  peak: boolean; // an IMPORTANT/CRITICAL signal landed this day
}

/**
 * Daily severity-weighted signal intensity for the trailing `days`, so the
 * dashboard can chart momentum (not just counts) with spike markers.
 */
export async function getSignalMomentum(userId: string, days = 30): Promise<MomentumDay[]> {
  const now = Date.now();
  const since = new Date(now - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db.signal.findMany({
    where: { company: { userId }, detectedAt: { gte: since } },
    orderBy: { detectedAt: "asc" },
    select: {
      detectedAt: true,
      severity: true,
      title: true,
      competitor: { select: { name: true } },
    },
  });

  const buckets = new Map<
    string,
    { count: number; weight: number; topSev: number; reason?: string }
  >();
  for (const s of rows) {
    const key = utcDay(s.detectedAt);
    const b = buckets.get(key) ?? { count: 0, weight: 0, topSev: 0 };
    const w = SEV_WEIGHT[s.severity];
    b.count += 1;
    b.weight += w;
    if (w >= b.topSev) {
      b.topSev = w;
      b.reason = `${s.competitor?.name ? `${s.competitor.name}: ` : ""}${s.title}`;
    }
    buckets.set(key, b);
  }

  const out: MomentumDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = utcDay(d);
    const b = buckets.get(key);
    out.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count: b?.count ?? 0,
      weight: b?.weight ?? 0,
      reason: b?.reason,
      peak: (b?.topSev ?? 0) >= SEV_WEIGHT.IMPORTANT,
    });
  }
  return out;
}
