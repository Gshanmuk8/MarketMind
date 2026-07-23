import { env } from "@/lib/env";
import type { Signal, SignalSeverity } from "@prisma/client";
import type { DeliveryMessage } from "@/features/notifications/types";

/**
 * Digest + instant-alert rendering (doc 12). Plaintext is authoritative;
 * HTML is an email enhancement. Signals already carry the Intelligence
 * Layer's `whyItMatters`, so a digest is a grouped, provenance-marked
 * readout — no extra AI call.
 */

export const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  INFO: 0,
  NOTABLE: 1,
  IMPORTANT: 2,
  CRITICAL: 3,
};

type DigestSignal = Pick<
  Signal,
  "title" | "category" | "severity" | "whyItMatters" | "isInference" | "sourceUrl"
> & { competitor?: { name: string | null } | null };

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cat = (c: string) => c.toLowerCase().replace(/_/g, " ");

/** Group signals into a scheduled digest message. */
export function buildDigest(signals: DigestSignal[]): DeliveryMessage {
  const criticals = signals.filter((s) => s.severity === "CRITICAL").length;
  const importants = signals.filter((s) => s.severity === "IMPORTANT").length;

  const subject =
    `${signals.length} market ${signals.length === 1 ? "signal" : "signals"}` +
    (criticals ? ` · ${criticals} critical` : importants ? ` · ${importants} important` : "");

  // Group by category, severity-first within each group, cap 5 shown.
  const byCategory = new Map<string, DigestSignal[]>();
  for (const s of [...signals].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  )) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  const textParts: string[] = ["Your MarketMind digest", subject, ""];
  const htmlGroups: string[] = [];

  for (const [category, group] of byCategory) {
    const shown = group.slice(0, 5);
    textParts.push(cat(category).toUpperCase());
    for (const s of shown) {
      const who = s.competitor?.name ? `${s.competitor.name}: ` : "";
      textParts.push(`  • [${s.severity}] ${who}${s.title}`);
      if (s.whyItMatters) textParts.push(`      ${s.whyItMatters}`);
    }
    if (group.length > shown.length) textParts.push(`  …and ${group.length - shown.length} more`);
    textParts.push("");

    htmlGroups.push(
      `<p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;margin:18px 0 6px">${escapeHtml(cat(category))}</p>` +
        shown
          .map((s) => {
            const who = s.competitor?.name ? `<strong>${escapeHtml(s.competitor.name)}:</strong> ` : "";
            const why = s.whyItMatters
              ? `<br><span style="color:#6b625a">${escapeHtml(s.whyItMatters)}</span>`
              : "";
            const tag = s.isInference ? " · AI inference" : "";
            return `<div style="margin:0 0 10px"><span style="font-size:11px;color:#8a8178">${s.severity}${tag}</span><br>${who}${escapeHtml(s.title)}${why}</div>`;
          })
          .join("") +
        (group.length > shown.length
          ? `<p style="color:#8a8178;font-size:13px;margin:4px 0 0">…and ${group.length - shown.length} more</p>`
          : "")
    );
  }

  const url = `${appUrl()}/dashboard`;
  textParts.push(`Open your dashboard → ${url}`);

  const html = `
<div style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#2b2724;max-width:560px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;margin:0 0 4px">MarketMind AI · digest</p>
  <h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(subject)}</h1>
  ${htmlGroups.join("")}
  <a href="${url}" style="display:inline-block;margin-top:18px;background:#7a3b1e;color:#fff;text-decoration:none;padding:10px 20px;font-size:14px">Open your dashboard</a>
</div>`.trim();

  return { subject: `MarketMind: ${subject}`, text: textParts.join("\n"), html };
}

/** A single urgent signal, rendered for an instant alert. */
export function buildInstantAlert(signal: DigestSignal): DeliveryMessage {
  const who = signal.competitor?.name ? `${signal.competitor.name} — ` : "";
  const subject = `${signal.severity === "CRITICAL" ? "🔴 Critical" : "Important"}: ${who}${signal.title}`;
  const text =
    `${signal.title}\n\n` +
    (signal.whyItMatters ? `Why it matters: ${signal.whyItMatters}\n\n` : "") +
    `Open your dashboard → ${appUrl()}/dashboard`;
  const html = `
<div style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#2b2724;max-width:560px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;margin:0 0 6px">${signal.severity} · ${escapeHtml(cat(signal.category))}</p>
  <h1 style="font-size:19px;margin:0 0 12px">${escapeHtml(who + signal.title)}</h1>
  ${signal.whyItMatters ? `<p style="margin:0 0 18px;color:#6b625a">${escapeHtml(signal.whyItMatters)}</p>` : ""}
  <a href="${appUrl()}/dashboard" style="display:inline-block;background:#7a3b1e;color:#fff;text-decoration:none;padding:10px 20px;font-size:14px">Open your dashboard</a>
</div>`.trim();
  return { subject: `MarketMind: ${subject}`, text, html };
}
