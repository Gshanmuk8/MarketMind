/**
 * Competitor Activity Timeline contracts (doc 10). Additive: cached in
 * `Competitor.profile.timeline`, surfaced on the dossier, never replacing
 * the existing signal stream or analysis.
 */

export type TimelineWindow = "day" | "week" | "month" | "year";

export interface TimelineItem {
  /** e.g. "Product", "Pricing", "Marketing", "Funding", "Hiring". */
  category: string;
  title: string;
  detail: string;
  /** true = grounded in a real collected signal; false = public-knowledge inference. */
  observed: boolean;
}

export interface TimelineBucket {
  /** Short narrative for the window (may be empty for the 24h bucket). */
  summary: string;
  items: TimelineItem[];
}

export interface AdoptionIntel {
  useCases: string[];
  popularFeatures: string[];
  industries: string[];
  /** One or two sentences on overall user sentiment. */
  sentiment: string;
  /** Themes from public community discussion (HN/Reddit/X/LinkedIn). */
  communityThemes: string[];
  painPoints: string[];
  requestedFeatures: string[];
}

export interface TimelineData {
  buckets: Record<TimelineWindow, TimelineBucket>;
  adoption: AdoptionIntel;
}

/** What is stored in `Competitor.profile.timeline`. */
export interface TimelineCache {
  data: TimelineData;
  /** ISO timestamp of generation. */
  generatedAt: string;
  model?: string;
}

/** Shape returned by the API to the client. */
export interface TimelineResponse {
  status: "ready" | "generating" | "refreshing" | "unavailable";
  timeline: TimelineData | null;
  generatedAt: string | null;
}

export const TIMELINE_WINDOWS: { key: TimelineWindow; label: string; blurb: string }[] = [
  { key: "day", label: "Last 24 hours", blurb: "Newest activity" },
  { key: "week", label: "Last week", blurb: "Rolling 7 days" },
  { key: "month", label: "Last month", blurb: "Rolling 30 days" },
  { key: "year", label: "Last year", blurb: "Rolling 365 days" },
];
