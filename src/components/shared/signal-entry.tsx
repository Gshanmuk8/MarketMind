import Link from "next/link";
import type { Signal } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_BADGE } from "@/features/signals/severity";

interface SignalEntryProps {
  signal: Signal;
  /** Shown before the category when the feed spans competitors. */
  competitorName?: string | null;
}

/**
 * One briefing entry. Trust tiers are typeset distinctly (product rule):
 * verified facts plain with source, inferences badged, recommendations labeled.
 */
export function SignalEntry({ signal, competitorName }: SignalEntryProps) {
  return (
    <li className="border-b border-border py-6">
      <div className="flex flex-wrap items-center gap-3">
        {competitorName && <span className="microlabel text-muted">{competitorName}</span>}
        <span className="microlabel">{signal.category.toLowerCase().replace(/_/g, " ")}</span>
        <Badge variant={SEVERITY_BADGE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
        <span className="microlabel ml-auto">
          {signal.detectedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <h3 className="mt-3 font-sans text-base font-medium">{signal.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{signal.summary}</p>
      {signal.sourceUrl && (
        <Link
          href={signal.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-live hover:underline"
        >
          {signal.sourceName ?? "Source"} ↗
        </Link>
      )}

      {signal.whyItMatters && (
        <div className="mt-4">
          <span className="flex items-center gap-2">
            <span className="microlabel">Why it matters</span>
            <Badge variant="inference">
              AI inference
              {signal.confidence != null && ` · ${Math.round(signal.confidence * 100)}%`}
            </Badge>
          </span>
          <p className="mt-2 text-sm leading-relaxed text-muted">{signal.whyItMatters}</p>
        </div>
      )}

      {signal.recommendation && (
        <div className="mt-3">
          <span className="microlabel">Recommended action</span>
          <p className="mt-2 text-sm leading-relaxed text-muted">{signal.recommendation}</p>
        </div>
      )}
    </li>
  );
}
