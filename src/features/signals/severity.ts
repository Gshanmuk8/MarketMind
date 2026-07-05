import type { SignalSeverity } from "@prisma/client";
import type { BadgeProps } from "@/components/ui/badge";

/** Severity → Badge variant, shared by every signal rendering surface. */
export const SEVERITY_BADGE: Record<SignalSeverity, NonNullable<BadgeProps["variant"]>> = {
  INFO: "default",
  NOTABLE: "accent",
  IMPORTANT: "warning",
  CRITICAL: "critical",
};
