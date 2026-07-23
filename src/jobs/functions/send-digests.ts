import { inngest } from "@/jobs/client";
import { runDueDigests } from "@/features/notifications/service";

/**
 * Scheduled digest delivery (doc 12) — runs every 5 minutes and delivers a
 * signal digest to each channel whose wall-clock delivery time falls in the
 * current 5-minute bucket, in the user's timezone. 5-min (not per-minute)
 * keeps Inngest run volume sane while honoring any chosen HH:MM. All
 * scheduling logic and watermarking live in the service; this is the beat.
 */
export const sendDigestsJob = inngest.createFunction(
  { id: "send-digests", retries: 1, concurrency: { limit: 1 } },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    return step.run("deliver-due", () => runDueDigests(new Date()));
  }
);
