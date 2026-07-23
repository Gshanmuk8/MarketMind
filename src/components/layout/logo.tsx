import { cn } from "@/lib/utils";

/**
 * The MarketMind mark — a market-radar glyph (concentric rings, a sweep, and
 * a gold blip = the competitor you're tracking). Ties the brand to the
 * Landscape Radar. Uses the light-theme accent/score tokens since it always
 * sits on the light chrome (sidebar / folio / auth / landing).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={cn("shrink-0", className)}>
      <circle cx="14" cy="14" r="11.5" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1.3" />
      <circle cx="14" cy="14" r="7" stroke="var(--color-accent)" strokeOpacity="0.45" strokeWidth="1.3" />
      {/* sweep + blip */}
      <path d="M14 14 L22.8 7.4" stroke="var(--color-accent)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20" cy="9" r="2.5" fill="var(--color-score)" />
      <circle cx="14" cy="14" r="1.7" fill="var(--color-accent)" />
    </svg>
  );
}

/** Full lockup: mark + wordmark (+ optional eyebrow). */
export function Logo({
  eyebrow = true,
  className,
}: {
  eyebrow?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl leading-none tracking-tight text-foreground">
          MarketMind
        </span>
        {eyebrow && <span className="microlabel mt-1.5 block">Competitive Intelligence</span>}
      </span>
    </span>
  );
}
