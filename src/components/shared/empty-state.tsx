import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

/**
 * Empty screens are set like a colophon page: a quiet mark, a serif line,
 * and clear guidance — never a blank div.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  eyebrow = "Nothing recorded yet",
  action,
}: EmptyStateProps) {
  return (
    <div className="rise flex min-h-[300px] flex-col items-center justify-center px-4 py-14 text-center sm:min-h-[380px] sm:px-6 sm:py-20">
      <div
        aria-hidden
        className="mb-8 flex size-16 items-center justify-center rounded-full border border-border bg-surface shadow-[var(--shadow-card)]"
      >
        <Icon className="size-6 text-accent/70" strokeWidth={1.5} />
      </div>
      <p className="microlabel mb-4">{eyebrow}</p>
      <h3 className="font-display text-2xl text-foreground">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-8">{action}</div>}
      <span aria-hidden className="mt-10 block h-px w-16 bg-border-strong" />
    </div>
  );
}
