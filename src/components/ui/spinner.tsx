import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single loading mark used everywhere something is in flight. Inherits
 * the current text color (so it reads as accent/muted per context) and
 * stills itself under `prefers-reduced-motion` — the one sanctioned bit of
 * motion in an otherwise still, editorial system, reserved for "working…".
 */
export function Spinner({
  className,
  label = "Loading",
  ...props
}: React.SVGProps<SVGSVGElement> & { label?: string }) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      strokeWidth={1.75}
      className={cn("size-4 animate-spin text-current motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
