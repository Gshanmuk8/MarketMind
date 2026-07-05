import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CompetitorIndex } from "@/features/competitors/components/competitor-index";

export const metadata: Metadata = { title: "Competitors" };

/** Competitor ledger: suggested landscape to curate, tracked rivals ranked by threat. */
export default function CompetitorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="The landscape"
        title="Competitors"
        description="AI-discovered competitors, ranked by threat and similarity. Track the ones that matter; dismiss the noise."
      />
      <CompetitorIndex />
    </>
  );
}
