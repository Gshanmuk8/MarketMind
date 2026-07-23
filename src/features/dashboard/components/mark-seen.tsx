"use client";

import { useEffect } from "react";

/**
 * Stamps the briefing as read once, on mount, so the next visit's
 * "new since your last visit" count is measured from now. Renders nothing.
 */
export function MarkSeen() {
  useEffect(() => {
    // Fire-and-forget; a failed stamp just means the next count is unchanged.
    fetch("/api/briefing/seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
