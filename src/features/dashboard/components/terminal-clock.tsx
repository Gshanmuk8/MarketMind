"use client";

import { useEffect, useState } from "react";

/**
 * Live command-center clock for the Intelligence Terminal header. Client-only
 * (ticks every second, uses the viewer's timezone) so it never causes a
 * server/client hydration mismatch.
 */
export function TerminalClock() {
  const [now, setNow] = useState<string | null>(null);
  const [zone, setZone] = useState("");

  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      setZone(tz.split("/").pop()?.replace(/_/g, " ") ?? tz);
    } catch {
      setZone("");
    }
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  return (
    <span className="font-data text-xs tracking-[0.2em] tabular-nums">
      {now}
      {zone && <span className="ml-2 text-[var(--t-faint)]">{zone}</span>}
    </span>
  );
}
