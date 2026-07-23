import type { NotificationChannel, NotificationSettings } from "@prisma/client";

/**
 * Scheduling logic (doc 12) — pure and unit-testable. Wall-clock time comes
 * from Intl.DateTimeFormat in the user's timezone, so DST is handled
 * implicitly and we never do UTC-offset arithmetic.
 */

export interface WallClock {
  hour: number;
  minute: number;
  /** 1 (Mon) – 7 (Sun). */
  weekday: number;
  /** Day of month, 1–31. */
  day: number;
  /** "HH:MM". */
  hhmm: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Break an instant into wall-clock parts for a timezone. */
export function wallClock(timezone: string, at: Date): WallClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
  } catch {
    // Invalid timezone string — fall back to UTC rather than throw.
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
  }
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour ?? "0", 10);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  const minute = parseInt(map.minute ?? "0", 10);
  return {
    hour,
    minute,
    weekday: WEEKDAY_INDEX[map.weekday ?? "Mon"] ?? 1,
    day: parseInt(map.day ?? "1", 10),
    hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

const tzOf = (settings: NotificationSettings | null | undefined) => settings?.timezone || "UTC";

/** All delivery paused? (vacation / snooze / weekend) */
export function isPaused(settings: NotificationSettings | null | undefined, at: Date): boolean {
  if (!settings) return false;
  if (settings.vacationUntil && settings.vacationUntil.getTime() > at.getTime()) return true;
  if (settings.snoozeUntil && settings.snoozeUntil.getTime() > at.getTime()) return true;
  if (settings.weekendPause) {
    const wd = wallClock(tzOf(settings), at).weekday;
    if (wd === 6 || wd === 7) return true;
  }
  return false;
}

/**
 * Is this channel due for its scheduled digest at `at`? True only on the
 * exact wall-clock minute of `deliveryTime` on a matching day — so the
 * per-minute cron fires each digest once.
 */
export function isChannelDue(
  channel: Pick<NotificationChannel, "frequency" | "deliveryTime" | "weeklyDay" | "monthlyDay">,
  settings: NotificationSettings | null | undefined,
  at: Date
): boolean {
  if (channel.frequency === "INSTANT_ONLY") return false;
  const wc = wallClock(tzOf(settings), at);
  // Match to a 5-minute bucket (the send-digests cron runs every 5 min to
  // keep Inngest run volume sane), so any chosen HH:MM fires once per day.
  const [dh, dm] = channel.deliveryTime.split(":").map((n) => parseInt(n, 10));
  if (wc.hour !== dh || Math.floor(wc.minute / 5) !== Math.floor((dm || 0) / 5)) return false;

  switch (channel.frequency) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return wc.weekday >= 1 && wc.weekday <= 5;
    case "WEEKLY":
      return wc.weekday === (channel.weeklyDay ?? 1);
    case "MONTHLY":
      return wc.day === (channel.monthlyDay ?? 1);
    default:
      return false;
  }
}

/** Within quiet hours? (applies to instant alerts; may wrap midnight) */
export function inQuietHours(settings: NotificationSettings | null | undefined, at: Date): boolean {
  if (!settings?.quietHoursStart || !settings.quietHoursEnd) return false;
  const now = wallClock(tzOf(settings), at).hhmm;
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  if (start === end) return false;
  // Non-wrapping window (e.g. 09:00–17:00) vs wrapping (e.g. 22:00–07:00).
  return start < end ? now >= start && now < end : now >= start || now < end;
}
