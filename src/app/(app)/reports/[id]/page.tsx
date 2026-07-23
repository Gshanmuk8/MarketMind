import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/session";
import { getReport, type ReportSections } from "@/features/reports/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Report" };

const TONE_MARK: Record<"threat" | "opportunity" | "neutral", string> = {
  threat: "text-critical",
  opportunity: "text-accent",
  neutral: "text-faint",
};

/** A report section. `tone` colour-codes the numerals (and eyebrow) so a
 *  scanner tells danger from upside without reading a single line. */
function Section({
  label,
  items,
  tone = "neutral",
}: {
  label: string;
  items: string[];
  tone?: "threat" | "opportunity" | "neutral";
}) {
  if (items.length === 0) return null;
  const mark = TONE_MARK[tone];
  return (
    <section className="mt-12">
      <p className={cn("microlabel mb-4", tone !== "neutral" && mark)}>{label}</p>
      <ul className="border-t border-border">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 border-b border-border py-4">
            <span aria-hidden className={cn("font-data text-[11px]", mark)}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-sm leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One report, typeset as a briefing document. All content is AI-reasoned. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const report = await getReport(user.id, id);
  if (!report) notFound();

  const sections = report.content as unknown as ReportSections;
  const period = `${report.periodStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${report.periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <>
      <PageHeader eyebrow={`${report.company.name ?? "Report"} · ${period}`} title={report.title}>
        <Badge variant="inference">AI-reasoned · sources cited</Badge>
      </PageHeader>

      <div className="rise max-w-3xl">
        <p className="microlabel mb-4">Executive summary</p>
        <p className="font-display text-xl leading-relaxed">{report.executiveSummary}</p>

        <Section label="What changed" items={sections.whatChanged ?? []} />
        <Section label="Threats" items={sections.threats ?? []} tone="threat" />
        <Section label="Opportunities" items={sections.opportunities ?? []} tone="opportunity" />

        {(sections.recommendedActions ?? []).length > 0 && (
          <section className="mt-12">
            <p className="microlabel mb-4">Recommended actions — in priority order</p>
            <ol className="border-t border-border">
              {sections.recommendedActions.map((action, i) => (
                <li key={i} className="border-b border-border py-5">
                  <div className="flex items-baseline gap-4">
                    <span aria-hidden className="font-data text-[11px] text-score">
                      P{action.priority}
                    </span>
                    <div>
                      <h3 className="font-sans text-sm font-medium">{action.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{action.rationale}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(sections.citedSignalIds ?? []).length > 0 && (
          <p className="microlabel mt-12">
            Grounded in {sections.citedSignalIds.length} signals from the period
          </p>
        )}
      </div>
    </>
  );
}
