import { cn } from "@/lib/utils";

/**
 * Editorial panel — porcelain on the limestone page, closed by a fine
 * hairline. Square, quiet, architectural. Sections may instead be
 * rule-separated (no box) with a `.rule` divider; use a Card when a plate
 * genuinely wants an edge.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]",
        "transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)]",
        "hover:-translate-y-px hover:border-border-strong/15 hover:shadow-[var(--shadow-lifted)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-sans text-sm font-medium tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />;
}
