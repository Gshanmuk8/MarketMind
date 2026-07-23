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

/** "HH:MM" 24-hour, minute precision. */
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).");

export const frequencyEnum = z.enum(["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY", "INSTANT_ONLY"]);
export const severityEnum = z.enum(["INFO", "NOTABLE", "IMPORTANT", "CRITICAL"]);

export const updateChannelSchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z.union([emailConfigSchema, telegramConfigSchema]).optional(),
    // Schedule
    frequency: frequencyEnum.optional(),
    deliveryTime: timeOfDay.optional(),
    /** 1 (Mon) – 7 (Sun); used by WEEKLY. */
    weeklyDay: z.number().int().min(1).max(7).optional(),
    /** 1–28; used by MONTHLY. */
    monthlyDay: z.number().int().min(1).max(28).optional(),
    // Content filter
    priorityThreshold: severityEnum.optional(),
    topics: z.array(z.string().max(64)).max(50).optional(),
    /** Deliver IMPORTANT/CRITICAL the moment they happen, out of schedule. */
    instantAlerts: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes provided." });
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

/** Per-user delivery rules that apply across every channel. */
export const updateSettingsSchema = z
  .object({
    /** IANA timezone, e.g. "Asia/Kolkata". */
    timezone: z.string().min(1).max(64).optional(),
    quietHoursStart: timeOfDay.nullable().optional(),
    quietHoursEnd: timeOfDay.nullable().optional(),
    criticalOverridesQuiet: z.boolean().optional(),
    weekendPause: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes provided." });
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

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
