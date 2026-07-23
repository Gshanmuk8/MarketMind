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
    return { company: null, classification: null, signalsLastDay: 0, trackedCount: 0, suggestedCount: 0, topThreat: null, signals: [] as Awaited<ReturnType<typeof listRecentSignals>> };
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
      select: { id: true, name: true, threatScore: true },
    }),
    listRecentSignals(userId, 8),
  ]);

  return { company, classification, signalsLastDay, trackedCount, suggestedCount, topThreat, signals };
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
