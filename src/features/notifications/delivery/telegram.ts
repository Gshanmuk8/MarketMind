import { env } from "@/lib/env";
import type { DeliveryMessage } from "@/features/notifications/types";
import type { DeliveryAdapter } from "@/features/notifications/delivery/index";

/**
 * Telegram via the Bot API. The user pastes their chat id (from @userinfobot
 * or a group) after starting a chat with our bot; we sendMessage as HTML.
 */
export const telegramAdapter: DeliveryAdapter = {
  type: "TELEGRAM",

  isConfigured() {
    return Boolean(env.TELEGRAM_BOT_TOKEN);
  },

  async send(config, message: DeliveryMessage) {
    const { chatId } = config as { chatId: string };
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          chat_id: chatId,
          // Telegram HTML supports a small tag subset; render a bold subject
          // over the plaintext body (never the email HTML, which it can't parse).
          text: `<b>${escapeHtml(message.subject)}</b>\n\n${escapeHtml(message.text)}`,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `[notify:telegram] ${res.status} ${res.statusText} — ${detail.slice(0, 300)}`
      );
    }
  },
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
