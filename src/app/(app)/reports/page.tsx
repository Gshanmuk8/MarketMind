import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReportList } from "@/features/reports/components/report-list";

export const metadata: Metadata = { title: "Reports" };

/** Periodic strategy reports: what happened, what changed, what to do. */
export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="The record"
        title="Reports"
        description="Executive summaries, threats, opportunities, and prioritized actions — grounded in the period's signals."
      />
      <ReportList />
    </>
  );
}
