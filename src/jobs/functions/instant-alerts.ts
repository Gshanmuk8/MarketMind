import { inngest, Events } from "@/jobs/client";
import { deliverInstantAlert } from "@/features/notifications/service";

/**
 * Instant alerts (doc 12) — on every IMPORTANT/CRITICAL signal, push it to
 * the owner's opted-in channels immediately (respecting threshold, topics,
 * and quiet hours). Idempotent per signal so a retry never double-sends.
 */
export const instantAlertsJob = inngest.createFunction(
  { id: "instant-alerts", retries: 1, idempotency: "event.data.signalId" },
  { event: Events.signalRecorded },
  async ({ event, step }) => {
    const { signalId } = event.data as { signalId: string };
    return step.run("deliver", () => deliverInstantAlert(signalId));
  }
);
