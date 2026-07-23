import { cn } from "@/lib/utils";

/**
 * The standard section rhythm across the product: a microlabel eyebrow, an
 * editorial serif title, and an optional one-line description — with an
 * optional actions slot pinned right. Every major section uses this so the
 * vertical cadence (eyebrow → title → sub) is identical everywhere. That
 * repetition is what makes the product feel considered rather than assembled.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  as: Title = "h2",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="microlabel text-faint">{eyebrow}</p>}
        {title && <Title className="display-3 mt-1.5 text-foreground">{title}</Title>}
        {description && (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
