import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";
import { getAdapter } from "@/features/notifications/delivery";
import { renderReportMessage } from "@/features/notifications/render";
import {
  emailConfigSchema,
  telegramConfigSchema,
  type CreateChannelInput,
  type DeliveryMessage,
  type UpdateChannelInput,
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
    },
  });
}

export async function deleteChannel(userId: string, channelId: string): Promise<void> {
  const { count } = await db.notificationChannel.deleteMany({
    where: { id: channelId, userId },
  });
  if (count === 0) throw new NotFoundError("Channel not found");
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
