import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DecisionWorkspace } from "@/features/decisions/components/decision-workspace";

export const metadata: Metadata = { title: "Decisions" };

/**
 * Decision Workspace + Decision Memory (docs 14–15): open strategic
 * questions with evidence, and the permanent log of what was decided,
 * why, and how it turned out.
 */
export default function DecisionsPage() {
  return (
    <>
      <PageHeader
        title="Decisions"
        description="Open questions to settle, and the permanent record of what you decided, why, and how the market proved it out."
      />
      <DecisionWorkspace />
    </>
  );
}
