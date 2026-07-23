import type { ChannelType } from "@prisma/client";
import type { DeliveryMessage } from "@/features/notifications/types";
import { emailAdapter } from "@/features/notifications/delivery/email";
import { telegramAdapter } from "@/features/notifications/delivery/telegram";

/**
 * Delivery adapter registry (doc 12). Every channel type resolves to one
 * adapter; adding Slack/Discord/WhatsApp is a new file + one line here.
 */
export interface DeliveryAdapter {
  readonly type: ChannelType;
  /** True when the channel's transport secret (API key / bot token) is set. */
  isConfigured(): boolean;
  /** Deliver, or throw — the caller logs SENT/FAILED. */
  send(config: unknown, message: DeliveryMessage): Promise<void>;
}

const adapters: Partial<Record<ChannelType, DeliveryAdapter>> = {
  EMAIL: emailAdapter,
  TELEGRAM: telegramAdapter,
  // SLACK / DISCORD / WHATSAPP / PUSH — reserved (doc 12).
};

export function getAdapter(type: ChannelType): DeliveryAdapter | undefined {
  return adapters[type];
}

/** Channel types a user can actually add right now (adapter present + configured). */
export function availableChannelTypes(): ChannelType[] {
  return (Object.keys(adapters) as ChannelType[]).filter((t) =>
    adapters[t]?.isConfigured()
  );
}
