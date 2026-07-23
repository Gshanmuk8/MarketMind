import { z } from "zod";

/**
 * Notification contracts (doc 12). Channel config is a discriminated shape
 * per channel type; the API validates it so a malformed destination can
 * never reach an adapter.
 */

/** Channel-specific delivery config. */
export const emailConfigSchema = z.object({ email: z.string().email() });
export const telegramConfigSchema = z.object({
  // Telegram chat ids are numeric (users/groups) or "@channelusername".
  chatId: z.string().min(1).max(64),
});

export const createChannelSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EMAIL"), config: emailConfigSchema }),
  z.object({ type: z.literal("TELEGRAM"), config: telegramConfigSchema }),
]);
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z.union([emailConfigSchema, telegramConfigSchema]).optional(),
    frequency: z
      .enum(["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY", "INSTANT_ONLY"])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes provided." });
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

/** A message ready for any adapter to deliver. */
export interface DeliveryMessage {
  subject: string;
  /** Required plaintext body — every channel can render it. */
  text: string;
  /** Optional rich body — email uses it, plaintext channels ignore it. */
  html?: string;
}

/**
 * Topic taxonomy — stable, namespaced keys monitors set on Signal.topic
 * so channel subscriptions can filter. Topic-less signals fall back to
 * their category group.
 */
export const TOPIC_GROUPS = {
  competitor: ["competitor.product", "competitor.pricing", "competitor.positioning"],
  pricing: ["competitor.pricing"],
  tech: ["tech.openai", "tech.google", "tech.anthropic", "tech.frontier"],
  engineering: ["competitor.engineering"],
  hiring: ["hiring.ai_engineer", "hiring.leadership", "hiring.growth", "hiring.general"],
  customer: ["customer.reviews", "customer.sentiment"],
} as const;
