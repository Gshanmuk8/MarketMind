import { cn } from "@/lib/utils";

/**
 * Loading placeholder — a still limestone block. No pulse, no shimmer:
 * the composition holds the space calmly until content sets.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-sm bg-border/60", className)} {...props} />;
}
