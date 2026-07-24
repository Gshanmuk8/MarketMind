import { z } from "zod";

/**
 * Validated server environment. Import `env` instead of reading
 * `process.env` directly — misconfiguration fails loudly at boot,
 * not silently at request time.
 *
 * Exception: NEXT_PUBLIC_* reads in client components/middleware must use
 * the `process.env.NEXT_PUBLIC_X` literal so Next.js can inline them.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Supabase — database (Prisma) + auth + storage
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /// Server-only: bypasses RLS — for admin jobs and Storage writes. NEVER expose.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // AI providers — OpenRouter is the only one required to run.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /// Optional: raises GitHub API rate limits for the engineering monitor.
  GITHUB_TOKEN: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  /// Verified Resend sender. The default only delivers to the Resend
  /// account owner's inbox — set a verified domain sender for production.
  EMAIL_FROM: z.string().default("MarketMind AI <onboarding@resend.dev>"),
}).superRefine((val, ctx) => {
  // In production the Inngest webhook (/api/inngest) is internet-reachable and
  // drives privileged background work, so its signing key MUST be present or
  // an attacker could POST forged jobs. Required at RUNTIME only — skip the
  // build phase, where prod secrets aren't (and needn't be) available.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (!isBuild && val.NODE_ENV === "production" && !val.INNGEST_SIGNING_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["INNGEST_SIGNING_KEY"],
      message: "Required in production — signs incoming Inngest webhook calls.",
    });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Deploy logs must name the exact offender — a raw ZodError is unreadable.
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(" · ");
  throw new Error(
    `[env] Invalid or missing environment variables → ${details}. ` +
      `Set them in your host's environment settings (values WITHOUT quotes), then redeploy.`
  );
}
export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
