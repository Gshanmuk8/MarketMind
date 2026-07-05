import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-muted",
        accent: "border-accent/30 bg-accent/10 text-accent",
        live: "border-live/30 bg-live/10 text-live",
        score: "border-score/30 bg-score/10 text-score",
        warning: "border-warning/30 bg-warning/10 text-warning",
        critical: "border-critical/30 bg-critical/10 text-critical",
        /** Marks AI-reasoned conclusions vs verified facts — a core product rule. */
        inference: "border-inference/40 bg-inference/10 text-inference",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
