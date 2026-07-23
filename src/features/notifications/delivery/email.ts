import { env } from "@/lib/env";
import type { DeliveryMessage } from "@/features/notifications/types";
import type { DeliveryAdapter } from "@/features/notifications/delivery/index";

/**
 * Email via Resend's REST API (no SDK — one fetch, timeout-bounded).
 * The sender is `EMAIL_FROM`; set a verified-domain sender for production
 * (the resend.dev default only delivers to the account owner).
 */
export const emailAdapter: DeliveryAdapter = {
  type: "EMAIL",

  isConfigured() {
    return Boolean(env.RESEND_API_KEY);
  },

  async send(config, message: DeliveryMessage) {
    const { email } = config as { email: string };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: message.subject,
        html: message.html ?? textToHtml(message.text),
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`[notify:email] ${res.status} ${res.statusText} — ${detail.slice(0, 300)}`);
    }
  },
};

/** Minimal fallback when a caller supplies only plaintext. */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre style="font:14px/1.6 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap">${escaped}</pre>`;
}
