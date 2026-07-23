import { db } from "@/lib/db";
import type { NotificationChannel, NotificationSettings } from "@prisma/client";
import { getAdapter } from "@/features/notifications/delivery";
import { renderReportMessage } from "@/features/notifications/render";
import { buildDigest, buildInstantAlert, SEVERITY_ORDER } from "@/features/notifications/digest";
import { inQuietHours, isChannelDue, isPaused } from "@/features/notifications/scheduling";
import {
  emailConfigSchema,
  telegramConfigSchema,
  type CreateChannelInput,
  type DeliveryMessage,
  type UpdateChannelInput,
  type UpdateSettingsInput,
} from "@/features/notifications/types";

/**
 * Notification service (doc 12): channel CRUD + report delivery. Every
 * operation is user-scoped; delivery isolates per-channel failures and
 * records a NotificationLog for every attempt.
 */

const MAX_CHANNELS = 10;

export class NotFoundError extends Error {}
export class LimitError extends Error {}
export class ValidationError extends Error {}

export async function listChannels(userId: string): Promise<NotificationChannel[]> {
  return db.notificationChannel.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createChannel(
  userId: string,
  input: CreateChannelInput
): Promise<NotificationChannel> {
  const count = await db.notificationChannel.count({ where: { userId } });
  if (count >= MAX_CHANNELS) {
    throw new LimitError(`You can have at most ${MAX_CHANNELS} channels.`);
  }
  return db.notificationChannel.create({
    data: { userId, type: input.type, config: input.config },
  });
}

export async function updateChannel(
  userId: string,
  channelId: string,
  input: UpdateChannelInput
): Promise<NotificationChannel> {
  const existing = await db.notificationChannel.findFirst({
    where: { id: channelId, userId },
    select: { id: true, type: true },
  });
  if (!existing) throw new NotFoundError("Channel not found");

  // A new config must match THIS channel's type — the update schema accepts
  // either shape, so cross-check here or a TELEGRAM row could be handed an
  // {email} it can never deliver to.
  if (input.config) {
    const schema =
      existing.type === "EMAIL"
        ? emailConfigSchema
        : existing.type === "TELEGRAM"
          ? telegramConfigSchema
          : null;
    if (!schema || !schema.safeParse(input.config).success) {
      throw new ValidationError(`That config doesn't match a ${existing.type.toLowerCase()} channel.`);
    }
  }
  return db.notificationChannel.update({
    where: { id: existing.id },
    data: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.config ? { config: input.config } : {}),
      ...(input.frequency ? { frequency: input.frequency } : {}),
      ...(input.deliveryTime ? { deliveryTime: input.deliveryTime } : {}),
      ...(input.weeklyDay !== undefined ? { weeklyDay: input.weeklyDay } : {}),
      ...(input.monthlyDay !== undefined ? { monthlyDay: input.monthlyDay } : {}),
      ...(input.priorityThreshold ? { priorityThreshold: input.priorityThreshold } : {}),
      ...(input.topics ? { topics: input.topics } : {}),
      ...(input.instantAlerts !== undefined ? { instantAlerts: input.instantAlerts } : {}),
    },
  });
}

export async function deleteChannel(userId: string, channelId: string): Promise<void> {
  const { count } = await db.notificationChannel.deleteMany({
    where: { id: channelId, userId },
  });
  if (count === 0) throw new NotFoundError("Channel not found");
}

/* ── per-user delivery settings (timezone / quiet hours) ─────────────── */

export async function getSettings(userId: string): Promise<NotificationSettings> {
  const existing = await db.notificationSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.notificationSettings.create({ data: { userId } });
}

export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput
): Promise<NotificationSettings> {
  return db.notificationSettings.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}

/**
 * Send a message through one channel and log the attempt. Never throws —
 * returns whether it was delivered so callers can report partial success.
 */
async function sendToChannel(
  channel: NotificationChannel,
  message: DeliveryMessage
): Promise<boolean> {
  const adapter = getAdapter(channel.type);

  // Deliver first, capture the outcome, THEN log — so a transient failure of
  // the log write can never throw out of here and trigger an Inngest step
  // retry that re-sends an already-delivered memo.
  let ok = false;
  let error: string | undefined;
  if (!adapter || !adapter.isConfigured()) {
    error = `No configured adapter for ${channel.type} (missing server credential).`;
  } else {
    try {
      await adapter.send(channel.config, message);
      ok = true;
    } catch (e) {
      error = String(e instanceof Error ? e.message : e).slice(0, 500);
    }
  }

  // Best-effort audit trail; never let a logging failure affect delivery.
  await db.notificationLog
    .create({
      data: {
        channelId: channel.id,
        subject: message.subject,
        body: message.text,
        status: ok ? "SENT" : "FAILED",
        sentAt: ok ? new Date() : null,
        error,
      },
    })
    .catch(() => undefined);

  return ok;
}

/**
 * Deliver a report as the Monday Morning Memo to every enabled channel of
 * the owning user (INSTANT_ONLY channels opt out of digests/reports).
 * Best-effort per channel; returns delivery counts for the job log.
 */
