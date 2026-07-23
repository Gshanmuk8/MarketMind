import { env } from "@/lib/env";
import type { Company, Report } from "@prisma/client";
import type { ReportSections } from "@/features/reports/service";
import type { DeliveryMessage } from "@/features/notifications/types";

/**
 * Render a Report into a channel-agnostic message — the Monday Morning Memo.
 * Plaintext is authoritative (every channel renders it); HTML is an
 * email-only enhancement. Kept intentionally lean: the memo is a nudge to
 * open the full report, not a replacement for it.
 */
export function renderReportMessage(report: Report, company: Company): DeliveryMessage {
  const sections = (report.content ?? {}) as Partial<ReportSections>;
  const actions = (sections.recommendedActions ?? []).slice(0, 3);
  const who = company.name ?? company.domain;
  const url = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/reports/${report.id}`;
  const period = `${fmt(report.periodStart)} – ${fmt(report.periodEnd)}`;

  const subject = `${report.title} · ${who}`;

  const textLines = [
    report.title,
    period,
    "",
    report.executiveSummary,
  ];
  if (actions.length) {
    textLines.push("", "What to do next:");
    actions.forEach((a, i) => textLines.push(`  ${i + 1}. ${a.title}`));
  }
  textLines.push("", `Read the full report → ${url}`);
  const text = textLines.join("\n");

  const html = `
<div style="font:15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#2b2724;max-width:560px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;margin:0 0 4px">MarketMind AI · ${escapeHtml(period)}</p>
  <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(report.title)}</h1>
  <p style="margin:0 0 20px">${escapeHtml(report.executiveSummary)}</p>
  ${
    actions.length
      ? `<p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;margin:0 0 8px">What to do next</p>
         <ol style="margin:0 0 24px;padding-left:20px">${actions
           .map(
             (a) =>
               `<li style="margin-bottom:8px"><strong>${escapeHtml(a.title)}</strong>${
                 a.rationale ? `<br><span style="color:#6b625a">${escapeHtml(a.rationale)}</span>` : ""
               }</li>`
           )
           .join("")}</ol>`
      : ""
  }
  <a href="${url}" style="display:inline-block;background:#7a3b1e;color:#fff;text-decoration:none;padding:11px 22px;font-size:14px">Read the full report</a>
</div>`.trim();

  return { subject, text, html };
}

function fmt(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
