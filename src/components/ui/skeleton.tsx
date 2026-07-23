import { cn } from "@/lib/utils";

/**
 * Loading placeholder — a limestone block with a soft light sweep, so the
 * composition reads as actively loading rather than broken, and settles
 * gracefully into content. Stills itself under prefers-reduced-motion.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-md bg-border/50", className)} {...props} />;
}