export async function deliverReport(reportId: string) {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { company: true },
  });
  if (!report) return { reportId, delivered: 0, channels: 0, skipped: true as const };

  const channels = await db.notificationChannel.findMany({
    where: {
      userId: report.company.userId,
      enabled: true,
      frequency: { not: "INSTANT_ONLY" },
    },
  });
  if (channels.length === 0) return { reportId, delivered: 0, channels: 0 };

  const message = renderReportMessage(report, report.company);
  let delivered = 0;
  for (const channel of channels) {
    if (await sendToChannel(channel, message)) delivered += 1;
  }
  return { reportId, delivered, channels: channels.length };
}

/** Send a short test message to one channel (Settings "Send test" button). */
export async function sendTest(userId: string, channelId: string) {
  const channel = await db.notificationChannel.findFirst({
    where: { id: channelId, userId },
  });
  if (!channel) throw new NotFoundError("Channel not found");
  const ok = await sendToChannel(channel, {
    subject: "MarketMind AI — test alert",
    text: "This is a test from MarketMind AI. Your channel is connected and ready to receive your intelligence memos.",
  });
  return { ok };
}

/* ── scheduled digests + instant alerts (doc 12) ─────────────────────── */

const DIGEST_SELECT = {
  title: true,
  category: true,
  severity: true,
  whyItMatters: true,
  isInference: true,
  sourceUrl: true,
  topic: true,
  competitor: { select: { name: true } },
} as const;

async function collectDigestSignals(
  userId: string,
  since: Date,
  threshold: NotificationChannel["priorityThreshold"],
  topics: string[]
) {
  const rows = await db.signal.findMany({
    where: { company: { userId }, detectedAt: { gt: since } },
    orderBy: { detectedAt: "desc" },
    take: 100,
    select: DIGEST_SELECT,
  });
  const min = SEVERITY_ORDER[threshold];
  return rows.filter(
    (s) =>
      SEVERITY_ORDER[s.severity] >= min &&
      (topics.length === 0 || (s.topic ? topics.includes(s.topic) : false))
  );
}

/**
 * Per-minute scheduler entry (doc 12). Delivers a digest to every channel
 * whose wall-clock delivery time is now. The watermark (`lastDigestAt`)
 * advances only after a successful send, so a failed send retries the same
 * window; the empty case advances immediately so nothing floods later.
 */
export async function runDueDigests(at: Date = new Date()) {
  const channels = await db.notificationChannel.findMany({
    where: { enabled: true, frequency: { not: "INSTANT_ONLY" } },
    include: { user: { include: { notificationSettings: true } } },
  });

  let sent = 0;
  let due = 0;
  for (const channel of channels) {
    const settings = channel.user.notificationSettings;
    if (isPaused(settings, at)) continue;
    if (!isChannelDue(channel, settings, at)) continue;
    due += 1;

    const since = channel.lastDigestAt ?? new Date(at.getTime() - 7 * 24 * 60 * 60 * 1000);
    const signals = await collectDigestSignals(
      channel.userId,
      since,
      channel.priorityThreshold,
      channel.topics
    );

    if (signals.length === 0) {
      await db.notificationChannel
        .update({ where: { id: channel.id }, data: { lastDigestAt: at } })
        .catch(() => undefined);
      continue;
    }

    if (await sendToChannel(channel, buildDigest(signals))) {
      sent += 1;
      await db.notificationChannel
        .update({ where: { id: channel.id }, data: { lastDigestAt: at } })
        .catch(() => undefined);
    }
  }

  return { checked: channels.length, due, sent };
}

/**
 * Deliver an out-of-schedule instant alert for one IMPORTANT/CRITICAL
 * signal to the owner's opted-in channels, honoring per-channel threshold,
 * topics, and quiet hours (CRITICAL may pierce quiet hours when opted in).
 */
export async function deliverInstantAlert(signalId: string, at: Date = new Date()) {
  const signal = await db.signal.findUnique({
    where: { id: signalId },
    select: { ...DIGEST_SELECT, company: { select: { userId: true } } },
  });
  if (!signal) return { skipped: true as const };
  if (SEVERITY_ORDER[signal.severity] < SEVERITY_ORDER.IMPORTANT) {
    return { skipped: true as const };
  }

  const channels = await db.notificationChannel.findMany({
    where: { userId: signal.company.userId, enabled: true, instantAlerts: true },
    include: { user: { include: { notificationSettings: true } } },
  });

  let sent = 0;
  for (const channel of channels) {
    const settings = channel.user.notificationSettings;
    if (isPaused(settings, at)) continue;
    if (SEVERITY_ORDER[signal.severity] < SEVERITY_ORDER[channel.priorityThreshold]) continue;
    if (channel.topics.length && (!signal.topic || !channel.topics.includes(signal.topic))) continue;
    const quiet = inQuietHours(settings, at);
    if (quiet && !(signal.severity === "CRITICAL" && settings?.criticalOverridesQuiet)) continue;

    if (await sendToChannel(channel, buildInstantAlert(signal))) sent += 1;
  }

  return { skipped: false as const, sent };
}
